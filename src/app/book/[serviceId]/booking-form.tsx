"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { bookAppointment, getSlots } from "../actions";
import { dateParts, formatTime } from "@/lib/format";

type Props = { serviceId: string; dates: string[]; timeZone: string };

export default function BookingForm({ serviceId, dates, timeZone }: Props) {
  const [date, setDate] = useState(dates[0]);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotError, setSlotError] = useState<string>();
  const [startsAt, setStartsAt] = useState<string>();
  const [loading, startLoading] = useTransition();
  const [state, formAction, pending] = useActionState(bookAppointment, undefined);
  const v = state?.values;

  useEffect(() => {
    startLoading(async () => {
      const res = await getSlots(serviceId, date);
      setSlots(res.slots);
      setSlotError(res.error);
      setStartsAt((prev) => (prev && res.slots.includes(prev) ? prev : undefined));
    });
  }, [serviceId, date, state]);

  return (
    <div className="space-y-6">
      {/* Step 1: date */}
      <section className="card p-6">
        <h2 className="mb-4 font-semibold">1. Choose a date</h2>
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          {dates.map((d) => {
            const p = dateParts(d);
            const selected = d === date;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setDate(d)}
                aria-pressed={selected}
                className={`flex w-16 shrink-0 flex-col items-center rounded-xl border py-2 text-sm transition ${
                  selected
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                }`}
              >
                <span className={`text-xs ${selected ? "text-indigo-100" : "text-slate-500"}`}>{p.weekday}</span>
                <span className="text-lg font-semibold">{p.day}</span>
                <span className={`text-xs ${selected ? "text-indigo-100" : "text-slate-500"}`}>{p.month}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Step 2: time */}
      <section className="card p-6">
        <h2 className="mb-1 font-semibold">2. Choose a time</h2>
        <p className="mb-4 text-sm text-slate-500">
          {dateParts(date).long} · times shown in {timeZone}
        </p>
        {loading ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : slotError ? (
          <p className="text-sm text-red-600">{slotError}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-slate-600">No times left on this day. Try another date.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots.map((slot) => {
              const selected = slot === startsAt;
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setStartsAt(slot)}
                  aria-pressed={selected}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    selected
                      ? "border-indigo-600 bg-indigo-600 text-white"
                      : "border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
                  }`}
                >
                  {formatTime(slot, timeZone)}
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* A failed booking refreshes the time list, so show the error outside the form */}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      )}

      {/* Step 3: details */}
      <form action={formAction} className="card space-y-4 p-6">
          <h2 className="font-semibold">3. Your details</h2>
          <input type="hidden" name="serviceId" value={serviceId} />
          <input type="hidden" name="startsAt" value={startsAt ?? ""} />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label">
                Full name
              </label>
              <input id="name" name="name" defaultValue={v?.name} required maxLength={120} className="input" autoComplete="name" />
            </div>
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input id="email" name="email" defaultValue={v?.email} type="email" required className="input" autoComplete="email" />
            </div>
          </div>
          <div>
            <label htmlFor="phone" className="label">
              Phone <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input id="phone" name="phone" defaultValue={v?.phone} type="tel" className="input" autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="notes" className="label">
              Notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea id="notes" name="notes" defaultValue={v?.notes} rows={3} maxLength={1000} className="input" />
          </div>

          <div className="flex flex-col-reverse items-stretch gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              {startsAt ? (
                <>
                  {dateParts(date).long} at <strong>{formatTime(startsAt, timeZone)}</strong>
                </>
              ) : (
                "Select a time above to continue."
              )}
            </p>
            <button type="submit" disabled={pending || !startsAt} className="btn btn-primary">
              {pending ? "Booking…" : "Confirm booking"}
            </button>
          </div>
        </form>
    </div>
  );
}
