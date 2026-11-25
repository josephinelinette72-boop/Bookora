import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getSettings, publicClient } from "@/lib/data";
import { formatDateTime, formatDuration, formatPrice, formatTime } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";
import CancelButton from "./cancel-button";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Booking = {
  id: string;
  service_name: string;
  duration_minutes: number;
  price_cents: number;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  completed: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export default function AppointmentPage(props: PageProps<"/appointment/[token]">) {
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <Suspense fallback={<div className="card h-80 animate-pulse" />}>
        <AppointmentDetails {...props} />
      </Suspense>
    </div>
  );
}

async function AppointmentDetails({ params, searchParams }: PageProps<"/appointment/[token]">) {
  const { token } = await params;
  const { new: isNew } = await searchParams;
  if (!UUID_RE.test(token)) notFound();

  const [{ data }, settings] = await Promise.all([
    publicClient().rpc("get_appointment_by_token", { p_token: token }).maybeSingle(),
    getSettings(),
  ]);
  if (!data) notFound();
  const b = data as Booking;
  await connection();
  const canCancel = b.status === "confirmed" && new Date(b.starts_at) > new Date();

  return (
    <>
      {isNew && b.status === "confirmed" && (
        <div className="mb-6 rounded-2xl bg-emerald-50 p-6 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-600 text-2xl text-white">
            ✓
          </div>
          <h1 className="text-2xl font-bold text-emerald-900">You&apos;re booked!</h1>
          <p className="mt-1 text-sm text-emerald-800">
            Bookmark this page — you can use it to view or cancel your appointment.
          </p>
        </div>
      )}

      <div className="card divide-y divide-slate-100">
        <div className="flex items-start justify-between gap-4 p-6">
          <div>
            <p className="text-sm text-slate-500">Appointment</p>
            <h2 className="text-xl font-semibold">{b.service_name}</h2>
          </div>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[b.status]}`}
          >
            {b.status}
          </span>
        </div>

        <dl className="grid gap-4 p-6 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">When</dt>
            <dd className="font-medium">
              {formatDateTime(b.starts_at, settings.timezone)} – {formatTime(b.ends_at, settings.timezone)}
            </dd>
            <dd className="text-xs text-slate-500">{settings.timezone}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Duration · Price</dt>
            <dd className="font-medium">
              {formatDuration(b.duration_minutes)} · {formatPrice(b.price_cents)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Name</dt>
            <dd className="font-medium">{b.customer_name}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Email</dt>
            <dd className="font-medium break-all">{b.customer_email}</dd>
          </div>
          {b.notes && (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Notes</dt>
              <dd className="whitespace-pre-wrap">{b.notes}</dd>
            </div>
          )}
        </dl>

        <div className="flex flex-wrap items-center justify-between gap-3 p-6">
          <Link href="/" className="btn btn-secondary">
            Book another
          </Link>
          {canCancel && <CancelButton token={token} />}
        </div>
      </div>
    </>
  );
}
