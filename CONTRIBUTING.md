# Contributing to MindMesh

Thanks for considering a contribution. This guide covers the basics for bug reports, feature proposals, documentation changes, and pull requests.

## Before opening an issue

- Search existing issues to avoid duplicates.
- Include the affected area, steps to reproduce, expected behavior, and relevant logs with secrets removed.
- For feature proposals, describe the user problem and a practical example.
- Report security vulnerabilities privately as described in [SECURITY.md](SECURITY.md).

## Local development

Follow the [README setup instructions](README.md#getting-started). Keep credentials in ignored local environment files. Do not commit user data, logs, generated model files, or build artifacts.

## Pull requests

1. Create a focused branch from `main`.
2. Keep changes scoped and document user-facing behavior.
3. Update documentation and configuration examples when behavior changes.
4. Run the relevant checks for the files you changed and include the results in your pull request.
5. Explain any migration, compatibility, or security impact.

By submitting a contribution, you agree that it may be distributed under the project's [MIT License](LICENSE).

## Project conventions

- Prefer small, readable changes that preserve existing API contracts.
- Never commit credentials, personal data, or real environment files.
- Treat external services and downloaded content as untrusted input.
- Keep new dependencies focused and explain why they are needed.
