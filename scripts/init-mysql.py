#!/usr/bin/env python3
import os
import sys

import bcrypt
import pymysql


REQUIRED_ENV = [
    "MYSQL_DATABASE",
    "MYSQL_USER",
    "MYSQL_PASSWORD",
    "INIT_ADMIN_USERNAME",
    "INIT_ADMIN_PASSWORD",
    "INIT_ADMIN_EMAIL",
    "INIT_ADMIN_NICKNAME",
    "INIT_USER_USERNAME",
    "INIT_USER_PASSWORD",
    "INIT_USER_EMAIL",
    "INIT_USER_NICKNAME",
]


PERMISSIONS = [
    ("user:view", "permission.user.view", "user"),
    ("user:create", "permission.user.create", "user"),
    ("user:update", "permission.user.update", "user"),
    ("role:view", "permission.role.view", "role"),
    ("role:assign", "permission.role.assign", "role"),
    ("log:view", "permission.log.view", "log"),
    ("log:export", "permission.log.export", "log"),
    ("task:view", "permission.task.view", "task"),
    ("task:export", "permission.task.export", "task"),
]


def env(name: str) -> str:
    value = os.getenv(name)
    if value is None or not value.strip():
        raise SystemExit(f"Missing required environment variable: {name}")
    return value.strip()


def password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12)).decode()


def user_exists(cursor, username: str) -> bool:
    cursor.execute("select 1 from `user` where username = %s limit 1", (username,))
    return cursor.fetchone() is not None


def ensure_user(cursor, username: str, password: str, email: str, nickname: str, is_super_admin: bool) -> None:
    if user_exists(cursor, username):
        print(f"user exists, password unchanged: {username}")
        return
    cursor.execute(
        """
        insert into `user` (
          username, password_hash, email, nickname, avatar_filename, is_member,
          membership_expire_at, status, is_super_admin, storage_used, storage_limit,
          created_at, updated_at
        ) values (%s, %s, %s, %s, null, 0, null, 1, %s, 0, 1073741824, now(), now())
        """,
        (username, password_hash(password), email, nickname, 1 if is_super_admin else 0),
    )
    print(f"created user: {username}")


def ensure_role(cursor, code: str, name: str, description: str) -> None:
    cursor.execute(
        """
        insert into role (code, name, description, status, created_at)
        values (%s, %s, %s, 1, now())
        on duplicate key update name = values(name), description = values(description), status = values(status)
        """,
        (code, name, description),
    )


def ensure_permission(cursor, code: str, name: str, module: str) -> None:
    cursor.execute(
        """
        insert into permission (code, name, module, description)
        values (%s, %s, %s, null)
        on duplicate key update name = values(name), module = values(module), description = values(description)
        """,
        (code, name, module),
    )


def assign_role(cursor, username: str, role_code: str) -> None:
    cursor.execute(
        """
        insert ignore into user_role (user_id, role_id)
        select u.user_id, r.role_id
        from `user` u
        join role r on r.code = %s
        where u.username = %s
        """,
        (role_code, username),
    )


def assign_default_admin_permissions(cursor) -> None:
    cursor.execute(
        """
        insert ignore into user_permission (user_id, permission_id, created_at)
        select ur.user_id, p.permission_id, now()
        from user_role ur
        join role admin_role on admin_role.role_id = ur.role_id and admin_role.code = 'ADMIN'
        join permission p on p.code in (
          'user:view', 'user:create', 'user:update', 'role:view',
          'log:view', 'log:export', 'task:view', 'task:export'
        )
        where not exists (
          select 1
          from user_role super_ur
          join role super_role on super_role.role_id = super_ur.role_id and super_role.code = 'SUPER_ADMIN'
          where super_ur.user_id = ur.user_id
        )
        """
    )


def main() -> int:
    for name in REQUIRED_ENV:
        env(name)

    conn = pymysql.connect(
        host=os.getenv("MYSQL_HOST", "mysql"),
        port=int(os.getenv("MYSQL_PORT", "3306")),
        user=env("MYSQL_USER"),
        password=env("MYSQL_PASSWORD"),
        database=env("MYSQL_DATABASE"),
        charset="utf8mb4",
        autocommit=False,
    )
    try:
        with conn.cursor() as cursor:
            ensure_role(cursor, "SUPER_ADMIN", "超级管理员", "系统最高权限角色")
            ensure_role(cursor, "ADMIN", "管理员", "后台管理角色")
            ensure_role(cursor, "USER", "普通用户", "普通相册用户")
            for code, name, module in PERMISSIONS:
                ensure_permission(cursor, code, name, module)

            ensure_user(
                cursor,
                env("INIT_ADMIN_USERNAME"),
                env("INIT_ADMIN_PASSWORD"),
                env("INIT_ADMIN_EMAIL"),
                env("INIT_ADMIN_NICKNAME"),
                True,
            )
            ensure_user(
                cursor,
                env("INIT_USER_USERNAME"),
                env("INIT_USER_PASSWORD"),
                env("INIT_USER_EMAIL"),
                env("INIT_USER_NICKNAME"),
                False,
            )
            assign_role(cursor, env("INIT_ADMIN_USERNAME"), "SUPER_ADMIN")
            assign_role(cursor, env("INIT_USER_USERNAME"), "USER")
            assign_default_admin_permissions(cursor)
        conn.commit()
        print("MySQL bootstrap complete.")
        return 0
    except Exception as exc:
        conn.rollback()
        print(f"MySQL bootstrap failed: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()


if __name__ == "__main__":
    raise SystemExit(main())
