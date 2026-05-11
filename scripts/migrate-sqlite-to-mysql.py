#!/usr/bin/env python3
"""Migrate album data from SQLite into an already-created MySQL schema.

Run the backend once against MySQL first so Hibernate creates the target tables,
then run this script while the application is stopped.
"""

import argparse
import sqlite3
from typing import Iterable

try:
    import pymysql
except ImportError as exc:
    raise SystemExit("Missing dependency: pip install pymysql") from exc


PREFERRED_TABLE_ORDER = [
    "User",
    "role",
    "permission",
    "user_role",
    "user_permission",
    "folder",
    "image",
    "image_analysis",
    "face",
    "face_appearances",
    "upload_task",
    "upload_file",
    "download_task",
    "download_file",
    "payment_order",
    "admin_audit_log",
    "rag_performance_log",
    "ai_chat_session",
    "ai_chat_message",
]

SKIP_TABLES = {"refresh_token"}


def quote(identifier: str) -> str:
    return "`" + identifier.replace("`", "``") + "`"


def sqlite_tables(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "select name from sqlite_master where type = 'table' and name not like 'sqlite_%'"
    ).fetchall()
    names = [row[0] for row in rows if row[0] not in SKIP_TABLES]
    ordered = [name for name in PREFERRED_TABLE_ORDER if name in names]
    ordered.extend(sorted(name for name in names if name not in ordered))
    return ordered


def sqlite_columns(conn: sqlite3.Connection, table: str) -> list[str]:
    return [row[1] for row in conn.execute(f"pragma table_info({quote(table)})").fetchall()]


def mysql_columns(conn, database: str, table: str) -> list[str]:
    with conn.cursor() as cursor:
        cursor.execute(
            """
            select column_name
            from information_schema.columns
            where table_schema = %s and table_name = %s
            order by ordinal_position
            """,
            (database, table),
        )
        return [row[0] for row in cursor.fetchall()]


def batched(items: list[tuple], size: int) -> Iterable[list[tuple]]:
    for index in range(0, len(items), size):
        yield items[index:index + size]


def migrate_table(sqlite_conn, mysql_conn, database: str, table: str, batch_size: int) -> int:
    source_columns = sqlite_columns(sqlite_conn, table)
    target_columns = mysql_columns(mysql_conn, database, table)
    columns = [column for column in source_columns if column in target_columns]
    if not columns:
        print(f"skip {table}: no matching target table/columns")
        return 0

    select_sql = f"select {', '.join(quote(column) for column in columns)} from {quote(table)}"
    rows = sqlite_conn.execute(select_sql).fetchall()
    if not rows:
        print(f"skip {table}: empty")
        return 0

    insert_sql = (
        f"insert into {quote(table)} ({', '.join(quote(column) for column in columns)}) "
        f"values ({', '.join(['%s'] * len(columns))})"
    )
    with mysql_conn.cursor() as cursor:
        for chunk in batched(rows, batch_size):
            cursor.executemany(insert_sql, chunk)
    print(f"migrated {table}: {len(rows)} rows")
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate SQLite data into MySQL")
    parser.add_argument("--sqlite", required=True, help="Path to photo.db")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=3306)
    parser.add_argument("--database", default="album")
    parser.add_argument("--user", default="album")
    parser.add_argument("--password", required=True)
    parser.add_argument("--truncate", action="store_true", help="Delete target table data before import")
    parser.add_argument("--batch-size", type=int, default=500)
    args = parser.parse_args()

    sqlite_conn = sqlite3.connect(args.sqlite)
    mysql_conn = pymysql.connect(
        host=args.host,
        port=args.port,
        user=args.user,
        password=args.password,
        database=args.database,
        charset="utf8mb4",
        autocommit=False,
    )
    try:
        tables = sqlite_tables(sqlite_conn)
        with mysql_conn.cursor() as cursor:
            cursor.execute("set foreign_key_checks = 0")
            if args.truncate:
                for table in reversed(tables):
                    if mysql_columns(mysql_conn, args.database, table):
                        cursor.execute(f"truncate table {quote(table)}")

        total = 0
        for table in tables:
            total += migrate_table(sqlite_conn, mysql_conn, args.database, table, args.batch_size)

        with mysql_conn.cursor() as cursor:
            cursor.execute("set foreign_key_checks = 1")
        mysql_conn.commit()
        print(f"done: {total} rows migrated")
    except Exception:
        mysql_conn.rollback()
        raise
    finally:
        sqlite_conn.close()
        mysql_conn.close()


if __name__ == "__main__":
    main()
