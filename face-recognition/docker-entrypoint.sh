#!/bin/sh
set -eu

MODEL_DIR="/app/models/buffalo_l"
MODEL_ZIP="/app/models/buffalo_l.zip"
ZIP_URL="${BUFFALO_L_ZIP_URL:-https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip}"

# Ensure models directory exists
mkdir -p /app/models

# Try to download model if not present
if [ ! -d "$MODEL_DIR" ]; then
    if [ ! -f "$MODEL_ZIP" ]; then
        echo "Attempting to download InsightFace buffalo_l model..."
        if wget --tries=2 --timeout=60 -O "$MODEL_ZIP" "$ZIP_URL" 2>/dev/null; then
            echo "Download successful."
        else
            echo "WARNING: Manual download failed. InsightFace will attempt auto-download on first inference request."
            rm -f "$MODEL_ZIP"
        fi
    fi

    if [ -f "$MODEL_ZIP" ]; then
        echo "Extracting model..."
        python3 - <<'PY' || { echo "WARNING: Model extraction failed. InsightFace will auto-download on first request."; rm -f /app/models/buffalo_l.zip; }
from pathlib import Path
from zipfile import ZipFile

model_dir = Path('/app/models/buffalo_l')
model_zip = Path('/app/models/buffalo_l.zip')

model_dir.parent.mkdir(parents=True, exist_ok=True)
with ZipFile(model_zip) as archive:
    names = [name for name in archive.namelist() if not name.endswith('/')]
    has_nested_model_dir = any(name.startswith('buffalo_l/') for name in names)
    archive.extractall(model_dir.parent if has_nested_model_dir else model_dir)

if not model_dir.exists():
    raise SystemExit(f'Expected model directory was not created: {model_dir}')

required = {'1k3d68.onnx', '2d106det.onnx', 'det_10g.onnx', 'genderage.onnx', 'w600k_r50.onnx'}
missing = sorted(name for name in required if not (model_dir / name).exists())
if missing:
    raise SystemExit(f'InsightFace model is incomplete in {model_dir}; missing: {", ".join(missing)}')
print('Model extracted successfully.')
PY
    fi
fi

if [ -d "$MODEL_DIR" ]; then
    echo "InsightFace model ready at $MODEL_DIR"
else
    echo "Model not pre-downloaded. InsightFace will auto-download on first request."
fi

exec "$@"
