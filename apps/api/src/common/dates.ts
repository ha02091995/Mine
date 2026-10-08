export function utcToday(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function daysTogether(startedOn: Date, now = new Date()): number {
  const start = Date.UTC(
    startedOn.getUTCFullYear(),
    startedOn.getUTCMonth(),
    startedOn.getUTCDate(),
  );
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.floor((today - start) / 86_400_000) + 1;
}

export function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}
