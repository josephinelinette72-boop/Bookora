"use client";

import { useActionState } from "react";
import { addHours, saveSettings } from "../../actions";
import { WEEKDAYS } from "@/lib/format";
import type { ActionState, Settings } from "@/lib/types";

function Feedback({ state }: { state: ActionState }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-emerald-600">{state.success}</p>;
  return null;
}

export function AddHoursForm() {
  const [state, action, pending] = useActionState(addHours, undefined);

  return (
    <form action={action} className="space-y-4">
      <fieldset>
        <legend className="label">Days</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((d, i) => (
            <label
              key={d}
              className="cursor-pointer rounded-lg border border-slate-200 px-3 py-1.5 text-sm has-checked:border-indigo-600 has-checked:bg-indigo-50 has-checked:text-indigo-700"
            >
              <input type="checkbox" name="weekday" value={i} className="sr-only" />
              {d.slice(0, 3)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_time" className="label">
            From
          </label>
          <input id="start_time" name="start_time" type="time" required defaultValue="09:00" className="input" />
        </div>
        <div>
          <label htmlFor="end_time" className="label">
            To
          </label>
          <input id="end_time" name="end_time" type="time" required defaultValue="17:00" className="input" />
        </div>
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Adding…" : "Add hours"}
      </button>
    </form>
  );
}

export function SettingsForm({ settings, timezones }: { settings: Settings; timezones: string[] }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="business_name" className="label">
          Business name
        </label>
        <input id="business_name" name="business_name" defaultValue={settings.business_name} className="input" />
      </div>
      <div>
        <label htmlFor="timezone" className="label">
          Timezone
        </label>
        <select id="timezone" name="timezone" defaultValue={settings.timezone} className="input">
          {!timezones.includes(settings.timezone) && <option value={settings.timezone}>{settings.timezone}</option>}
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <NumberField
          name="slot_interval_minutes"
          label="Slot every (min)"
          min={5}
          max={240}
          value={settings.slot_interval_minutes}
        />
        <NumberField
          name="min_notice_minutes"
          label="Min notice (min)"
          min={0}
          max={100000}
          value={settings.min_notice_minutes}
        />
        <NumberField
          name="booking_window_days"
          label="Book ahead (days)"
          min={1}
          max={365}
          value={settings.booking_window_days}
        />
      </div>
      <Feedback state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}

function NumberField(props: { name: string; label: string; min: number; max: number; value: number }) {
  return (
    <div>
      <label htmlFor={props.name} className="label text-xs">
        {props.label}
      </label>
      <input
        id={props.name}
        name={props.name}
        type="number"
        required
        min={props.min}
        max={props.max}
        defaultValue={props.value}
        className="input"
      />
    </div>
  );
}
