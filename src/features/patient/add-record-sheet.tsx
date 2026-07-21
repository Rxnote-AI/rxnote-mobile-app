import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useUploadPatientDocument } from '@/features/patient/use-patient-documents';
import { rx } from '@/theme/rx';

/**
 * "Add to records" bottom sheet, opened by the + on the Records tab.
 *
 * Four ways in: dictate a note, camera, photo library, or a file. Uploads go
 * straight from here rather than bouncing through the Documents screen, so the
 * + is a single obvious entry point for everything.
 */
export function AddRecordSheet({
  open,
  onClose,
  profileId,
}: {
  open: boolean;
  onClose: () => void;
  profileId: number | null;
}) {
  const router = useRouter();
  const toast = useToast();
  const { mutate: upload } = useUploadPatientDocument();
  const [busy, setBusy] = useState(false);

  const doUpload = (args: { uri: string; filename: string; mimeType: string }) => {
    if (!profileId) {
      toast.show({ message: 'Pick who this is for first.', kind: 'info' });
      return;
    }
    upload(
      { profileId, ...args },
      { onSuccess: () => toast.show({ message: 'Added to records.', kind: 'success' }) },
    );
  };

  const takePhoto = async () => {
    onClose();
    setBusy(true);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        toast.show({ message: 'Camera access is off. Enable it in Settings.', kind: 'info' });
        return;
      }
      const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
      if (res.canceled || res.assets.length === 0) return;
      const a = res.assets[0];
      doUpload({
        uri: a.uri,
        filename: a.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: a.mimeType ?? 'image/jpeg',
      });
    } finally {
      setBusy(false);
    }
  };

  const pickPhoto = async () => {
    onClose();
    setBusy(true);
    try {
      const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
      if (res.canceled || res.assets.length === 0) return;
      const a = res.assets[0];
      doUpload({
        uri: a.uri,
        filename: a.fileName ?? `photo-${Date.now()}.jpg`,
        mimeType: a.mimeType ?? 'image/jpeg',
      });
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async () => {
    onClose();
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (res.canceled || res.assets.length === 0) return;
      const a = res.assets[0];
      doUpload({ uri: a.uri, filename: a.name, mimeType: a.mimeType ?? 'application/pdf' });
    } finally {
      setBusy(false);
    }
  };

  const dictate = () => {
    onClose();
    router.push({
      pathname: '/patient/record-session',
      params: profileId ? { profileId: String(profileId) } : {},
    });
  };

  return (
    <>
      <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={onClose}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            className="rounded-t-[26px] bg-rx-bg px-5 pb-[34px] pt-[10px]"
          >
            <View className="mx-auto mb-[18px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
            <Text weight="extrabold" className="mb-4 text-[17px] text-rx-ink">
              Add to records
            </Text>

            <Option
              icon="mic-outline"
              tint
              title="Record a note"
              sub="Speak it — we'll write it up"
              onPress={dictate}
            />
            <Option icon="camera-outline" title="Take a photo" sub="Capture a document or result" onPress={takePhoto} />
            <Option icon="image-outline" title="Choose a photo" sub="From your photo library" onPress={pickPhoto} />
            <Option icon="document-attach-outline" title="Attach a file" sub="PDF or image" onPress={pickFile} last />
          </Pressable>
        </Pressable>
      </Modal>

      {busy ? (
        <View className="absolute inset-0 items-center justify-center bg-[rgba(15,15,17,0.25)]">
          <ActivityIndicator color={rx.accent} />
        </View>
      ) : null}
    </>
  );
}

function Option({
  icon,
  title,
  sub,
  onPress,
  tint = false,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
  tint?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-[13px] rounded-[16px] border-[1.5px] border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80 ${last ? '' : 'mb-[10px]'}`}
    >
      <View
        className="h-[38px] w-[38px] items-center justify-center rounded-[11px]"
        style={{ backgroundColor: tint ? rx.accentTint : rx.subtle }}
      >
        <Ionicons name={icon} size={18} color={tint ? rx.accent : rx.muted2} />
      </View>
      <View className="flex-1">
        <Text weight="bold" className="text-[14.5px] text-rx-ink">
          {title}
        </Text>
        <Text weight="medium" className="text-[12px] text-rx-muted">
          {sub}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </Pressable>
  );
}
