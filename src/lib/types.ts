export type Settings = {
  id: number;
  business_name: string;
  timezone: string;
  slot_interval_minutes: number;
  booking_window_days: number;
  min_notice_minutes: number;
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  active: boolean;
  created_at: string;
};

export type Availability = {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type AppointmentStatus = "confirmed" | "cancelled" | "completed";

export type Appointment = {
  id: string;
  service_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  notes: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  created_at: string;
  services?: { name: string } | null;
};

export type ActionState = { error?: string; success?: string; values?: Record<string, string> } | undefined;
