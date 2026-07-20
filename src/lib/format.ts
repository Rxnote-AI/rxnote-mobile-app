/** Small formatting helpers shared across RxScribe screens. */

export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Today" / "Yesterday" / "Apr 2, 2026" — for visit dates. */
export function relativeDay(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const today = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(today) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** Compact patient meta line, e.g. "32 y · Male". */
export function patientMeta(age: number | null | undefined, sex: string | null | undefined): string {
  const parts: string[] = [];
  if (age != null) parts.push(`${age} y`);
  if (sex) parts.push(sex);
  return parts.join(' · ');
}
