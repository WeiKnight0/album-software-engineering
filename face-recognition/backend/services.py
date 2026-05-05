from datetime import datetime, timezone
import mimetypes
import os
import uuid

import cv2
import numpy as np

from backend.config import COVERS_DIR, THRESHOLD
from backend.db import open_db
from backend.repositories import (
    ensure_user_exists,
    insert_face,
    insert_face_appearance,
    insert_image,
    load_user_faces,
    update_face_last_seen,
)
from backend.utils import clamp_crop, cosine_distance

os.makedirs(COVERS_DIR, exist_ok=True)


def persist_recognition(user_id: int, filename: str, content_type: str | None, payload: bytes, infer_payload: dict) -> dict:
    np_arr = np.frombuffer(payload, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("invalid image format")

    now = datetime.now(timezone.utc).isoformat()
    image_id = str(uuid.uuid4())
    mime_type = content_type or mimetypes.guess_type(filename or "")[0] or "image/jpeg"

    conn = open_db()
    c = conn.cursor()

    ensure_user_exists(c, user_id, now)
    insert_image(c, image_id, user_id, filename, len(payload), mime_type, now)

    message = infer_payload.get("message", "processed")
    faces = infer_payload.get("results", [])
    if not faces:
        conn.commit()
        conn.close()
        response = {
            "status": "success",
            "code": 200,
            "message": message,
            "image_id": image_id,
            "user_id": user_id,
            "count": 0,
            "results": [],
        }
        if "policy" in infer_payload:
            policy = infer_payload.get("policy")
            reject_reason = infer_payload.get("reject_reason")
            size_check = infer_payload.get("size_check")
            if policy is not None:
                response["policy"] = policy
            if reject_reason is not None:
                response["reject_reason"] = reject_reason
            if size_check is not None:
                response["size_check"] = size_check
        return response

    existing_faces = load_user_faces(c, user_id)
    results = []

    for face in faces:
        bbox = face.get("bbox") or {}
        embedding = face.get("embedding")
        if not isinstance(embedding, list):
            continue

        min_distance = float("inf")
        matched_face_id = None
        for existing_face_id, hist_embedding in existing_faces:
            dist = cosine_distance(embedding, hist_embedding)
            if dist < min_distance:
                min_distance = dist
                if dist < THRESHOLD:
                    matched_face_id = existing_face_id

        if matched_face_id is None:
            crop = clamp_crop(img, bbox)
            cover_name = f"user_{user_id}_face_{uuid.uuid4().hex}.jpg"
            cover_path = os.path.join(COVERS_DIR, cover_name)
            if crop.size > 0:
                cv2.imwrite(cover_path, crop)
            else:
                cover_path = ""

            face_id = insert_face(c, user_id, embedding, cover_path, now)
            existing_faces.append((face_id, embedding))
            distance = None
        else:
            face_id = matched_face_id
            distance = min_distance
            update_face_last_seen(c, face_id, now)

        insert_face_appearance(c, image_id, face_id, bbox, distance, now)
        results.append({"face_id": face_id, "distance": distance, "bbox": bbox})

    conn.commit()
    conn.close()

    return {
        "status": "success",
        "code": 200,
        "message": "processed",
        "image_id": image_id,
        "user_id": user_id,
        "count": len(results),
        "results": results,
    }


