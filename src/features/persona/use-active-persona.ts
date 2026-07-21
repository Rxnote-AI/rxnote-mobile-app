import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

export type Persona = 'clinician' | 'patient';

const STORAGE_KEY = 'rxnote.activePersona';

interface ActivePersonaStore {
  /** Explicit user choice. `null` = never switched; fall back to the Clerk metadata role. */
  persona: Persona | null;
  /** False until the stored choice has been read back from SecureStore. */
  hydrated: boolean;
  setPersona: (persona: Persona) => void;
  clearPersona: () => void;
}

/**
 * Which persona the app is currently showing — Airbnb-style host/traveller switching.
 *
 * The two personas are NOT mutually exclusive: one login can own clinician data
 * (patients/visits, scoped by users.id) and a patient account (scoped by
 * patient_accounts.id) at the same time. Clerk metadata only supplies the
 * *initial* persona; after that this explicit choice wins, so switching can
 * never strand someone in the wrong app.
 *
 * Persisted so the choice survives an app restart.
 */
export const useActivePersonaStore = create<ActivePersonaStore>((set) => ({
  persona: null,
  hydrated: false,
  setPersona: (persona) => {
    set({ persona });
    void SecureStore.setItemAsync(STORAGE_KEY, persona).catch(() => {});
  },
  clearPersona: () => {
    set({ persona: null });
    void SecureStore.deleteItemAsync(STORAGE_KEY).catch(() => {});
  },
}));

// Restore the persisted choice once at startup. Failure is non-fatal — we just
// fall back to the Clerk metadata role.
void SecureStore.getItemAsync(STORAGE_KEY)
  .then((stored) => {
    const persona = stored === 'patient' || stored === 'clinician' ? stored : null;
    useActivePersonaStore.setState({ persona, hydrated: true });
  })
  .catch(() => useActivePersonaStore.setState({ hydrated: true }));
