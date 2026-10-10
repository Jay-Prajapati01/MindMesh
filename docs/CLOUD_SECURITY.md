# Cloud security

- Use an EC2 instance role with access limited to the named Secrets Manager secret; prefer Session Manager over broadly open SSH.
- Restrict EC2 inbound traffic to 80/443 and a named administrator path. Do not expose the API or worker container directly.
- Configure Caddy with a real DNS name before TLS issuance. Set explicit HTTPS CORS origins.
- Keep `AUTH_ENABLED=true`, rate limits, private-address SSRF protection, upload limits, and tenant isolation enabled.
- Store server secrets outside Git, Docker image layers, and `NEXT_PUBLIC_*` variables. Rotate them through the provider’s secret system.
- Enable Supabase database TLS, Qdrant Cloud authentication, OS patching, encrypted EBS snapshots, CloudWatch alarms, and AWS budget alerts.
