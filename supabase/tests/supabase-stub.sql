-- Supabase ortamının test için taklidi
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists auth;

create table auth.users (
  id    uuid primary key,
  email text unique
);

create or replace function auth.uid() returns uuid
language sql stable as $$
  select nullif(current_setting('test.uid', true), '')::uuid
$$;

grant usage on schema auth to authenticated, anon, service_role;

-- --- storage şeması (Supabase'de hazır gelir) --------------------------------
-- Gerçek depolama davranışı taklit edilmiyor; amaç 0017'deki kova tanımının ve
-- politika ifadelerinin söz dizimi ile fonksiyon referanslarının doğrulanması.
create schema if not exists storage;

create table if not exists storage.buckets (
  id                 text primary key,
  name               text not null,
  public             boolean not null default false,
  file_size_limit    bigint,
  allowed_mime_types text[]
);

create table if not exists storage.objects (
  id        uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name      text not null,
  owner     uuid
);

alter table storage.objects enable row level security;

create or replace function storage.foldername(p_name text)
returns text[]
language sql
immutable
as $fn$
  select (string_to_array(p_name, '/'))[1:greatest(array_length(string_to_array(p_name, '/'), 1) - 1, 0)];
$fn$;

grant usage on schema storage to authenticated, anon, service_role;
grant select on storage.buckets to authenticated, anon;
grant select, insert, update, delete on storage.objects to authenticated;
