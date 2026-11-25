import { getSettings, requireAdmin } from "@/lib/data";
import { WEEKDAYS } from "@/lib/format";
import type { Availability } from "@/lib/types";
import { deleteHours } from "../../actions";
import { AddHoursForm, SettingsForm } from "./forms";

const hhmm = (t: string) => t.slice(0, 5);

export default async function HoursPage() {
  const { supabase } = await requireAdmin();
  const [{ data }, settings] = await Promise.all([
    supabase.from("availability").select("*").order("weekday").order("start_time"),
    getSettings(),
  ]);
  const hours = (data ?? []) as Availability[];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <div className="card">
          <div className="border-b border-slate-100 px-6 py-4">
            <h1 className="text-lg font-semibold">Weekly opening hours</h1>
            <p className="text-sm text-slate-500">Times are in {settings.timezone}.</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {WEEKDAYS.map((day, i) => {
              const ranges = hours.filter((h) => h.weekday === i);
              return (
                <li key={day} className="flex items-start gap-4 px-6 py-3 text-sm">
                  <span className="w-24 shrink-0 pt-1 font-medium">{day}</span>
                  <div className="flex flex-1 flex-wrap gap-2">
                    {ranges.length === 0 && <span className="pt-1 text-slate-400">Closed</span>}
                    {ranges.map((r) => (
                      <form
                        key={r.id}
                        action={deleteHours}
                        className="flex items-center gap-1 rounded-lg bg-slate-100 py-1 pr-1 pl-2.5"
                      >
                        <input type="hidden" name="id" value={r.id} />
                        <span className="tabular-nums">
                          {hhmm(r.start_time)}–{hhmm(r.end_time)}
                        </span>
                        <button
                          type="submit"
                          aria-label={`Remove ${day} ${hhmm(r.start_time)}–${hhmm(r.end_time)}`}
                          className="grid h-5 w-5 place-items-center rounded text-slate-400 hover:bg-slate-200 hover:text-red-600"
                        >
                          ×
                        </button>
                      </form>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">Add opening hours</h2>
          <AddHoursForm />
        </div>
      </div>

      <div className="card h-fit p-6">
        <h2 className="mb-4 font-semibold">Booking settings</h2>
        <SettingsForm settings={settings} timezones={Intl.supportedValuesOf("timeZone")} />
      </div>
    </div>
  );
}
