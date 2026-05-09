# ai_service.py - pure inference service (no DB access)
import logging

import cv2
import numpy as np
import uvicorn
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from insightface.app import FaceAnalysis

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Face Inference Service", version="2.0.0")

# Hybrid gate: relative threshold across resolutions + tiny absolute floor.
MIN_FACE_ABS_PX = 16
MIN_FACE_EDGE_RATIO = 0.10


def make_bbox(face) -> dict:
    x1, y1, x2, y2 = face.bbox
    return {
        "x": int(x1),
        "y": int(y1),
        "w": int(x2 - x1),
        "h": int(y2 - y1),
    }


def face_area(bbox: dict) -> int:
    return max(1, int(bbox["w"])) * max(1, int(bbox["h"]))


# Lazy initialization: model is downloaded by entrypoint.sh before first request.
_face_app = None


def get_face_app():
    global _face_app
    if _face_app is None:
        _face_app = FaceAnalysis(name="buffalo_l", root="./")
        try:
            _face_app.prepare(ctx_id=0, det_size=(640, 640))
            logger.info("InsightFace prepared with GPU ctx_id=0")
        except Exception:
            _face_app.prepare(ctx_id=-1, det_size=(640, 640))
            logger.info("InsightFace prepared with CPU ctx_id=-1")
    return _face_app


@app.post("/api/v1/infer")
async def infer_faces(
    image: UploadFile = File(...),
    user_id: str = Form(""),
    image_id: str = Form(""),
):
    payload = await image.read()
    if not payload:
        raise HTTPException(status_code=400, detail="image file is empty")

    np_arr = np.frombuffer(payload, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise HTTPException(status_code=400, detail="invalid image format")

    detected_faces = get_face_app().get(img)
    if not detected_faces:
        return {
            "status": "success",
            "code": 200,
            "message": "no face detected",
            "count": 0,
            "results": [],
        }

    img_h, img_w = img.shape[:2]
    valid_faces = []
    # Track largest rejected face for diagnostics when all faces are too small.
    rejected_faces = []

    for face in detected_faces:
        bbox = make_bbox(face)
        face_w = max(1, int(bbox["w"]))
        face_h = max(1, int(bbox["h"]))
        edge_ratio = min(face_w / max(1, img_w), face_h / max(1, img_h))

        if face_w < MIN_FACE_ABS_PX or face_h < MIN_FACE_ABS_PX or edge_ratio < MIN_FACE_EDGE_RATIO:
            rejected_faces.append((bbox, face_w, face_h, edge_ratio))
            continue

        valid_faces.append((face, bbox))

    if not valid_faces:
        bbox, face_w, face_h, edge_ratio = max(rejected_faces, key=lambda item: face_area(item[0]))
        return {
            "status": "success",
            "code": 200,
            "message": "face too small",
            "count": 0,
            "results": [],
            "policy": "multi_face_relative_size_gate",
            "reject_reason": "face_too_small",
            "size_check": {
                "face_w": face_w,
                "face_h": face_h,
                "image_w": int(img_w),
                "image_h": int(img_h),
                "edge_ratio": round(edge_ratio, 4),
                "min_edge_ratio": MIN_FACE_EDGE_RATIO,
                "min_abs_px": MIN_FACE_ABS_PX,
            },
        }

    results = []
    for face, bbox in valid_faces:
        results.append(
            {
                "bbox": bbox,
                "embedding": face.embedding.tolist(),
            }
        )

    return {
        "status": "success",
        "code": 200,
        "message": "processed",
        "count": len(results),
        "results": results,
    }


@app.get("/api/v1/health")
def health() -> dict:
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8001)

