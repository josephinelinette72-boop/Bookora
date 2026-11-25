# Bookora — appointment booking

An appointment booking app built with **Next.js 16** (App Router, Server Actions, Cache Components), **Supabase** (Postgres, Auth, Row Level Security) and **Tailwind CSS v4**.

## Features

**Customers (no account needed)**
- Browse services with duration and price
- Pick a date and an open time slot, shown in the business's timezone
- Book with name, email, optional phone and notes
- Get a private link to view or cancel the booking

**Admin (`/admin`)**
- Upcoming / past / cancelled appointment lists with quick stats
- Mark appointments completed, cancel or restore them
- Add, edit and hide services
- Set weekly opening hours (several ranges per day, e.g. a lunch break)
- Settings: business name, timezone, slot interval, minimum notice, how far ahead people can book

**Safe booking logic in the database**
- Available slots are calculated in Postgres (`get_available_slots`), with timezones handled correctly
- `book_appointment` checks the slot again on the server, and an exclusion constraint makes double booking impossible, even when two people book at the same moment
- RLS: the public can only read services, hours and settings. Appointment data is visible only to admins, or through the customer's private token.

## Setup

### 1. Create a Supabase project
Create a project at [supabase.com](https://supabase.com), then open **SQL Editor**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and run it. This creates the tables, functions and policies, plus sample services and Mon–Fri 9:00–17:00 hours.

### 2. Configure environment variables
```bash
cp .env.example .env.local
```
Fill in the values from **Project Settings → API** (or the **Connect** button):
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # or the legacy anon key
```

### 3. Create an admin user
1. In Supabase, go to **Authentication → Users → Add user** and create a user with an email and password (tick "Auto confirm").
2. In the SQL Editor, give that user admin access:
   ```sql
   insert into public.admins (user_id)
   select id from auth.users where email = 'you@example.com';
   ```

### 4. Run it
```bash
npm install
npm run dev
```
Open http://localhost:3000 to book, and http://localhost:3000/admin to manage. Set your timezone first under **Admin → Hours & settings**.

## Project structure

```
supabase/schema.sql            Tables, RLS policies, booking functions, sample data
src/proxy.ts                   Refreshes the Supabase session; sends signed-out users away from /admin
src/lib/data.ts                Cached public queries + requireAdmin()
src/lib/supabase/              Cookie-aware server client
src/app/page.tsx               Service list
src/app/book/[serviceId]/      Date → time → details booking flow
src/app/appointment/[token]/   Customer's booking page (view / cancel)
src/app/admin/                 Login, appointments, services, hours & settings
```

## Notes
- Prices are shown in USD. Change `formatPrice` in `src/lib/format.ts` to use another currency.
- Emails aren't sent. To add confirmation emails, call a provider such as Resend from `bookAppointment` in `src/app/book/actions.ts`, or from a Supabase Database Webhook.
