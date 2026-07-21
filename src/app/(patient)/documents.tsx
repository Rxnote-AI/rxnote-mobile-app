import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useActiveProfile } from '@/features/patient/use-active-profile';
import { usePatientDocuments, useUploadPatientDocument } from '@/features/patient/use-patient-documents';
import { ProfileSwitcher } from '@/features/patient/profile-switcher';
import { relativeDay } from '@/lib/format';
import { rx } from '@/theme/rx';

const TYPE_LABEL: Record<string, string> = {
  lab_result: 'Lab result',
  prescription: 'Prescription',
  imaging: 'Imaging',
  discharge_summary: 'Discharge summary',
  insurance: 'Insurance',
  receipt: 'Receipt',
  photo: 'Photo',
  other: 'Document',
};

export default function DocumentsScreen() {
  const router = useRouter();
  const { profiles, activeProfileId, selectProfile } = useActiveProfile();
  const { data: documents, isLoading } = usePatientDocuments(activeProfileId ?? undefined);
  const { mutate: upload, isPending: isUploading } = useUploadPatientDocument();
  const [busy, setBusy] = useState(false);

  const doUpload = (args: { uri: string; filename: string; mimeType: string }) => {
    if (!activeProfileId) return;
    upload(
      { profileId: activeProfileId, ...args },
      { onError: () => Alert.alert('Upload failed', 'Please try again.') },
    );
  };

  const takePhoto = async () => {
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (res.canceled || res.assets.length === 0) return;
      const asset = res.assets[0];
      doUpload({ uri: asset.uri, filename: asset.fileName ?? `photo-${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || res.assets.length === 0) return;
      const asset = res.assets[0];
      doUpload({ uri: asset.uri, filename: asset.name, mimeType: asset.mimeType ?? 'application/pdf' });
    } finally {
      setBusy(false);
    }
  };

  const working = busy || isUploading;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="px-5 pt-4">
        <Text weight="extrabold" className="mb-1 text-[24px] tracking-tight text-rx-ink">
          Documents
        </Text>
        <Text weight="medium" className="mb-4 text-[13.5px] text-rx-muted">
          Photos, lab results, and files you upload
        </Text>
        <View className="mb-4">
          <ProfileSwitcher profiles={profiles} activeProfileId={activeProfileId} onSelect={selectProfile} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 140 }}>
        {isLoading ? (
          <View className="items-center py-8">
            <ActivityIndicator color={rx.accent} />
          </View>
        ) : !documents || documents.length === 0 ? (
          <Card>
            <Text variant="muted">No documents yet.</Text>
          </Card>
        ) : (
          <View className="gap-[10px]">
            {documents.map((d) => (
              <Pressable
                key={d.id}
                onPress={() => router.push(`/patient/document/${d.id}`)}
                className="flex-row items-center gap-[13px] rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80"
              >
                <View className="h-10 w-10 items-center justify-center rounded-[11px] bg-rx-accent-tint">
                  <Text weight="extrabold" className="text-[10px] text-rx-accent">
                    {(TYPE_LABEL[d.documentType] ?? 'DOC').slice(0, 3).toUpperCase()}
                  </Text>
                </View>
                <View className="min-w-0 flex-1">
                  <Text weight="bold" numberOfLines={1} className="text-[14px] text-rx-ink">
                    {d.title || d.filename}
                  </Text>
                  <Text weight="medium" className="text-[12px] text-rx-muted">
                    {TYPE_LABEL[d.documentType] ?? 'Document'} · {relativeDay(d.createdAt)}
                    {d.status !== 'analysed' ? ' · Not yet analyzed' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={14} color={rx.faint} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      <View className="absolute bottom-0 left-0 right-0 flex-row gap-3 px-5 pb-8 pt-3">
        <Pressable
          onPress={takePhoto}
          disabled={working || !activeProfileId}
          className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] border border-rx-line bg-rx-surface active:opacity-80 disabled:opacity-50"
        >
          <Ionicons name="camera-outline" size={18} color={rx.ink} />
          <Text weight="bold" className="text-[13.5px] text-rx-ink">
            Take a photo
          </Text>
        </Pressable>
        <Pressable
          onPress={pickFile}
          disabled={working || !activeProfileId}
          className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] border border-rx-line bg-rx-surface active:opacity-80 disabled:opacity-50"
        >
          {working ? (
            <ActivityIndicator size="small" color={rx.accent} />
          ) : (
            <>
              <Ionicons name="document-attach-outline" size={18} color={rx.ink} />
              <Text weight="bold" className="text-[13.5px] text-rx-ink">
                Upload a file
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
