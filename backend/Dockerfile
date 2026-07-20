# Backend image — runs on Hugging Face Spaces (Docker), Render, Fly, or anywhere.
FROM python:3.11-slim

WORKDIR /app

# Writable cache/data locations. On managed hosts only /tmp is reliably writable,
# so point model caches and uploaded-file storage there. UPLOAD_DIR / INDEX_DIR
# override the Settings fields of the same name.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/tmp/hf \
    FASTEMBED_CACHE_PATH=/tmp/fastembed \
    UPLOAD_DIR=/tmp/medicite/uploads \
    INDEX_DIR=/tmp/medicite/index

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY scripts ./scripts

# Hugging Face Spaces expects the app on 7860; Render/Fly inject $PORT.
EXPOSE 7860
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
