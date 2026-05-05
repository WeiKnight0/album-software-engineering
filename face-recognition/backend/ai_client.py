import requests

from backend.config import AI_SERVICE_URL, REQUEST_TIMEOUT_SECONDS


def infer_faces(payload: bytes, filename: str, content_type: str | None) -> dict:
    mime = content_type or "application/octet-stream"
    try:
        response = requests.post(
            AI_SERVICE_URL,
            files={"image": (filename, payload, mime)},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
    except requests.RequestException as exc:
        raise RuntimeError(f"ai service unavailable: {exc}")

    if response.status_code != 200:
        detail = response.text
        try:
            detail = response.json()
        except ValueError:
            pass
        raise RuntimeError(f"ai service error: status={response.status_code} response={detail}")

    try:
        return response.json()
    except ValueError as exc:
        raise RuntimeError(f"ai service returned non-json response: {exc}")

