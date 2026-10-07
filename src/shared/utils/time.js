import { DateTime } from 'luxon';

export const LOCAL_ZONE = 'Asia/Colombo';

export function parseUtc(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) || !/Z$|[+-]\d\d:\d\d$/.test(value) ? null : date;
}

export function localDayBounds(reference = new Date()) {
  const start = DateTime.fromJSDate(reference, { zone: LOCAL_ZONE }).startOf('day');
  return { start: start.toUTC().toJSDate(), end: start.plus({ days: 1 }).toUTC().toJSDate() };
}

export function asNumber(value) {
  if (value === null || value === undefined) return value;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

export function asIso(value) {
  return value instanceof Date ? value.toISOString() : value;
}
