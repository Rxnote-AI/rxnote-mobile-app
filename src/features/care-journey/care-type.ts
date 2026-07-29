import type { Ionicons } from '@expo/vector-icons';

import type { CareType } from './types';

interface CareTypeMeta {
  label: string;
  dotColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

/** Same five care types + color coding as the web timeline, translated to RN-friendly hex. */
export const CARE_TYPE_META: Record<string, CareTypeMeta> = {
  general: { label: 'General', dotColor: '#C6C6C2', icon: 'document-text-outline' },
  medication: { label: 'Medication', dotColor: '#60A5FA', icon: 'medkit-outline' },
  vitals: { label: 'Vitals', dotColor: '#4ADE80', icon: 'pulse-outline' },
  procedure: { label: 'Procedure', dotColor: '#C084FC', icon: 'cut-outline' },
  observation: { label: 'Observation', dotColor: '#FBBF24', icon: 'eye-outline' },
};

export function careTypeMeta(careType: string | null | undefined): CareTypeMeta {
  return CARE_TYPE_META[careType ?? 'general'] ?? CARE_TYPE_META.general;
}

export { careTypes } from './types';
