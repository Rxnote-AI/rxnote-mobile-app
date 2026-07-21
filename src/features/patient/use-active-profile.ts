import { useEffect } from 'react';

import { usePatientProfiles } from './use-patient-profiles';
import { useSelectedProfileStore } from './use-selected-profile';

/** Profile list + the currently-selected one, defaulting to "self" on first load. */
export function useActiveProfile() {
  const { data: profiles, isLoading } = usePatientProfiles();
  const profileId = useSelectedProfileStore((s) => s.profileId);
  const setProfileId = useSelectedProfileStore((s) => s.setProfileId);

  useEffect(() => {
    if (profileId != null || !profiles || profiles.length === 0) return;
    const self = profiles.find((p) => p.profileType === 'self') ?? profiles[0];
    setProfileId(self.id);
  }, [profileId, profiles, setProfileId]);

  const activeProfile = profiles?.find((p) => p.id === profileId) ?? profiles?.[0] ?? null;

  return {
    profiles: profiles ?? [],
    activeProfile,
    activeProfileId: activeProfile?.id ?? null,
    selectProfile: setProfileId,
    isLoading,
  };
}
