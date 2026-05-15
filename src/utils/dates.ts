export function todayStr() {
  return new Date().toISOString().split('T')[0] ?? '';
}

export function offsetDate(dateStr: string, days: number) {
  const date = new Date(`${dateStr}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().split('T')[0] ?? '';
}

export function minutesBetween(start?: string | null, end?: string | null) {
  if (!start || !end) {
    return 0;
  }

  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}
