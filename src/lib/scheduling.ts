import type { Settings } from "./types";

export interface TimeSlot {
  start_time: string; // HH:MM:SS
  end_time: string; // HH:MM:SS
  label: string; // "10:30 AM"
  taken: boolean;
}

export interface MonthDay {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  inCurrentMonth: boolean;
  isPast: boolean;
  isWorkingDay: boolean;
  isBlocked?: boolean;
  selectable: boolean;
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Build a 6-row Monday-first month grid for the given year/month (month is 0-indexed),
 * including the leading/trailing days from adjacent months needed to fill the grid.
 * Any dates passed in blockedDates will be marked non-selectable and greyed out.
 */
export function buildMonthGrid(
  year: number,
  month: number,
  settings: Settings,
  blockedDates?: string[]
): MonthDay[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstOfMonth = new Date(year, month, 1);
  // JS getDay(): 0=Sun..6=Sat. Convert to Monday-first index (0=Mon..6=Sun).
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;

  const gridStart = new Date(year, month, 1 - leadingBlanks);
  const days: MonthDay[] = [];
  const blockedSet = new Set(blockedDates || []);

  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    const dateStr = toDateStr(d);
    const isPast = d < today;
    const isWorkingDay = settings.working_days.includes(d.getDay());
    const isBlocked = blockedSet.has(dateStr);
    days.push({
      date: dateStr,
      dayNumber: d.getDate(),
      inCurrentMonth: d.getMonth() === month,
      isPast,
      isWorkingDay,
      isBlocked,
      selectable: !isPast && isWorkingDay && !isBlocked,
    });
  }

  return days;
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}:00`;
}

export function formatLabel(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/** Build the day's time slots, marking ones already taken by an existing booking. */
export function buildDaySlots(
  settings: Settings,
  takenTimes: string[] // start_time values already booked (pending/confirmed) for that date
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const start = timeToMinutes(settings.day_start_time);
  const end = timeToMinutes(settings.day_end_time);
  const step = settings.slot_duration_mins;

  for (let m = start; m + step <= end; m += step) {
    const start_time = minutesToTime(m);
    const end_time = minutesToTime(m + step);
    slots.push({
      start_time,
      end_time,
      label: formatLabel(start_time),
      taken: takenTimes.some((t) => t.slice(0, 5) === start_time.slice(0, 5)),
    });
  }

  return slots;
}

export function formatDateLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

/** "08:30 - 09:00 Thursday, October 9" */
export function formatSelectionSummary(dateStr: string, startTime: string, endTime: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = date.toLocaleDateString(undefined, { weekday: "long" });
  const monthDay = date.toLocaleDateString(undefined, { month: "long", day: "numeric" });
  return `${formatLabel(startTime)} - ${formatLabel(endTime)}, ${weekday}, ${monthDay}`;
}

export function currentTimeInZone(timezone: string): string {
  try {
    return new Date().toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: timezone,
    });
  } catch {
    return new Date().toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
}
