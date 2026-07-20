import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

/**
 * Chat with your documents.
 * TODO(phase 6): RAG chat scoped to the patient's own records via the agent API.
 */
export default function PatientChatScreen() {
  return (
    <Screen>
      <Text variant="title">Ask about your records</Text>
      <Card className="mt-4">
        <Text variant="muted">
          Chat with your documents — available once documents upload is wired (phase 6).
        </Text>
      </Card>
    </Screen>
  );
}
