import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

/**
 * Patient scribe — record the consultation, then get a plain-language summary.
 * TODO(phase 6): shares the Soniox streaming module with the clinician recorder.
 */
export default function PatientRecordScreen() {
  return (
    <Screen className="items-center justify-center">
      <View className="items-center gap-2">
        <Text variant="title">Record your visit</Text>
        <Text variant="muted" className="text-center">
          We&apos;ll transcribe it and give you an easy-to-read summary.
        </Text>
      </View>
      <Button label="Start recording" className="mt-8 w-full" disabled />
    </Screen>
  );
}
