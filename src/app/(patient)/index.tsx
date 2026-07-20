import { ScrollView } from 'react-native';

import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

export default function RecordsScreen() {
  return (
    <Screen>
      <Text variant="title">My records</Text>
      <Text variant="muted" className="mt-1">
        Your visit summaries and documents
      </Text>
      <ScrollView className="mt-4" contentContainerClassName="gap-3">
        {/* TODO(phase 6): fetch patient-owned records via useApiClient(). */}
        <Card>
          <Text variant="heading">Nothing here yet</Text>
          <Text variant="muted" className="mt-1">
            Record a visit or upload a document to get started.
          </Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}
