"use client";

import { useActionState } from "react";
import { cancelAppointment } from "./actions";

export default function CancelButton({ token }: { token: string }) {
  const [state, action, pending] = useActionState(cancelAppointment, undefined);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Cancel this appointment?")) e.preventDefault();
      }}
      className="flex items-center gap-3"
    >
      <input type="hidden" name="token" value={token} />
      {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      <button type="submit" disabled={pending} className="btn btn-danger">
        {pending ? "Cancelling…" : "Cancel appointment"}
      </button>
    </form>
  );
}
