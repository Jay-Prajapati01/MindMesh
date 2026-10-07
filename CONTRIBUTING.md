# Contributing to MindMesh

Thanks for your interest in contributing. This guide covers the local checks and
the review process for changes to MindMesh.

## Before you start

- Search existing issues and pull requests before starting substantial work.
- For significant behavior or architecture changes, open an issue first to agree
  on scope.
- Never commit credentials, user data, generated models, or local environment
  files. Use the checked-in `.env.example` files as templates.
- Keep changes focused and include tests or documentation when behavior changes.

## Development setup

The recommended full-stack setup uses Docker Compose. Follow the
[Quick Start](README.md#-quick-start) and copy the relevant environment example
to a local environment file before starting services.

For backend-only work, install the packages from `backend/requirements.txt`:

```powershell
cd backend
python -m pip install -r requirements.txt
```

For frontend work, install the locked dependencies with `npm ci` from
`frontend/`.

## Checks

Run the checks relevant to your change before opening a pull request:

```powershell
# Backend tests and lint
cd backend
python -m pip install -r requirements.txt
python -m pytest -q
python -m ruff check app tests

# Frontend type-check, lint, and production build
cd ..\frontend
npm ci
npx tsc --noEmit
npm run lint
npm run build
```

The backend tests may require system packages used by document and media
processing. The GitHub Actions workflow documents the CI environment.

## Pull requests

- Explain the problem and the behavior change.
- Link related issues and include screenshots for user-facing changes.
- Document any new configuration variables in the appropriate environment
  example and setup guide.
- Include test results and call out checks that could not be run.
- Keep generated files, local data, credentials, and unrelated formatting out of
  the pull request.

Maintainers may request changes before merging. By submitting a contribution,
you agree that it may be distributed under the repository's MIT License.
