import type { SoapSection } from '@/components/ui/soap-card';

/**
 * Turns a generated / stored SOAP note (structured JSON) into the section-card
 * shape that <SoapSections> renders. The backend returns an object keyed by
 * subjective/objective/assessment/plan (each a string, array, or nested object),
 * plus some metadata keys we skip. Order is S → O → A → P, then any extra sections.
 */

const SECTION_META: Record<string, { letter: string; title: string }> = {
  subjective: { letter: 'S', title: 'Subjective' },
  objective: { letter: 'O', title: 'Objective' },
  assessment: { letter: 'A', title: 'Assessment' },
  plan: { letter: 'P', title: 'Plan' },
};

/** Metadata attached to the note object that isn't clinical content. */
const SKIP = new Set([
  'framework', 'templateid', 'templatename', 'metadata', 'specialty',
  'formatversion', '_templatelabels', '_meta', 'version',
]);

function upperLabel(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toUpperCase();
}

function titleCase(key: string): string {
  const s = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toText(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    const items = value
      .map((v) => (v && typeof v === 'object' ? toText(v) : String(v ?? '')))
      .map((s) => s.trim())
      .filter(Boolean);
    if (items.length === 0) return '';
    if (items.length === 1) return items[0];
    return items
      .map((s) => (/^[-•●*]\s/.test(s) || /^\d+[.)]\s/.test(s) ? s : `- ${s}`))
      .join('\n');
  }
  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => `${upperLabel(k)}: ${toText(v)}`)
      .filter(Boolean)
      .join('\n');
  }
  return String(value);
}

/** Break a section value into labelled sub-lines. */
function subsFrom(value: unknown): SoapSection['subs'] {
  if (value == null) return [];
  if (typeof value === 'object' && !Array.isArray(value)) {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => ({ label: upperLabel(k), text: toText(v) }))
      .filter((s) => s.text);
  }
  const text = toText(value);
  return text ? [{ label: '', text }] : [];
}

export function soapToSections(note: unknown): SoapSection[] {
  if (!note || typeof note !== 'object') return [];
  const obj = note as Record<string, unknown>;

  const known = ['subjective', 'objective', 'assessment', 'plan'].filter((k) => k in obj);
  const extra = Object.keys(obj).filter(
    (k) => !SECTION_META[k] && !SKIP.has(k.toLowerCase()),
  );

  const sections: SoapSection[] = [];
  for (const key of [...known, ...extra]) {
    if (SKIP.has(key.toLowerCase())) continue;
    const subs = subsFrom(obj[key]);
    if (subs.length === 0) continue;
    const meta = SECTION_META[key];
    sections.push({
      letter: meta?.letter ?? key.charAt(0).toUpperCase(),
      title: meta?.title ?? titleCase(key),
      subs,
    });
  }
  return sections;
}

/** Strip HTML tags / markdown / entities so a note reads as clean plain text. */
export function plainText(s: string): string {
  return s
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;|&apos;/gi, '’')
    .replace(/&quot;/gi, '"')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Parse a stored note string (JSON) into sections; falls back to a plain-text block. */
export function parseStoredNote(note: string | null | undefined): SoapSection[] {
  if (!note) return [];
  try {
    const sections = soapToSections(JSON.parse(note));
    if (sections.length > 0) return sections;
  } catch {
    // not JSON — fall through to plain text
  }
  const text = plainText(note);
  return text ? [{ letter: '·', title: 'Note', subs: [{ label: '', text }] }] : [];
}

/** A short, human-readable one-liner for a stored note (for list/summary rows). */
export function noteSummary(note: string | null | undefined, max = 160): string {
  for (const section of parseStoredNote(note)) {
    for (const sub of section.subs) {
      const t = (sub.text || '').replace(/\s+/g, ' ').trim();
      if (t) return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
    }
  }
  return '';
}
