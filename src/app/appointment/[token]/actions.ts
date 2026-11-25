"use server";

import { revalidatePath } from "next/cache";
import { publicClient } from "@/lib/data";
import type { ActionState } from "@/lib/types";

export async function cancelAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const { data, error } = await publicClient().rpc("cancel_appointment_by_token", { p_token: token });

  if (error || !data) return { error: "This appointment can no longer be cancelled." };

  revalidatePath(`/appointment/${token}`);
  return { success: "Cancelled" };
}
