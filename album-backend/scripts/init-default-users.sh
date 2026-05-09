#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$BACKEND_DIR/.." && pwd)"

if [ "${INIT_USE_LOCAL_MAVEN:-}" = "1" ]; then
  cd "$BACKEND_DIR"
  if [ -x "./mvnw" ]; then
    ./mvnw spring-boot:run -Dspring-boot.run.arguments="--app.bootstrap.enabled=true"
  else
    mvn spring-boot:run -Dspring-boot.run.arguments="--app.bootstrap.enabled=true"
  fi
else
  cd "$REPO_DIR"
  env_args=()
  for var_name in \
    INIT_ADMIN_USERNAME \
    INIT_ADMIN_PASSWORD \
    INIT_ADMIN_EMAIL \
    INIT_ADMIN_NICKNAME \
    INIT_USER_USERNAME \
    INIT_USER_PASSWORD \
    INIT_USER_EMAIL \
    INIT_USER_NICKNAME; do
    if [ -n "${!var_name:-}" ]; then
      env_args+=("-e" "$var_name")
    fi
  done

  docker compose run --rm --build "${env_args[@]}" backend --app.bootstrap.enabled=true
fi
