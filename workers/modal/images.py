"""Small API/control image, CPU parsing images, and separate GPU dependencies."""
from pathlib import Path
import modal

ROOT = Path(__file__).resolve().parents[2]


def source(image):
    if not modal.is_local():
        return image
    return image.add_local_dir(ROOT / "backend" / "app", "/root/app", copy=True,
                               ignore=["**/__pycache__/**", "**/*.pyc"])


def requirements(relative):
    # Modal imports this package in containers too; manifests are build-host inputs.
    if not modal.is_local():
        return []
    return [line.strip() for line in (ROOT / relative).read_text().splitlines()
            if line.strip() and not line.lstrip().startswith("#")]


if modal.is_local():
    base = (modal.Image.debian_slim(python_version="3.11")
            .pip_install(*requirements("backend/requirements-api.txt"))
            .env({"MINDMESH_EXECUTION_MODE": "modal", "ENVIRONMENT": "production",
                  "EMBEDDING_MODEL": "bge-m3", "EMBEDDING_DIM": "1024",
                  "QDRANT_COLLECTION": "mindmesh_bge_m3_v1", "HF_HOME": "/models/huggingface",
                  "TOKENIZERS_PARALLELISM": "false"}))
    control = source(base)
    documents = source(base.apt_install("tesseract-ocr", "libgl1", "libglib2.0-0", "libgomp1")
        .pip_install("torch==2.6.0", index_url="https://download.pytorch.org/whl/cpu")
        .pip_install(*requirements("workers/modal/requirements-documents.txt"))
        .run_commands("docling-tools models download --output-dir /opt/docling-models")
        .env({"DOCLING_ARTIFACTS_PATH": "/opt/docling-models"}))
    ingestion = source(base.apt_install("ffmpeg", "tesseract-ocr", "libgl1", "libglib2.0-0")
        .pip_install(*requirements("workers/modal/requirements-ingestion.txt"))
        .run_commands("playwright install --with-deps chromium"))
    ai = source(base.pip_install("torch==2.6.0", "transformers>=4.51,<5", "accelerate>=1,<2",
                                "sentence-transformers>=3.4,<6", "sentencepiece>=0.2,<1"))
    speech = source(modal.Image.from_registry("nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04", add_python="3.11")
        .pip_install(*requirements("backend/requirements-api.txt"))
        .pip_install("faster-whisper==1.1.0")
        .apt_install("ffmpeg")
        .env({"MINDMESH_EXECUTION_MODE": "modal", "ENVIRONMENT": "production",
              "EMBEDDING_MODEL": "bge-m3", "EMBEDDING_DIM": "1024",
              "QDRANT_COLLECTION": "mindmesh_bge_m3_v1", "HF_HOME": "/models/huggingface"}))
else:
    # Deployment-only image construction must not read workstation paths remotely.
    control = documents = ingestion = ai = speech = modal.Image.debian_slim()
