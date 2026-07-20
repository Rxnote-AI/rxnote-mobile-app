import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';

/**
 * Patient document management.
 * TODO(phase 6): expo-camera / expo-image-picker / expo-document-picker capture → upload
 * to storage → chat-with-documents. Patient-owned authorization boundary. See §7.
 */
export default function DocumentsScreen() {
  return (
    <Screen>
      <Text variant="title">Documents</Text>
      <Text variant="muted" className="mt-1">
        Photos, lab results, and files you upload
      </Text>

      <Card className="mt-4">
        <Text variant="muted">No documents yet.</Text>
      </Card>

      <View className="mt-6 gap-3">
        <Button label="Take a photo" variant="outline" disabled />
        <Button label="Upload a file" variant="outline" disabled />
      </View>
    </Screen>
  );
}
