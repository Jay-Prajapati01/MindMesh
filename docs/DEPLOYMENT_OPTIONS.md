# Deployment options

MindMesh has one application codebase and two independent cloud adapters.

| Concern | AWS hybrid | Google Cloud hybrid |
| --- | --- | --- |
| Public runtime | EC2 + Docker Compose + Caddy | Cloud Run API/dispatcher |
| Background jobs | Postgres rows + poll-mode worker | Postgres rows + Cloud Tasks + Cloud Run Jobs |
| Identity/data | Supabase Auth, Postgres, Storage | Same external Supabase services |
| Vectors | Qdrant Cloud | Qdrant Cloud |
| Mobile | One Kotlin companion app | Same Kotlin companion app |

Choose `JOB_BACKEND=postgres` for AWS and `JOB_BACKEND=gcp` for Google Cloud. They must not be allowed to process the same queue concurrently except during a deliberately supervised migration. Separate staging and production Supabase projects, Qdrant collections, and deployment environment files are recommended.

The GCP configuration remains in `deploy/google-cloud/`; AWS configuration is isolated in `deploy/aws/`.
