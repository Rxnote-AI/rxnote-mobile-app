import { create } from 'zustand';

interface SelectedProfileStore {
  profileId: number | null;
  setProfileId: (id: number) => void;
}

/** Shared across the (patient) tabs so switching profiles on Home also scopes Record/Documents/Chat. */
export const useSelectedProfileStore = create<SelectedProfileStore>((set) => ({
  profileId: null,
  setProfileId: (id) => set({ profileId: id }),
}));
