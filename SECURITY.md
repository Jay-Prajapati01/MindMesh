# Security Policy

MindMesh handles personal documents and may connect to third-party AI and
storage providers. Deployers are responsible for configuring the application,
its providers, and its network boundaries securely.

## Reporting a vulnerability

Do not report exploitable vulnerabilities in a public issue. Use GitHub's
private vulnerability reporting for this repository when available. If it is
unavailable, contact the maintainer privately through the
[maintainer's GitHub profile](https://github.com/Jay-Prajapati01).

Include the affected component, steps to reproduce, impact, and any suggested
mitigation. Avoid including real credentials or another person's private data.
Please allow maintainers reasonable time to investigate and prepare a fix before
public disclosure.

## Supported versions

Security fixes are currently made against the latest version on the default
branch. There is no separate long-term-support release line.

## Deployment precautions

- Keep secrets in local environment files or a secret manager; never commit
  populated environment files.
- Do not expose databases, vector stores, caches, or internal worker services
  directly to the public internet.
- Restrict network egress and configure allowed origins and trusted proxies for
  the deployment environment.
- Review provider terms, data retention, and privacy requirements before sending
  user content to external services.
