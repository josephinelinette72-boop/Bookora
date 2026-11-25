import Link from "next/link";
import { getActiveServices } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/format";

export default async function Home() {
  const { services, error } = await getActiveServices();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <section className="mb-10 max-w-2xl">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Book an appointment</h1>
        <p className="mt-3 text-lg text-slate-600">
          Choose a service, pick a time that suits you, and you&apos;re done. No account needed.
        </p>
      </section>

      {error && (
        <p className="card p-6 text-sm text-red-600">
          Could not load services: {error}. Check your Supabase settings and that you ran{" "}
          <code>supabase/schema.sql</code>.
        </p>
      )}

      {!error && services.length === 0 && (
        <p className="card p-6 text-slate-600">No services are available for booking right now.</p>
      )}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <li key={service.id} className="card flex flex-col p-6">
            <h2 className="text-lg font-semibold">{service.name}</h2>
            {service.description && <p className="mt-2 flex-1 text-sm text-slate-600">{service.description}</p>}
            <div className="mt-4 flex items-center gap-3 text-sm text-slate-500">
              <span>{formatDuration(service.duration_minutes)}</span>
              <span aria-hidden>·</span>
              <span className="font-medium text-slate-900">{formatPrice(service.price_cents)}</span>
            </div>
            <Link href={`/book/${service.id}`} className="btn btn-primary mt-5">
              Book now
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
