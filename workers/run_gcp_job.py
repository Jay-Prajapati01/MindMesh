"""Cloud Run Job entrypoint shim: run exactly one GCP job, then exit.

Usage (worker image, which carries the full ingestion stack):
    MINDMESH_JOB_ID=<uuid> python workers/run_gcp_job.py

In deployed Cloud Run Jobs prefer the module entrypoint instead:
    python -m app.gcp_worker
"""
from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "backend"))

from app.gcp_worker import main

if __name__ == "__main__":
    raise SystemExit(main())
