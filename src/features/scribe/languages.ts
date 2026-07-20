/**
 * Consultation languages supported by Soniox (matches the web transcription hook's hints).
 * NOTE: this is the SPOKEN language for transcription — distinct from the app UI, which is
 * English-only. Non-English is transcribed and translated to English, like the web app.
 */
export const SCRIBE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'Tamil' },
  { code: 'hi', label: 'Hindi' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'nl', label: 'Dutch' },
  { code: 'id', label: 'Indonesian' },
] as const;

export type ScribeLanguageCode = (typeof SCRIBE_LANGUAGES)[number]['code'];
