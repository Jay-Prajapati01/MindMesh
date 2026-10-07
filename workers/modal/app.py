"""Deploy from project root: python -m modal deploy --env main -m workers.modal.app."""
import os
import modal
from workers.modal import images

app = modal.App("mindmesh-workers")
secret = modal.Secret.from_name("mindmesh-production")
weights = modal.Volume.from_name("mindmesh-model-weights", create_if_missing=True)
gpu_options = dict(secrets=[secret], volumes={"/models": weights},
                   min_containers=0, max_containers=2, scaledown_window=60, timeout=1800)


@app.cls(image=images.ai, gpu="A10G", memory=24576, **gpu_options)
class Qwen:
    @modal.enter()
    def load(self):
        import torch
        from transformers import AutoTokenizer, AutoModelForCausalLM
        name = os.environ.get("QWEN_MODEL", "Qwen/Qwen3-8B")
        self.tokenizer = AutoTokenizer.from_pretrained(name)
        self.model = AutoModelForCausalLM.from_pretrained(name, torch_dtype=torch.bfloat16, device_map="auto")
        self.model.eval()
        weights.commit()

    @modal.method()
    def generate(self, envelope: dict, prompt: str, system: str | None = None) -> str:
        import torch
        from app.services.job_runner import authorize
        authorize(envelope)
        messages = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": prompt}]
        text = self.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True, enable_thinking=False)
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=12000).to(self.model.device)
        with torch.inference_mode():
            output = self.model.generate(**inputs, max_new_tokens=2048, do_sample=False)
        return self.tokenizer.decode(output[0][inputs.input_ids.shape[1]:], skip_special_tokens=True)


@app.cls(image=images.ai, gpu="T4", memory=8192, **gpu_options)
class Embeddings:
    @modal.enter()
    def load(self):
        from sentence_transformers import SentenceTransformer
        self.model = SentenceTransformer("BAAI/bge-m3", device="cuda")
        self.model.max_seq_length = 8192
        weights.commit()

    @modal.method()
    def embed(self, envelope: dict, texts: list[str]) -> list[list[float]]:
        from app.services.job_runner import authorize
        authorize(envelope)
        if not texts or len(texts) > 32 or any(len(t) > 40000 for t in texts):
            raise ValueError("Embedding batch exceeds limits")
        return self.model.encode(texts, batch_size=8, normalize_embeddings=True).tolist()


@app.cls(image=images.speech, gpu="T4", memory=8192, **gpu_options)
class Whisper:
    @modal.enter()
    def load(self):
        from faster_whisper import WhisperModel
        self.model = WhisperModel(os.environ.get("WHISPER_MODEL", "large-v3-turbo"),
            device="cuda", compute_type="float16", download_root="/models/whisper")
        weights.commit()

    @modal.method()
    def transcribe(self, envelope: dict, object_path: str) -> list[dict]:
        from pathlib import Path
        from tempfile import TemporaryDirectory
        from app.services.job_runner import authorize
        from app.core.tenant import current_scope
        from app.services import cloud_storage
        owner = authorize(envelope)
        if not object_path.startswith(f"scratch/{owner.job_id}/"):
            raise PermissionError("Audio does not belong to this job")
        token = current_scope.set(owner)
        try:
            with TemporaryDirectory() as folder:
                path = Path(folder) / ("audio" + Path(object_path).suffix)
                path.write_bytes(cloud_storage.get(object_path))
                segments, _ = self.model.transcribe(str(path), vad_filter=True)
                return [{"text": s.text, "start": s.start, "end": s.end} for s in segments]
        finally:
            current_scope.reset(token)


@app.function(image=images.documents, secrets=[secret], cpu=4, memory=8192,
              timeout=3600, max_containers=4, min_containers=0,
              volumes={"/models": weights})
async def document_job(job_id: str):
    from app.services.job_runner import run
    await run(job_id)


@app.function(image=images.ingestion, secrets=[secret], cpu=2, memory=4096,
              timeout=3600, max_containers=4, min_containers=0)
async def ingestion_job(job_id: str):
    from app.services.job_runner import run
    await run(job_id)


@app.function(image=images.control, secrets=[secret], cpu=1, memory=1024,
              timeout=3600, max_containers=8, min_containers=0)
async def query_job(job_id: str):
    from app.services.job_runner import run
    await run(job_id)


@app.function(image=images.control, secrets=[secret], schedule=modal.Period(seconds=30),
              timeout=60, max_containers=1)
async def dispatch():
    """Redis remains authoritative; a lost spawn is redispatched after 60 seconds."""
    import asyncio
    import time
    from app.services import jobs
    r = jobs.client()
    # Self-heal queue drift first: orphaned/terminal entries pruned, stale
    # processing leases requeued, DLQ depth reported (audit P0-8).
    try:
        stats = await asyncio.to_thread(jobs.reconcile)
        if any(stats.get(k) for k in ("orphans_pruned", "terminal_pruned", "requeued")):
            import logging
            logging.getLogger(__name__).info("queue_reconciled %s", stats)
    except Exception:
        import logging
        logging.getLogger(__name__).warning("Queue reconciliation deferred")
    ids = await asyncio.to_thread(r.zrangebyscore, jobs.QUEUE, 0, time.time(), start=0, num=32)
    for job_id in ids:
        try:
            job = await asyncio.to_thread(jobs.raw, job_id)
            if job["status"] in jobs.TERMINAL:
                await asyncio.to_thread(r.zrem, jobs.QUEUE, job_id)
                continue
            worker = document_job if job["job_type"] in {"pdf", "documents"} else (
                query_job if job["job_type"] in {"chat", "search", "compare"} else ingestion_job)
            # Delay redispatch before spawning, so worker claim can safely replace it with its lease.
            await asyncio.to_thread(r.zadd, jobs.QUEUE, {job_id: time.time() + 60})
            await worker.spawn.aio(job_id)
        except KeyError:
            await asyncio.to_thread(r.zrem, jobs.QUEUE, job_id)
        except Exception:
            # Never log exception strings containing Redis/Modal credentials.
            import logging
            logging.getLogger(__name__).warning("Job dispatch deferred")


@app.function(image=images.control, secrets=[secret], schedule=modal.Period(hours=24),
              timeout=300, max_containers=1)
def cleanup_staging():
    from app.services.storage_maintenance import maintenance
    return maintenance()
