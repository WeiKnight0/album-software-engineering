FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    INSIGHTFACE_HOME=/app/models \
    BUFFALO_L_ZIP_URL=https://github.com/deepinsight/insightface/releases/download/v0.7/buffalo_l.zip \
    PIP_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple \
    UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

WORKDIR /app

RUN sed -i \
        -e 's|http://deb.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' \
        -e 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' \
        /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
        build-essential \
        cmake \
        libgl1 \
        libglib2.0-0 \
        libgomp1 \
        wget \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock* README.md ./
RUN uv pip install --system .

COPY . .
RUN if [ ! -f /app/buffalo_l.zip ]; then wget -O /app/buffalo_l.zip "$BUFFALO_L_ZIP_URL"; fi \
    && python - <<'PY'
from pathlib import Path
from zipfile import ZipFile

model_dir = Path('/app/models/buffalo_l')
model_zip = Path('/app/buffalo_l.zip')

if not model_zip.exists():
    raise SystemExit(f'Model archive not found: {model_zip}')

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
PY
RUN chmod +x docker-entrypoint.sh

EXPOSE 8001
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
