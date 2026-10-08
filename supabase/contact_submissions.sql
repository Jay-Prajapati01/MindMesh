-- Contact-form storage: server-side writes only. The FastAPI backend inserts
-- with the service-role key through SUPABASE_DB_URL; browsers never talk to
-- this table directly, so RLS grants anon/authenticated nothing at all.

create table if not exists public.contact_submissions (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  company     text,
  topic       text not null default 'General',
  message     text not null,
  received_at timestamptz not null default now()
);

alter table public.contact_submissions enable row level security;

-- No policies on purpose: service_role bypasses RLS; anon/authenticated get nothing.
drop policy if exists "anon insert only" on public.contact_submissions;
drop policy if exists "auth select all" on public.contact_submissions;
drop policy if exists "auth delete own" on public.contact_submissions;
revoke all on public.contact_submissions from anon, authenticated;
grant all on public.contact_submissions to service_role;

-- Database-level guards mirroring the API validation, for when RLS alone
-- would not stop a misconfigured key (audit note in docs/SECURITY_REPORT.md).
alter table public.contact_submissions
  drop constraint if exists contact_submissions_message_length;
alter table public.contact_submissions
  add constraint contact_submissions_message_length
  check (char_length(message) between 10 and 2000);

alter table public.contact_submissions
  drop constraint if exists contact_submissions_email_format;
alter table public.contact_submissions
  add constraint contact_submissions_email_format
  check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

alter table public.contact_submissions
  drop constraint if exists contact_submissions_name_length;
alter table public.contact_submissions
  add constraint contact_submissions_name_length
  check (char_length(name) between 1 and 100);

alter table public.contact_submissions
  drop constraint if exists contact_submissions_topic_allowed;
alter table public.contact_submissions
  add constraint contact_submissions_topic_allowed
  check (topic in ('General', 'Account support', 'Partnership', 'Bug / feedback'));

create index if not exists contact_submissions_received_at
  on public.contact_submissions(received_at desc);
