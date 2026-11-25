import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { getActiveService, getOpenWeekdays, getSettings } from "@/lib/data";
import { addDays, formatDuration, formatPrice, todayIn } from "@/lib/format";
import BookingForm from "./booking-form";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function BookPage({ params }: PageProps<"/book/[serviceId]">) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/" className="text-sm text-slate-500 hover:text-slate-900">
        ← All services
      </Link>
      <Suspense fallback={<BookingSkeleton />}>
        <Booking params={params} />
      </Suspense>
    </div>
  );
}

async function Booking({ params }: Pick<PageProps<"/book/[serviceId]">, "params">) {
  const { serviceId } = await params;
  if (!UUID_RE.test(serviceId)) notFound();

  const [service, openWeekdays, settings] = await Promise.all([
    getActiveService(serviceId),
    getOpenWeekdays(),
    getSettings(),
  ]);
  if (!service) notFound();

  // Dates depend on "today", so compute them per request
  await connection();
  const today = todayIn(settings.timezone);
  const dates = Array.from({ length: settings.booking_window_days }, (_, i) => addDays(today, i)).filter((d) =>
    openWeekdays.includes(new Date(`${d}T00:00:00Z`).getUTCDay()),
  );

  return (
    <>
      <div className="mt-4 mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{service.name}</h1>
        <p className="mt-2 text-slate-600">
          {formatDuration(service.duration_minutes)} · {formatPrice(service.price_cents)}
        </p>
        {service.description && <p className="mt-3 text-slate-600">{service.description}</p>}
      </div>

      {dates.length === 0 ? (
        <p className="card p-6 text-slate-600">There are no open days to book at the moment.</p>
      ) : (
        <BookingForm serviceId={service.id} dates={dates} timeZone={settings.timezone} />
      )}
    </>
  );
}

function BookingSkeleton() {
  return (
    <div className="mt-4 animate-pulse space-y-6">
      <div className="h-9 w-2/3 rounded-lg bg-slate-200" />
      <div className="h-4 w-1/3 rounded bg-slate-200" />
      <div className="card h-32" />
      <div className="card h-48" />
    </div>
  );
}
