import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { createClient } from "./supabase/server";
import { supabaseKey, supabaseUrl } from "./supabase/env";
import type { Service, Settings } from "./types";

/** Cookie-less client using the public (anon) role. Safe inside `use cache`. */
export function publicClient() {
  return createPublicClient(supabaseUrl, supabaseKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const TAGS = { settings: "settings", services: "services", availability: "availability" } as const;

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  business_name: "Bookora",
  timezone: "UTC",
  slot_interval_minutes: 30,
  booking_window_days: 30,
  min_notice_minutes: 60,
};

export async function getSettings(): Promise<Settings> {
  "use cache";
  cacheTag(TAGS.settings);
  const { data, error } = await publicClient().from("settings").select("*").eq("id", 1).maybeSingle();
  // Don't hold on to a failed lookup for long
  if (error) cacheLife("minutes");
  else cacheLife("hours");
  return (data as Settings | null) ?? DEFAULT_SETTINGS;
}

export async function getActiveServices(): Promise<{ services: Service[]; error?: string }> {
  "use cache";
  cacheTag(TAGS.services);
  const { data, error } = await publicClient()
    .from("services")
    .select("*")
    .eq("active", true)
    .order("duration_minutes", { ascending: true });
  if (error) cacheLife("minutes");
  else cacheLife("hours");
  return { services: (data ?? []) as Service[], error: error?.message };
}

export async function getActiveService(id: string): Promise<Service | null> {
  "use cache";
  cacheTag(TAGS.services);
  cacheLife("hours");
  const { data } = await publicClient().from("services").select("*").eq("id", id).eq("active", true).maybeSingle();
  return (data as Service | null) ?? null;
}

/** Weekdays (0 = Sunday) that have at least one opening-hours range. */
export async function getOpenWeekdays(): Promise<number[]> {
  "use cache";
  cacheTag(TAGS.availability);
  cacheLife("hours");
  const { data } = await publicClient().from("availability").select("weekday");
  return [...new Set((data ?? []).map((r: { weekday: number }) => r.weekday))];
}

/** Ensures the current user is a signed-in admin. Returns the cookie-aware Supabase client. */
export async function requireAdmin() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/admin/login");

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/admin/login?error=not-admin");

  return { supabase, email: (data.claims.email as string | undefined) ?? "" };
}
