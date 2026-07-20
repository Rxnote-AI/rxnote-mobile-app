/**
 * Representative clinical content for the generated-note experience.
 *
 * The mobile app streams a live transcript (real, via Soniox) but note generation
 * itself runs as a server-side job in the web product and has no mobile endpoint yet.
 * Until that is wired, the Note + Patient-Detail screens render this sample so the UX
 * matches the imported RxScribe design. Patient name / template come from real params.
 */
import type { SoapSection } from '@/components/ui/soap-card';

export const SAMPLE_CHIEF = 'Bilateral pressure-type headache, ongoing 5 days.';

export const SAMPLE_VITALS = [
  { label: 'BP', value: '128/82' },
  { label: 'HR', value: '76' },
  { label: 'TEMP', value: '98.4°' },
];

export const SAMPLE_ICD = '8A80.1 · Tension-type headache';

export const SAMPLE_SOAP: SoapSection[] = [
  {
    letter: 'S',
    title: 'Subjective',
    subs: [
      {
        label: 'HISTORY OF PRESENT ILLNESS',
        text: '32 y/o male presents with a 5-day history of bilateral, pressure-type headache rated 6/10. Worsens with stress, improves with rest.',
      },
      {
        label: 'REVIEW OF SYSTEMS',
        text: 'Denies nausea, photophobia, or aura. No fever, visual changes, or neck stiffness.',
      },
      {
        label: 'PAST MEDICAL HISTORY',
        text: 'Stage-1 hypertension (2023). Appendectomy (2019). Non-smoker.',
      },
      { label: 'ALLERGIES', text: 'Penicillin — moderate (rash).' },
    ],
  },
  {
    letter: 'O',
    title: 'Objective',
    subs: [
      { label: 'VITALS', text: 'BP 128/82 · HR 76 · Temp 98.4°F · RR 14 · SpO₂ 99%.' },
      {
        label: 'EXAMINATION',
        text: 'Alert and oriented. HEENT: no sinus tenderness. Neck: mild bilateral trapezius tension. Neuro: CN II–XII intact, no focal deficits.',
      },
    ],
  },
  {
    letter: 'A',
    title: 'Assessment',
    subs: [
      {
        label: 'PRIMARY',
        text: 'Tension-type headache, likely stress-related. No red-flag features suggesting a secondary cause.',
      },
      { label: 'SECONDARY', text: 'Stage-1 hypertension, stable.' },
    ],
  },
  {
    letter: 'P',
    title: 'Plan',
    subs: [
      { label: 'MEDICATION', text: 'Ibuprofen 400mg PRN for pain. Continue Amlodipine 5mg daily.' },
      { label: 'COUNSELLING', text: 'Stress-management and sleep-hygiene education.' },
      {
        label: 'FOLLOW-UP',
        text: 'Return in 2 weeks, or sooner if new neurological symptoms develop.',
      },
    ],
  },
];

export type TranscriptLine = { who: string; text: string; isDoc: boolean };

export const SAMPLE_TRANSCRIPT: TranscriptLine[] = [
  { who: 'DOCTOR', isDoc: true, text: 'What brings you in today?' },
  { who: 'PATIENT', isDoc: false, text: 'I’ve had a headache for about five days now.' },
  { who: 'DOCTOR', isDoc: true, text: 'Where is the pain, and how would you rate it?' },
  { who: 'PATIENT', isDoc: false, text: 'Both sides, sort of a pressure. Maybe a six out of ten.' },
  { who: 'DOCTOR', isDoc: true, text: 'Any nausea, sensitivity to light, or aura beforehand?' },
  { who: 'PATIENT', isDoc: false, text: 'No, none of that. It’s worse when I’m stressed at work.' },
];

export const SAMPLE_HISTORY = [
  {
    date: 'Today',
    type: 'SOAP',
    code: 'G44.2',
    summary:
      'Tension-type headache, 5 days. Continued Amlodipine, added PRN ibuprofen. Follow-up in 2 weeks.',
  },
  {
    date: 'Apr 2, 2026',
    type: 'SOAP',
    code: 'I10',
    summary:
      'Routine hypertension review. BP 132/85. Reinforced lifestyle measures; medication unchanged.',
  },
  {
    date: 'Feb 18, 2026',
    type: 'SOAP',
    code: 'J06.9',
    summary: 'Acute upper respiratory infection. Symptomatic management advised; recovered fully.',
  },
];
