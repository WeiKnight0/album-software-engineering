#!/bin/sh
set -eu

MODEL_DIR="/app/models/buffalo_l"

if [ ! -d "$MODEL_DIR" ]; then
    echo "ERROR: InsightFace model directory not found: $MODEL_DIR" >&2
    exit 1
fi

exec "$@"
