# Cloud operations

Monitor API health, Caddy logs, worker logs, Postgres queue depth, failed jobs, Qdrant errors, Supabase availability, and host disk/memory. The worker reconciles expired leases; investigate repeated retries and dead-lettered rows before replaying work.

Use `deploy/aws/scripts/status.sh` for a compact operator report. Roll back containers using `rollback.sh <immutable-tag>`; it does not delete volumes. Back up external Supabase and Qdrant data through their managed controls and take EBS snapshots before host changes.

Common failures: DNS/TLS prevents Caddy startup; invalid secret injection causes API startup validation failure; two worker fleets share a queue; or an embedding change targets an old collection. Diagnose configuration first and avoid re-embedding or migration operations during recovery.
