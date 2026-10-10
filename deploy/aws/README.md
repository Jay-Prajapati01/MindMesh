# AWS EC2 deployment

This folder is an operator-invoked EC2 Docker Compose option. It does not create AWS resources and does not replace `deploy/google-cloud/`.

1. Provision an Ubuntu LTS EC2 instance, attach an IAM role that may read only the required AWS Secrets Manager secret, and restrict the security group to TCP 80/443 plus administrator SSH or Systems Manager.
2. Copy `.env.example` to an untracked `.env`; inject server-only values from Secrets Manager through your approved deployment process.
3. Set DNS for `MINDMESH_DOMAIN` before Caddy obtains TLS certificates.
4. Run `scripts/preflight.sh`, then `scripts/deploy.sh` deliberately from the EC2 checkout.

The worker is independent from the public API and uses `JOB_BACKEND=postgres`, so no GCP Tasks or Cloud Run adapter is contacted. Do not run AWS and GCP workers against one production queue unless that is an intentional, monitored cutover.
