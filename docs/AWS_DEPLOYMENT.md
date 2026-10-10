# AWS EC2 hybrid deployment

This guide prepares a low-complexity first production option: Ubuntu LTS EC2, Docker Compose, Caddy, a separate API container, and a separate worker container. Supabase, Qdrant Cloud, and AI providers remain managed external services.

## Before deployment

Choose a region near users and managed services. Start with an instance large enough for browser/document worker overhead (at least 4 vCPU and 8 GB RAM); validate actual CPU, memory, disk, queue delay, and provider rate limits before scaling. Create budget alerts for EC2, EBS, data transfer, Secrets Manager, ECR, and CloudWatch; prices vary by region and usage, so calculate them in the AWS Pricing Calculator before approval.

Create a security group permitting HTTPS/HTTP only, preferably use SSM Session Manager for administration, and attach a least-privilege IAM role that can read the one deployment secret. Create DNS records for the configured domain. Do not expose port 8000, worker services, Supabase credentials, or Qdrant credentials.

## Operator sequence

1. Clone the reviewed commit on the instance.
2. Review and manually run `deploy/aws/scripts/setup-ec2.sh`.
3. Copy `deploy/aws/.env.example` to ignored `deploy/aws/.env`; inject secrets from Secrets Manager by an approved process.
4. Verify domains, CORS, `JOB_BACKEND=postgres`, and separate staging/production external resources.
5. Run `scripts/preflight.sh`. It validates configuration without starting containers.
6. Run `scripts/deploy.sh` only after approval. Verify `/health`, authenticated API behavior, worker consumption, and logs separately.
7. If needed, use `scripts/rollback.sh <prior-image-tag>`.

Windows preparation is limited to editing templates and securely transferring approved artifacts; execute EC2 scripts in Ubuntu. This repository preparation does not create EC2, IAM, ECR, DNS, Secrets Manager, or any other AWS resource.
