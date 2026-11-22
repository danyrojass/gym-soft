import { PlanValidityType } from "@prisma/client";

function getTimeZoneParts(date: Date, timeZone: string) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const p = getTimeZoneParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - date.getTime();
}

export function zonedDateTimeToUtc(
  parts: { year: number; month: number; day: number; hour?: number; minute?: number; second?: number },
  timeZone: string
): Date {
  const hour = parts.hour ?? 0;
  const minute = parts.minute ?? 0;
  const second = parts.second ?? 0;
  const utcGuess = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, hour, minute, second));
  const offset1 = getTimeZoneOffsetMs(utcGuess, timeZone);
  let utc = new Date(utcGuess.getTime() - offset1);
  const offset2 = getTimeZoneOffsetMs(utc, timeZone);
  if (offset2 !== offset1) {
    utc = new Date(utcGuess.getTime() - offset2);
  }
  return utc;
}

export function getLocalDateParts(date: Date, timeZone: string) {
  const p = getTimeZoneParts(date, timeZone);
  return { year: p.year, month: p.month, day: p.day };
}

export function getLocalDayKey(date: Date, timeZone: string): string {
  const p = getLocalDateParts(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function addDaysToLocalDate(
  parts: { year: number; month: number; day: number },
  days: number
) {
  const d = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12, 0, 0));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

export function startOfLocalDayUtc(date: Date, timeZone: string): Date {
  const p = getLocalDateParts(date, timeZone);
  return zonedDateTimeToUtc({ ...p, hour: 0, minute: 0, second: 0 }, timeZone);
}

export function endOfLocalDayUtc(date: Date, timeZone: string): Date {
  const p = getLocalDateParts(date, timeZone);
  return zonedDateTimeToUtc({ ...p, hour: 23, minute: 59, second: 59 }, timeZone);
}

export function calculateSubscriptionEnd(start: Date, tipoVigencia: PlanValidityType, timeZone: string): Date {
  const startLocal = getLocalDateParts(start, timeZone);
  const days = tipoVigencia === "DIARIO" ? 1 : tipoVigencia === "SEMANAL" ? 7 : 30;
  const endLocalDay = addDaysToLocalDate(startLocal, Math.max(days - 1, 0));
  return zonedDateTimeToUtc({ ...endLocalDay, hour: 23, minute: 59, second: 59 }, timeZone);
}

export function getMondayWeekRangeUtc(date: Date, timeZone: string): { start: Date; end: Date } {
  const local = getLocalDateParts(date, timeZone);
  const base = new Date(Date.UTC(local.year, local.month - 1, local.day, 12, 0, 0));
  const dow = base.getUTCDay(); // 0 Sun ... 6 Sat
  const diffToMonday = (dow + 6) % 7;
  const monday = addDaysToLocalDate(local, -diffToMonday);
  const sunday = addDaysToLocalDate(monday, 6);
  return {
    start: zonedDateTimeToUtc({ ...monday, hour: 0, minute: 0, second: 0 }, timeZone),
    end: zonedDateTimeToUtc({ ...sunday, hour: 23, minute: 59, second: 59 }, timeZone),
  };
}

export function isDateWithinInclusive(date: Date, start: Date, end: Date): boolean {
  const t = date.getTime();
  return t >= start.getTime() && t <= end.getTime();
}
