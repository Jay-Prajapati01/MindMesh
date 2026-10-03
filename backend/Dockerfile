FROM python:3.11-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        tesseract-ocr \
        libgl1 \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright and system dependencies for Crawl4AI
RUN playwright install chromium \
    && playwright install-deps chromium

# Run Crawl4AI setup (fail loudly if it fails)
RUN crawl4ai-setup

# Create non-root user for security
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid 1001 --shell /bin/bash --create-home appuser

COPY . .

# Ensure data dir is writable by appuser
RUN mkdir -p /app/data && chown -R appuser:appgroup /app/data

EXPOSE 8000

# Run as non-root user
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
