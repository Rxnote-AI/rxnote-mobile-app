import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { Avatar } from '@/components/ui/avatar';
import { Text } from '@/components/ui/text';
import { palette } from '@/theme/tokens';
import type { Patient } from './types';

function formatLastVisit(value: string | null): string {
  if (!value) return 'No visits yet';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return 'No visits yet';
  return `Last visit ${d.toLocaleDateString()}`;
}

export function PatientListItem({
  patient,
  onPress,
}: {
  patient: Patient;
  onPress?: () => void;
}) {
  const meta = [patient.medicalRecordNumber, patient.phone].filter(Boolean).join('  ·  ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 active:opacity-80"
    >
      <Avatar name={patient.name} />
      <View className="flex-1">
        <Text className="font-semibold" numberOfLines={1}>
          {patient.name}
        </Text>
        {meta ? (
          <Text variant="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
        <Text variant="muted">{formatLastVisit(patient.lastVisit)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={palette.light.mutedForeground} />
    </Pressable>
  );
}
