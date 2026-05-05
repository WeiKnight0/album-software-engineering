import os

API_PREFIX = "/api/v1"
DB_PATH = os.getenv("BACKEND_DB_PATH", "face_platform.db")
COVERS_DIR = os.getenv("BACKEND_COVERS_DIR", "covers")
AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8001/api/v1/infer")
THRESHOLD = float(os.getenv("FACE_MATCH_THRESHOLD", "0.5"))
REQUEST_TIMEOUT_SECONDS = int(os.getenv("AI_TIMEOUT_SECONDS", "120"))

