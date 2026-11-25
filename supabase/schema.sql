-- =====================================================================
-- Bookora: appointment booking schema for Supabase (Postgres)
-- Run this whole file once in the Supabase SQL Editor.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------

-- Single-row business settings
create table if not exists public.settings (
  id                    int primary key default 1 check (id = 1),
  business_name         text not null default 'Bookora',
  timezone              text not null default 'UTC',      -- IANA name, e.g. 'America/New_York'
  slot_interval_minutes int  not null default 30 check (slot_interval_minutes between 5 and 240),
  booking_window_days   int  not null default 30 check (booking_window_days between 1 and 365),
  min_notice_minutes    int  not null default 60 check (min_notice_minutes >= 0)
);
insert into public.settings (id) values (1) on conflict do nothing;

create table if not exists public.services (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  description      text,
  duration_minutes int  not null check (duration_minutes between 5 and 600),
  price_cents      int  not null default 0 check (price_cents >= 0),
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Weekly opening hours (0 = Sunday ... 6 = Saturday). Several rows per day allowed.
create table if not exists public.availability (
  id         uuid primary key default gen_random_uuid(),
  weekday    smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time   time not null,
  check (end_time > start_time)
);

do $$ begin
  create type public.appointment_status as enum ('confirmed', 'cancelled', 'completed');
exception when duplicate_object then null; end $$;

create table if not exists public.appointments (
  id             uuid primary key default gen_random_uuid(),
  service_id     uuid not null references public.services(id) on delete restrict,
  customer_name  text not null check (char_length(customer_name) between 1 and 120),
  customer_email text not null check (customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  customer_phone text,
  notes          text check (char_length(notes) <= 1000),
  starts_at      timestamptz not null,
  ends_at        timestamptz not null,
  status         public.appointment_status not null default 'confirmed',
  manage_token   uuid not null default gen_random_uuid() unique,
  created_at     timestamptz not null default now(),
  check (ends_at > starts_at),
  -- No two active appointments may overlap (protects against double booking races)
  constraint appointments_no_overlap exclude using gist (
    tstzrange(starts_at, ends_at) with &&
  ) where (status <> 'cancelled')
);
create index if not exists appointments_starts_at_idx on public.appointments (starts_at);

-- Users listed here can use the admin dashboard
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- Bookable start times for a service on a given local (business-timezone) date
create or replace function public.get_available_slots(p_service_id uuid, p_date date)
returns setof timestamptz
language sql stable security definer set search_path = public as $$
  with cfg as (select * from settings where id = 1),
       svc as (select * from services where id = p_service_id and active)
  select distinct s.slot
  from cfg, svc, availability a,
       lateral generate_series(
         (p_date + a.start_time) at time zone cfg.timezone,
         ((p_date + a.end_time) at time zone cfg.timezone) - make_interval(mins => svc.duration_minutes),
         make_interval(mins => cfg.slot_interval_minutes)
       ) as s(slot)
  where a.weekday = extract(dow from p_date)
    and s.slot >= now() + make_interval(mins => cfg.min_notice_minutes)
    and s.slot <  now() + make_interval(days => cfg.booking_window_days)
    and not exists (
      select 1 from appointments ap
      where ap.status <> 'cancelled'
        and tstzrange(ap.starts_at, ap.ends_at) && tstzrange(s.slot, s.slot + make_interval(mins => svc.duration_minutes))
    )
  order by s.slot;
$$;

-- Create a booking. Returns the private manage token.
create or replace function public.book_appointment(
  p_service_id uuid,
  p_starts_at  timestamptz,
  p_name       text,
  p_email      text,
  p_phone      text default null,
  p_notes      text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_tz       text;
  v_duration int;
  v_token    uuid;
begin
  select timezone into v_tz from settings where id = 1;
  select duration_minutes into v_duration from services where id = p_service_id and active;
  if v_duration is null then
    raise exception 'Service not found' using errcode = 'P0002';
  end if;

  if p_starts_at is null or p_starts_at not in (
    select get_available_slots(p_service_id, (p_starts_at at time zone v_tz)::date)
  ) then
    raise exception 'That time slot is no longer available' using errcode = 'P0001';
  end if;

  insert into appointments (service_id, customer_name, customer_email, customer_phone, notes, starts_at, ends_at)
  values (p_service_id, trim(p_name), lower(trim(p_email)), nullif(trim(p_phone), ''), nullif(trim(p_notes), ''),
          p_starts_at, p_starts_at + make_interval(mins => v_duration))
  returning manage_token into v_token;

  return v_token;
exception
  when exclusion_violation then
    raise exception 'That time slot is no longer available' using errcode = 'P0001';
end;
$$;

-- Look up a booking by its private token (for the customer's confirmation page)
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid, service_name text, duration_minutes int, price_cents int,
  customer_name text, customer_email text, starts_at timestamptz, ends_at timestamptz,
  status public.appointment_status, notes text
)
language sql stable security definer set search_path = public as $$
  select a.id, s.name, s.duration_minutes, s.price_cents,
         a.customer_name, a.customer_email, a.starts_at, a.ends_at, a.status, a.notes
  from appointments a join services s on s.id = a.service_id
  where a.manage_token = p_token;
$$;

create or replace function public.cancel_appointment_by_token(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update appointments set status = 'cancelled'
  where manage_token = p_token and status = 'confirmed' and starts_at > now();
  return found;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------

alter table public.settings     enable row level security;
alter table public.services     enable row level security;
alter table public.availability enable row level security;
alter table public.appointments enable row level security;
alter table public.admins       enable row level security;

-- Public read access
drop policy if exists "settings readable"  on public.settings;
create policy "settings readable" on public.settings for select using (true);

drop policy if exists "active services readable" on public.services;
create policy "active services readable" on public.services for select using (active or public.is_admin());

drop policy if exists "availability readable" on public.availability;
create policy "availability readable" on public.availability for select using (true);

-- Admin write access
drop policy if exists "admin manages settings" on public.settings;
create policy "admin manages settings" on public.settings for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manages services" on public.services;
create policy "admin manages services" on public.services for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin manages availability" on public.availability;
create policy "admin manages availability" on public.availability for all using (public.is_admin()) with check (public.is_admin());

-- Appointments: only admins read/update directly; customers go through the RPCs above
drop policy if exists "admin reads appointments" on public.appointments;
create policy "admin reads appointments" on public.appointments for select using (public.is_admin());

drop policy if exists "admin updates appointments" on public.appointments;
create policy "admin updates appointments" on public.appointments for update using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin sees self" on public.admins;
create policy "admin sees self" on public.admins for select using (user_id = auth.uid());

-- Function permissions
revoke execute on function public.get_available_slots(uuid, date)         from public;
revoke execute on function public.book_appointment(uuid, timestamptz, text, text, text, text) from public;
revoke execute on function public.get_appointment_by_token(uuid)          from public;
revoke execute on function public.cancel_appointment_by_token(uuid)       from public;
grant  execute on function public.get_available_slots(uuid, date)         to anon, authenticated;
grant  execute on function public.book_appointment(uuid, timestamptz, text, text, text, text) to anon, authenticated;
grant  execute on function public.get_appointment_by_token(uuid)          to anon, authenticated;
grant  execute on function public.cancel_appointment_by_token(uuid)       to anon, authenticated;
grant  execute on function public.is_admin()                               to anon, authenticated;

-- ---------------------------------------------------------------------
-- Sample data (safe to delete)
-- ---------------------------------------------------------------------

insert into public.services (name, description, duration_minutes, price_cents)
select * from (values
  ('Initial consultation', 'A first meeting to understand your needs and plan next steps.', 30, 0),
  ('Standard session',     'A focused one-hour session.',                                      60, 7500),
  ('Extended session',     'Ninety minutes for deeper work.',                                  90, 10500)
) v(name, description, duration_minutes, price_cents)
where not exists (select 1 from public.services);

insert into public.availability (weekday, start_time, end_time)
select d, '09:00', '17:00' from generate_series(1, 5) d
where not exists (select 1 from public.availability);
