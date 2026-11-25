"use client";

import { useActionState } from "react";
import { saveService } from "../../actions";
import type { Service } from "@/lib/types";

export default function ServiceForm({ service }: { service?: Service }) {
  const [state, action, pending] = useActionState(saveService, undefined);
  const p = service?.id ?? "new";

  return (
    <form action={action} className="space-y-3">
      {service && <input type="hidden" name="id" value={service.id} />}
      <div>
        <label htmlFor={`${p}-name`} className="label">
          Name
        </label>
        <input id={`${p}-name`} name="name" required defaultValue={service?.name} className="input" />
      </div>
      <div>
        <label htmlFor={`${p}-desc`} className="label">
          Description
        </label>
        <textarea
          id={`${p}-desc`}
          name="description"
          rows={2}
          defaultValue={service?.description ?? ""}
          className="input"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${p}-dur`} className="label">
            Duration (min)
          </label>
          <input
            id={`${p}-dur`}
            name="duration_minutes"
            type="number"
            min={5}
            max={600}
            step={5}
            required
            defaultValue={service?.duration_minutes ?? 30}
            className="input"
          />
        </div>
        <div>
          <label htmlFor={`${p}-price`} className="label">
            Price ($)
          </label>
          <input
            id={`${p}-price`}
            name="price"
            type="number"
            min={0}
            step="0.01"
            defaultValue={service ? (service.price_cents / 100).toFixed(2) : "0.00"}
            className="input"
          />
        </div>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-600">{state.success}</p>}
      <button type="submit" disabled={pending} className="btn btn-primary w-full">
        {pending ? "Saving…" : service ? "Save changes" : "Add service"}
      </button>
    </form>
  );
}
