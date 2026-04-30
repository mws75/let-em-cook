import { DAYS, DayKey } from "@/types/types";

// All helpers operate in the user's LOCAL timezone — wall-clock dates,
// never UTC instants. A "date string" here is always YYYY-MM-DD.

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isDateString(s: string): boolean {
  return DATE_PATTERN.test(s);
}

export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayLocal(now: Date = new Date()): string {
  return toLocalDateString(now);
}

export function parseDateString(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDateString(s);
  d.setDate(d.getDate() + n);
  return toLocalDateString(d);
}

export function startOfWeekMonday(s: string): string {
  const d = parseDateString(s);
  const dow = d.getDay(); // 0 = Sunday … 6 = Saturday
  const daysFromMonday = (dow + 6) % 7;
  d.setDate(d.getDate() - daysFromMonday);
  return toLocalDateString(d);
}

const DOW_SHORT = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

export function dayOfWeekShort(s: string): string {
  return DOW_SHORT[parseDateString(s).getDay()];
}

export function shortMonthDay(s: string): string {
  const d = parseDateString(s);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

// Just the DD — used on narrow screens where MM/DD doesn't fit.
export function dayOfMonth(s: string): string {
  return String(parseDateString(s).getDate()).padStart(2, "0");
}

export function fullDateLabel(s: string): string {
  return parseDateString(s).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const DAY_KEY_BY_DOW: DayKey[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function dayKeyFromDate(s: string): DayKey {
  return DAY_KEY_BY_DOW[parseDateString(s).getDay()];
}

// "this week's date for a given day-of-week" — Mon-anchored, local TZ.
// `now` is injectable so the helper is testable.
export function dateForThisWeeksDay(day: DayKey, now: Date = new Date()): string {
  const dow = now.getDay();
  const daysFromMonday = (dow + 6) % 7;
  const target = new Date(now);
  target.setDate(now.getDate() - daysFromMonday + DAYS.indexOf(day));
  return toLocalDateString(target);
}
