import { create } from 'zustand';

import type { PatientProfileType } from './types';

interface RelationChoice {
  label: string;
  profileType: PatientProfileType;
}

interface ProviderChoice {
  name: string;
  specialty: string;
  clinic: string;
}

interface FormDraftStore {
  relation: RelationChoice | null;
  provider: ProviderChoice | null;
  setRelation: (choice: RelationChoice) => void;
  setProvider: (choice: ProviderChoice) => void;
  clearRelation: () => void;
  clearProvider: () => void;
}

/**
 * Hand-off slots for "pick something on another screen and come back".
 *
 * Passing the choice forward as route params (router.navigate back to the form)
 * MOUNTS A NEW COPY of the form — every useState resets and anything already
 * typed is lost. So the picker writes here and calls router.back(), which
 * returns to the *existing* screen instance with its state intact.
 */
export const useFormDraftStore = create<FormDraftStore>((set) => ({
  relation: null,
  provider: null,
  setRelation: (relation) => set({ relation }),
  setProvider: (provider) => set({ provider }),
  clearRelation: () => set({ relation: null }),
  clearProvider: () => set({ provider: null }),
}));
