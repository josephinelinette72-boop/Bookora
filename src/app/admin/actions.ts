"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin, TAGS } from "@/lib/data";
import type { ActionState, AppointmentStatus } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

// ---------- Auth ----------

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: str(formData, "email"),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: error.message };

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    return { error: "This account is not an admin. Add its user id to the admins table." };
  }
  redirect("/admin");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ---------- Appointments ----------

export async function setAppointmentStatus(formData: FormData) {
  const { supabase } = await requireAdmin();
  const status = str(formData, "status") as AppointmentStatus;
  if (!["confirmed", "cancelled", "completed"].includes(status)) return;

  await supabase.from("appointments").update({ status }).eq("id", str(formData, "id"));
  revalidatePath("/admin");
}

// ---------- Services ----------

export async function saveService(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const id = str(formData, "id");
  const duration = Number(str(formData, "duration_minutes"));
  const price = Math.round(Number(str(formData, "price") || 0) * 100);
  const row = {
    name: str(formData, "name"),
    description: str(formData, "description") || null,
    duration_minutes: duration,
    price_cents: price,
  };

  if (!row.name) return { error: "Name is required." };
  if (!Number.isInteger(duration) || duration < 5 || duration > 600)
    return { error: "Duration must be between 5 and 600 minutes." };
  if (!Number.isFinite(price) || price < 0) return { error: "Price must be zero or more." };

  const { error } = id
    ? await supabase.from("services").update(row).eq("id", id)
    : await supabase.from("services").insert(row);
  if (error) return { error: error.message };

  updateTag(TAGS.services);
  revalidatePath("/admin/services");
  return { success: id ? "Service updated." : "Service added." };
}

export async function toggleService(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase
    .from("services")
    .update({ active: str(formData, "active") === "true" })
    .eq("id", str(formData, "id"));
  updateTag(TAGS.services);
  revalidatePath("/admin/services");
}

// ---------- Opening hours ----------

export async function addHours(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const weekdays = formData.getAll("weekday").map(Number);
  const start_time = str(formData, "start_time");
  const end_time = str(formData, "end_time");

  if (weekdays.length === 0) return { error: "Pick at least one day." };
  if (!start_time || !end_time || end_time <= start_time) return { error: "End time must be after start time." };

  const { error } = await supabase
    .from("availability")
    .insert(weekdays.map((weekday) => ({ weekday, start_time, end_time })));
  if (error) return { error: error.message };

  updateTag(TAGS.availability);
  revalidatePath("/admin/hours");
  return { success: "Hours added." };
}

export async function deleteHours(formData: FormData) {
  const { supabase } = await requireAdmin();
  await supabase.from("availability").delete().eq("id", str(formData, "id"));
  updateTag(TAGS.availability);
  revalidatePath("/admin/hours");
}

// ---------- Settings ----------

export async function saveSettings(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  const timezone = str(formData, "timezone");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    return { error: `"${timezone}" is not a valid timezone.` };
  }

  const { error } = await supabase
    .from("settings")
    .update({
      business_name: str(formData, "business_name") || "Bookora",
      timezone,
      slot_interval_minutes: Number(str(formData, "slot_interval_minutes")),
      booking_window_days: Number(str(formData, "booking_window_days")),
      min_notice_minutes: Number(str(formData, "min_notice_minutes")),
    })
    .eq("id", 1);
  if (error) return { error: error.message };

  updateTag(TAGS.settings);
  return { success: "Settings saved." };
}
