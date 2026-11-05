export type JobStatus = "draft" | "published" | "closed";
export type EmploymentType = "Full Time" | "Part Time" | "Contract" | "Internship";
export type BookingStatus = "pending" | "awaiting_code" | "confirmed" | "rejected";

export interface Job {
  id: string;
  title: string;
  slug: string;
  location: string;
  department: string;
  employment_type: EmploymentType;
  short_description: string;
  description: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  status: JobStatus;
  created_at: string;
  updated_at: string;
}

export type JobInput = Omit<Job, "id" | "created_at" | "updated_at">;

export interface Booking {
  id: string;
  session_id?: string | null;
  job_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string | null;
  notes: string | null;
  date: string; // YYYY-MM-DD
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  timezone: string;
  candidate_id: string | null;
  passkey: string | null;
  additional_code: string | null;
  status: BookingStatus;
  admin_user_id?: string | null;
  admin_email?: string | null;
  interviewer_name?: string | null;
  ip_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  user_agent?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  id?: number;
  user_id?: string | null;
  admin_email?: string | null;
  working_days: number[]; // 0=Sun .. 6=Sat
  day_start_time: string; // HH:MM:SS
  day_end_time: string; // HH:MM:SS
  slot_duration_mins: number;
  timezone: string;
  interviewer_name: string;
  interviewer_photo_url: string | null;
  meeting_type: string;
  updated_at?: string;
}

export interface ScheduleVisit {
  id: string;
  session_id: string;
  admin_user_id?: string | null;
  admin_email?: string | null;
  interviewer_name?: string | null;
  timezone?: string | null;
  user_agent?: string | null;
  referrer?: string | null;
  ip_address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  created_at: string;
}

export interface AdminLinkItem {
  id: string;
  name: string;
  company: string;
  link: string;
  agent: string;
  user_id?: string | null;
  created_at: string;
  updated_at?: string;
}

