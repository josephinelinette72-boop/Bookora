"use server";

import { redirect } from "next/navigation";
import { publicClient } from "@/lib/data";
import type { ActionState } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function getSlots(serviceId: string, date: string): Promise<{ slots: string[]; error?: string }> {
  if (!DATE_RE.test(date)) return { slots: [], error: "Invalid date" };

  const { data, error } = await publicClient().rpc("get_available_slots", { p_service_id: serviceId, p_date: date });
  if (error) return { slots: [], error: "Could not load available times. Please try again." };

  return { slots: (data as string[]).map((s) => new Date(s).toISOString()) };
}

export async function bookAppointment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const field = (name: string) => String(formData.get(name) ?? "").trim();

  const serviceId = field("serviceId");
  const startsAt = field("startsAt");
  const name = field("name");
  const email = field("email");
  const phone = field("phone");
  const notes = field("notes");
  const fail = (error: string): ActionState => ({ error, values: { name, email, phone, notes } });

  if (!startsAt) return fail("Please choose a time.");
  if (!name) return fail("Please enter your name.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return fail("Please enter a valid email address.");
  if (notes.length > 1000) return fail("Notes must be 1000 characters or fewer.");

  const { data: token, error } = await publicClient().rpc("book_appointment", {
    p_service_id: serviceId,
    p_starts_at: startsAt,
    p_name: name,
    p_email: email,
    p_phone: phone || null,
    p_notes: notes || null,
  });

  if (error || !token) {
    return fail(
      error?.message.includes("no longer available")
        ? "Sorry, that time was just taken. Please pick another."
        : "Something went wrong while booking. Please try again.",
    );
  }

  redirect(`/appointment/${token}?new=1`);
}
