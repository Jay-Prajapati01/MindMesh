FROM python:3.10-slim

# ──────────────────────────────────────────────────────────────
# System dependencies – FFmpeg is required by yt‑dlp and Docling.
# ──────────────────────────────────────────────────────────────
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        ffmpeg \
        curl \
        && rm -rf /var/lib/apt/lists/*

# ──────────────────────────────────────────────────────────────
# Create a non‑root user (HF Spaces recommends it) and set work dir.
# ──────────────────────────────────────────────────────────────
RUN useradd -m appuser && \
    mkdir -p /code && \
    chown -R appuser:appuser /code
WORKDIR /code

# ──────────────────────────────────────────────────────────────
# Install Python dependencies.
#   • requirements.txt is copied FROM the build context root.
#   • --no-cache-dir keeps the image lean.
# ──────────────────────────────────────────────────────────────
# NOTE: The `deploy/hf-spaces` folder is the Docker build context,
# so `requirements.txt` lives right next to this Dockerfile.
COPY requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# ──────────────────────────────────────────────────────────────
# Copy the application code.
# ──────────────────────────────────────────────────────────────
COPY app.py /code/app.py

# ──────────────────────────────────────────────────────────────
# Expose the port Hugging Face Spaces expects for the web service.
# ──────────────────────────────────────────────────────────────
EXPOSE 7860

# ──────────────────────────────────────────────────────────────
# Run the app via Uvicorn – bound to 0.0.0.0 so the HF runner can reach it.
# ──────────────────────────────────────────────────────────────
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "7860"]