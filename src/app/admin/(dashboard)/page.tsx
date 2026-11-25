import Link from "next/link";
import { getSettings, requireAdmin } from "@/lib/data";
import { formatDateTime, formatTime } from "@/lib/format";
import type { Appointment, AppointmentStatus } from "@/lib/types";
import { setAppointmentStatus } from "../actions";

const VIEWS = {
  upcoming: "Upcoming",
  past: "Past",
  cancelled: "Cancelled",
  all: "All",
} as const;
type View = keyof typeof VIEWS;

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmed: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  cancelled: "bg-red-50 text-red-700 ring-red-600/20",
  completed: "bg-slate-100 text-slate-700 ring-slate-500/20",
};

export default async function AppointmentsPage({ searchParams }: PageProps<"/admin">) {
  const { view: rawView } = await searchParams;
  const view: View = typeof rawView === "string" && rawView in VIEWS ? (rawView as View) : "upcoming";

  const { supabase } = await requireAdmin();
  const settings = await getSettings();
  const nowDate = new Date();
  const now = nowDate.toISOString();

  let query = supabase.from("appointments").select("*, services(name)").limit(200);
  if (view === "upcoming") query = query.gte("starts_at", now).neq("status", "cancelled").order("starts_at");
  else if (view === "past")
    query = query.lt("starts_at", now).neq("status", "cancelled").order("starts_at", { ascending: false });
  else if (view === "cancelled") query = query.eq("status", "cancelled").order("starts_at", { ascending: false });
  else query = query.order("starts_at", { ascending: false });

  const weekAhead = new Date(nowDate.getTime() + 7 * 864e5).toISOString();

  const [{ data, error }, { count: upcomingCount }, { count: weekCount }] = await Promise.all([
    query,
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", now)
      .eq("status", "confirmed"),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("starts_at", now)
      .lt("starts_at", weekAhead)
      .eq("status", "confirmed"),
  ]);
  const appointments = (data ?? []) as Appointment[];
  const tz = settings.timezone;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Upcoming appointments" value={upcomingCount ?? 0} />
        <Stat label="In the next 7 days" value={weekCount ?? 0} />
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h1 className="text-lg font-semibold">Appointments</h1>
          <div className="flex gap-1 text-sm">
            {(Object.keys(VIEWS) as View[]).map((v) => (
              <Link
                key={v}
                href={v === "upcoming" ? "/admin" : `/admin?view=${v}`}
                className={`rounded-lg px-3 py-1.5 font-medium ${
                  v === view ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                {VIEWS[v]}
              </Link>
            ))}
          </div>
        </div>

        {error && <p className="p-6 text-sm text-red-600">{error.message}</p>}
        {!error && appointments.length === 0 && (
          <p className="p-10 text-center text-sm text-slate-500">No appointments here.</p>
        )}

        <ul className="divide-y divide-slate-100">
          {appointments.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center">
              <div className="w-48 shrink-0">
                <p className="font-medium">{formatDateTime(a.starts_at, tz)}</p>
                <p className="text-xs text-slate-500">until {formatTime(a.ends_at, tz)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {a.customer_name}{" "}
                  <span className="font-normal text-slate-500">· {a.services?.name ?? "Service"}</span>
                </p>
                <p className="truncate text-sm text-slate-500">
                  <a href={`mailto:${a.customer_email}`} className="hover:text-indigo-600">
                    {a.customer_email}
                  </a>
                  {a.customer_phone && <> · {a.customer_phone}</>}
                </p>
                {a.notes && <p className="mt-1 line-clamp-2 text-sm text-slate-600">“{a.notes}”</p>}
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset ${STATUS_STYLES[a.status]}`}
                >
                  {a.status}
                </span>
                {a.status === "confirmed" && (
                  <>
                    <StatusButton id={a.id} status="completed" label="Complete" />
                    <StatusButton id={a.id} status="cancelled" label="Cancel" danger />
                  </>
                )}
                {a.status === "cancelled" && new Date(a.starts_at) > nowDate && (
                  <StatusButton id={a.id} status="confirmed" label="Restore" />
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatusButton({
  id,
  status,
  label,
  danger,
}: {
  id: string;
  status: AppointmentStatus;
  label: string;
  danger?: boolean;
}) {
  return (
    <form action={setAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={`btn px-3 py-1.5 text-xs ${danger ? "btn-danger" : "btn-secondary"}`}>
        {label}
      </button>
    </form>
  );
}
