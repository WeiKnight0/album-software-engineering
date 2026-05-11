FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/src \
    PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple \
    UV_INDEX_URL=https://mirrors.aliyun.com/pypi/simple \
    HF_ENDPOINT=https://hf-mirror.com

WORKDIR /app

RUN sed -i \
    -e 's|http://deb.debian.org/debian-security|https://mirrors.tuna.tsinghua.edu.cn/debian-security|g' \
    -e 's|http://deb.debian.org/debian|https://mirrors.tuna.tsinghua.edu.cn/debian|g' \
    /etc/apt/sources.list.d/debian.sources \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    libgomp1 \
    wget \
    curl \
    aria2 \
    jq \
    && rm -rf /var/lib/apt/lists/*

# Download embedding model early to fail fast
RUN wget -q https://hf-mirror.com/hfd/hfd.sh -O /tmp/hfd.sh \
    && chmod +x /tmp/hfd.sh \
    && /tmp/hfd.sh BAAI/bge-small-zh-v1.5 --local-dir /app/models/bge-small-zh-v1.5 \
    && rm /tmp/hfd.sh \
    && test -f /app/models/bge-small-zh-v1.5/config.json || (echo "ERROR: Model download failed" && exit 1)

RUN pip install --no-cache-dir uv

COPY pyproject.toml README.md ./
COPY src ./src

# Install project dependencies using the configured uv index
RUN uv pip install --system --index-url "$UV_INDEX_URL" .

# Cleanup build tools to reduce image size
RUN apt-get purge -y wget curl aria2 \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

EXPOSE 8003
CMD ["uvicorn", "rag.main:app", "--host", "0.0.0.0", "--port", "8003"]
