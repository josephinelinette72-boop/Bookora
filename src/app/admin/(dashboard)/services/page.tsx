import { requireAdmin } from "@/lib/data";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/types";
import { toggleService } from "../../actions";
import ServiceForm from "./service-form";

export default async function ServicesPage() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("services").select("*").order("created_at");
  const services = (data ?? []) as Service[];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="card">
        <h1 className="border-b border-slate-100 px-6 py-4 text-lg font-semibold">Services</h1>
        {services.length === 0 && <p className="p-10 text-center text-sm text-slate-500">No services yet.</p>}
        <ul className="divide-y divide-slate-100">
          {services.map((s) => (
            <li key={s.id} className="px-6 py-4">
              <details className="group">
                <summary className="flex cursor-pointer list-none items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <p className={`font-medium ${s.active ? "" : "text-slate-400 line-through"}`}>{s.name}</p>
                    <p className="text-sm text-slate-500">
                      {formatDuration(s.duration_minutes)} · {formatPrice(s.price_cents)}
                    </p>
                  </div>
                  <span className="text-sm text-indigo-600 group-open:hidden">Edit</span>
                  <span className="hidden text-sm text-slate-500 group-open:inline">Close</span>
                </summary>
                <div className="mt-4 space-y-3">
                  <ServiceForm service={s} />
                  <form action={toggleService}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="active" value={String(!s.active)} />
                    <button type="submit" className={`btn w-full ${s.active ? "btn-danger" : "btn-secondary"}`}>
                      {s.active ? "Hide from booking page" : "Show on booking page"}
                    </button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>
      </div>

      <div className="card h-fit p-6">
        <h2 className="mb-4 font-semibold">Add a service</h2>
        <ServiceForm />
      </div>
    </div>
  );
}
