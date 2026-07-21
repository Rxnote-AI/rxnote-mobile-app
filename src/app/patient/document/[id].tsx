import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Share, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import type { PatientProfile } from '@/features/patient/types';
import { useDeletePatientDocument, usePatientDocument } from '@/features/patient/use-patient-documents';
import { usePatientProfiles } from '@/features/patient/use-patient-profiles';
import { accentShadow, rx } from '@/theme/rx';

/**
 * Document detail — modelled on the design's record-detail screen (For / Source /
 * Type rows, AI SUMMARY, Share + Delete actions), with a viewer on top.
 *
 * Images render inline via expo-image. PDFs open in the system browser: Android's
 * WebView cannot render PDFs natively, and a presigned S3 URL works fine in the
 * OS viewer — so this avoids pulling in a PDF native dependency.
 */
export default function DocumentDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const documentId = Number(id);

  const { data: doc, isLoading } = usePatientDocument(documentId || null);
  const { data: profiles } = usePatientProfiles();
  const { mutate: deleteDocument, isPending: isDeleting } = useDeletePatientDocument();
  const [imageFailed, setImageFailed] = useState(false);

  const profile = (profiles ?? []).find((p) => p.id === doc?.profileId);
  const isImage = !!doc?.mimeType?.startsWith('image/');
  const isPdf = doc?.mimeType === 'application/pdf';

  const openExternally = async () => {
    if (!doc?.viewUrl) return;
    try {
      await WebBrowser.openBrowserAsync(doc.viewUrl);
    } catch {
      Alert.alert('Could not open', 'This document could not be opened.');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Delete document?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => deleteDocument(documentId, { onSuccess: () => router.back() }),
      },
    ]);
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="mb-3 flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Document
        </Text>
        <View style={{ width: 38 }} />
      </View>

      {isLoading || !doc ? (
        <View className="flex-1 items-center justify-center">
          {isLoading ? (
            <ActivityIndicator color={rx.accent} />
          ) : (
            <Text weight="medium" className="text-[13.5px] text-rx-muted">
              Document not found.
            </Text>
          )}
        </View>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Viewer */}
            <View className="mb-4 overflow-hidden rounded-[20px] border border-rx-line bg-rx-surface">
              {isImage && doc.viewUrl && !imageFailed ? (
                <Image
                  source={{ uri: doc.viewUrl }}
                  style={{ width: '100%', height: 320 }}
                  contentFit="contain"
                  transition={200}
                  onError={() => setImageFailed(true)}
                />
              ) : (
                <Pressable
                  onPress={openExternally}
                  disabled={!doc.viewUrl}
                  className="items-center justify-center px-6 py-12 active:opacity-80"
                >
                  <View className="mb-3 h-16 w-16 items-center justify-center rounded-[18px] bg-rx-accent-tint">
                    <Ionicons name={isPdf ? 'document-text' : 'document'} size={30} color={rx.accent} />
                  </View>
                  <Text weight="bold" className="text-[14.5px] text-rx-ink">
                    {doc.viewUrl ? (isPdf ? 'Open PDF' : 'Open file') : 'Preview unavailable'}
                  </Text>
                  <Text weight="medium" className="mt-1 text-center text-[12px] text-rx-muted">
                    {doc.viewUrl ? 'Opens in your browser' : 'This file has no stored copy'}
                  </Text>
                </Pressable>
              )}
            </View>

            <Text weight="extrabold" className="text-[19px] tracking-tight text-rx-ink">
              {doc.title?.trim() || doc.filename}
            </Text>
            <Text weight="medium" className="mb-4 text-[12.5px] text-rx-muted">
              {[formatDate(doc.documentDate ?? doc.createdAt), formatSize(doc.sizeBytes)]
                .filter(Boolean)
                .join(' · ')}
            </Text>

            {/* For / Source / Type */}
            <View className="mb-[14px] overflow-hidden rounded-[16px] border border-rx-line bg-rx-surface">
              <MetaRow label="For" value={profileLabel(profile)} first />
              <MetaRow label="Source" value="Uploaded by you" />
              <MetaRow label="Type" value={humanType(doc.documentType)} />
            </View>

            {/* AI summary — only once parsing produces one */}
            {doc.summary ? (
              <View className="mb-[18px] rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[15px]">
                <View className="mb-1.5 flex-row items-center gap-2">
                  <Ionicons name="sparkles" size={14} color={rx.accent} />
                  <Text weight="extrabold" className="text-[12px] tracking-[0.3px] text-rx-accent">
                    AI SUMMARY
                  </Text>
                </View>
                <Text className="text-[13.5px] leading-[21px] text-rx-ink3">{doc.summary}</Text>
              </View>
            ) : doc.status === 'pending' ? (
              <View className="mb-[18px] flex-row items-start gap-2.5 rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px]">
                <Ionicons name="time-outline" size={16} color={rx.muted} />
                <Text weight="medium" className="flex-1 text-[12.5px] leading-[19px] text-rx-muted">
                  No summary yet. Document analysis isn&apos;t switched on for this account.
                </Text>
              </View>
            ) : null}
          </ScrollView>

          {/* Actions */}
          <View className="flex-row gap-[11px] px-5 pt-3" style={{ paddingBottom: Math.max(insets.bottom, 24) }}>
            <Pressable
              onPress={() => {
                if (doc.viewUrl) void Share.share({ message: doc.viewUrl });
              }}
              disabled={!doc.viewUrl}
              className="h-[52px] flex-1 flex-row items-center justify-center gap-2 rounded-[16px] bg-rx-accent active:opacity-90"
              style={[accentShadow(), { opacity: doc.viewUrl ? 1 : 0.5 }]}
            >
              <Ionicons name="share-outline" size={16} color={rx.onAccent} />
              <Text weight="bold" className="text-[14.5px] text-white">
                Share
              </Text>
            </Pressable>
            <Pressable
              onPress={openExternally}
              disabled={!doc.viewUrl}
              className="h-[52px] w-14 items-center justify-center rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface active:opacity-80"
            >
              <Ionicons name="download-outline" size={19} color={rx.muted2} />
            </Pressable>
            <Pressable
              onPress={confirmDelete}
              disabled={isDeleting}
              className="h-[52px] w-14 items-center justify-center rounded-[16px] border-[1.5px] border-rx-line2 bg-rx-surface active:opacity-80"
            >
              <Ionicons name="trash-outline" size={19} color={rx.accent} />
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

function MetaRow({ label, value, first = false }: { label: string; value: string; first?: boolean }) {
  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-[13px] ${first ? '' : 'border-t border-rx-hairline'}`}
    >
      <Text weight="semibold" className="w-[74px] text-[12.5px] text-rx-muted">
        {label}
      </Text>
      <Text weight="bold" className="flex-1 text-[13.5px] text-rx-ink">
        {value}
      </Text>
    </View>
  );
}

function profileLabel(profile?: PatientProfile): string {
  if (!profile) return '—';
  return profile.profileType === 'self' ? 'You' : profile.name;
}

function humanType(type: string): string {
  if (!type) return 'Document';
  return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatSize(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
