import numpy as np


def parse_user_id(user_id_raw: str) -> int:
    try:
        return int(user_id_raw.strip())
    except (TypeError, ValueError):
        raise ValueError("user_id must be an integer")


def cosine_distance(vec1: list[float], vec2: list[float]) -> float:
    a = np.array(vec1)
    b = np.array(vec2)
    return float(1 - np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def clamp_crop(img, bbox: dict):
    x, y, w, h = int(bbox["x"]), int(bbox["y"]), int(bbox["w"]), int(bbox["h"])
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(img.shape[1], x1 + max(1, w))
    y2 = min(img.shape[0], y1 + max(1, h))
    return img[y1:y2, x1:x2]

