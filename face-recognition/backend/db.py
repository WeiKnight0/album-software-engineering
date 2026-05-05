import os
import shutil
import sqlite3

from backend.config import COVERS_DIR, DB_PATH


def open_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def reset_runtime_state() -> None:
    if os.path.isfile(DB_PATH):
        os.remove(DB_PATH)
    if os.path.isdir(COVERS_DIR):
        shutil.rmtree(COVERS_DIR)
    os.makedirs(COVERS_DIR, exist_ok=True)


def init_db() -> None:
    conn = open_db()
    c = conn.cursor()

    c.execute(
        """
        CREATE TABLE IF NOT EXISTS User (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            nickname TEXT DEFAULT '',
            is_member INTEGER DEFAULT 0,
            membership_expire_at TEXT DEFAULT NULL,
            status INTEGER DEFAULT 1,
            storage_used INTEGER DEFAULT 0,
            storage_limit INTEGER DEFAULT 1073741824,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS Folder (
            folder_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            parent_id INTEGER DEFAULT NULL,
            name TEXT NOT NULL,
            cover_image_id TEXT DEFAULT NULL,
            is_in_recycle_bin INTEGER NOT NULL DEFAULT 0,
            moved_to_bin_at TEXT DEFAULT NULL,
            original_parent_id INTEGER DEFAULT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES Folder(folder_id) ON DELETE CASCADE,
            FOREIGN KEY (original_parent_id) REFERENCES Folder(folder_id) ON DELETE SET NULL,
            UNIQUE (user_id, parent_id, name)
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS Image (
            image_id TEXT NOT NULL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            folder_id INTEGER DEFAULT NULL,
            original_filename TEXT NOT NULL,
            stored_filename TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            mime_type TEXT DEFAULT 'image/jpeg',
            upload_time TEXT NOT NULL DEFAULT (datetime('now')),
            is_in_recycle_bin INTEGER NOT NULL DEFAULT 0 CHECK (is_in_recycle_bin IN (0, 1)),
            moved_to_bin_at TEXT DEFAULT NULL,
            original_folder_id INTEGER DEFAULT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            FOREIGN KEY (user_id) REFERENCES User(user_id) ON DELETE CASCADE,
            FOREIGN KEY (folder_id) REFERENCES Folder(folder_id) ON DELETE SET NULL,
            FOREIGN KEY (original_folder_id) REFERENCES Folder(folder_id) ON DELETE SET NULL
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS faces (
            face_id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            embedding TEXT NOT NULL,
            cover_path TEXT,
            created_at TEXT NOT NULL,
            last_seen_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES User(user_id) ON DELETE CASCADE
        )
        """
    )
    c.execute(
        """
        CREATE TABLE IF NOT EXISTS face_appearances (
            face_apperance_id INTEGER PRIMARY KEY AUTOINCREMENT,
            image_id TEXT NOT NULL,
            face_id INTEGER NOT NULL,
            bbox TEXT NOT NULL,
            distance REAL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(image_id) REFERENCES Image(image_id) ON DELETE CASCADE,
            FOREIGN KEY(face_id) REFERENCES faces(face_id) ON DELETE CASCADE
        )
        """
    )

    c.execute("CREATE INDEX IF NOT EXISTS idx_faces_user ON faces(user_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_faces_user_last_seen ON faces(user_id, last_seen_at)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_face_appearances_face ON face_appearances(face_id)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_face_appearances_image ON face_appearances(image_id)")

    conn.commit()
    conn.close()

