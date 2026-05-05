import json
from typing import Any


def ensure_user_exists(cursor, user_id_int: int, now: str) -> None:
    username = f"user_{user_id_int}"
    email = f"user_{user_id_int}@local.invalid"
    cursor.execute(
        """
        INSERT OR IGNORE INTO User (
            user_id, username, password_hash, email, nickname,
            is_member, membership_expire_at, status, storage_used, storage_limit,
            created_at, updated_at
        )
        VALUES (?, ?, ?, ?, '', 0, NULL, 1, 0, 1073741824, ?, ?)
        """,
        (user_id_int, username, "local-only-placeholder", email, now, now),
    )


def insert_image(cursor, image_id: str, user_id: int, original_filename: str, file_size: int, mime_type: str, now: str) -> None:
    cursor.execute(
        """
        INSERT INTO Image (
            image_id, user_id, folder_id, original_filename, stored_filename,
            file_size, mime_type, upload_time, created_at, updated_at
        )
        VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?)
        """,
        (image_id, user_id, original_filename, original_filename, file_size, mime_type, now, now, now),
    )


def load_user_faces(cursor, user_id: int) -> list[tuple[int, list[float]]]:
    cursor.execute("SELECT face_id, embedding FROM faces WHERE user_id = ?", (user_id,))
    return [(int(row[0]), json.loads(row[1])) for row in cursor.fetchall()]


def insert_face(cursor, user_id: int, embedding: list[float], cover_path: str, now: str) -> int:
    cursor.execute(
        """
        INSERT INTO faces (user_id, embedding, cover_path, created_at, last_seen_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (user_id, json.dumps(embedding), cover_path, now, now),
    )
    return int(cursor.lastrowid)


def update_face_last_seen(cursor, face_id: int, now: str) -> None:
    cursor.execute("UPDATE faces SET last_seen_at = ? WHERE face_id = ?", (now, face_id))


def insert_face_appearance(cursor, image_id: str, face_id: int, bbox: dict[str, Any], distance: float | None, now: str) -> None:
    cursor.execute(
        """
        INSERT INTO face_appearances (image_id, face_id, bbox, distance, created_at)
        VALUES (?, ?, ?, ?, ?)
        """,
        (image_id, face_id, json.dumps(bbox), distance, now),
    )


def list_albums(cursor, user_id: int) -> list[dict]:
    cursor.execute(
        """
        SELECT f.face_id, f.cover_path, f.last_seen_at, COUNT(a.face_apperance_id) AS appearance_count
        FROM faces f
        LEFT JOIN face_appearances a ON a.face_id = f.face_id
        WHERE f.user_id = ?
        GROUP BY f.face_id, f.cover_path, f.last_seen_at
        ORDER BY f.last_seen_at DESC
        """,
        (user_id,),
    )
    return [
        {
            "face_id": int(row["face_id"]),
            "cover_path": row["cover_path"],
            "appearance_count": int(row["appearance_count"]),
            "last_seen_at": row["last_seen_at"],
        }
        for row in cursor.fetchall()
    ]


def list_album_images(cursor, user_id: int, face_id: int) -> list[dict]:
    cursor.execute("SELECT face_id FROM faces WHERE face_id = ? AND user_id = ?", (face_id, user_id))
    if not cursor.fetchone():
        return []

    cursor.execute(
        """
        SELECT i.image_id, i.original_filename, i.stored_filename, i.upload_time, a.bbox
        FROM face_appearances a
        JOIN Image i ON i.image_id = a.image_id
        WHERE a.face_id = ? AND i.user_id = ?
        ORDER BY i.upload_time DESC
        """,
        (face_id, user_id),
    )

    return [
        {
            "image_id": row["image_id"],
            "original_name": row["original_filename"],
            "stored_path": row["stored_filename"],
            "created_at": row["upload_time"],
            "bbox": json.loads(row["bbox"]),
        }
        for row in cursor.fetchall()
    ]

