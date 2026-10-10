# GitHub repository guide

## What belongs in Git

- Application source in `frontend/`, `backend/`, and `android-companion/app/`.
- Infrastructure in `docker-compose*.yml`, `deploy/`, and `supabase/migrations/`.
- Configuration templates ending in `.example`.
- Product, operating, and manual testing documentation in `docs/` and the
  repository root.
- GitHub workflows in `.github/workflows/`.

## What stays local

- Secrets and real environment files.
- Android SDK configuration, Gradle caches, build outputs, and APKs.
- Docker volumes, Qdrant data, uploads, local account data, models, and logs.
- Browser and smoke-test output.

The root `.gitignore` enforces these rules. Do not force-add any ignored file.
Use the corresponding `.example` file when a new configuration value is needed.

## Repository map

| Directory | Purpose |
|---|---|
| `frontend/` | Customer web product and authenticated workspace |
| `backend/` | FastAPI APIs, tenancy, processing, and commerce services |
| `android-companion/` | Android share companion using the same account and APIs |
| `supabase/migrations/` | Production database schema and tenancy migrations |
| `workers/` | Serverless processing workers |
| `deploy/` | Deployment definitions for supported environments |
| `docs/` | Product operations, architecture, security, and release guidance |
| `.github/workflows/` | Continuous integration and manually dispatched cloud workflows |

## Before a GitHub push

1. Review `git status --short` and confirm no secrets, APKs, caches, or runtime
   data are staged.
2. Commit application code, configuration templates, migrations, and relevant
   documentation together.
3. Let GitHub Actions run the backend and frontend checks after pushing.
