"""Private CPU worker. Redis supplies authoritative ownership; no public job API.

Run one job in a child process with a hard deadline shorter than the Redis
lease. A killed process leaves the lease for existing reconciliation/retries.
"""
import asyncio
import multiprocessing
import time

from app.core.config import get_settings
from app.core.logging import configure_logging, get_logger


def execute(job_id: str):
    from app.services.job_runner import run
    asyncio.run(run(job_id))


def main():
    cfg = get_settings()
    if cfg.mindmesh_execution_mode != "cloud" or not cfg.worker_process:
        raise RuntimeError("Worker requires cloud mode and WORKER_PROCESS=true")
    configure_logging()
    logger = get_logger(__name__)
    from app.services import jobs
    context = multiprocessing.get_context("spawn")
    reconciled = 0.0
    while True:
        try:
            if time.monotonic() - reconciled >= 60:
                jobs.reconcile()
                reconciled = time.monotonic()
            due = jobs.client().zrangebyscore(jobs.QUEUE, 0, time.time(), start=0, num=1)
            if not due:
                time.sleep(10)
                continue
            process = context.Process(target=execute, args=(due[0],))
            process.start()
            process.join(timeout=3600)
            if process.is_alive():
                process.kill()
                process.join()
            process.close()
        except Exception:
            logger.warning("Worker iteration deferred")
            time.sleep(10)


if __name__ == "__main__":
    main()
