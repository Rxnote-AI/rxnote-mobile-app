import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useMarkAllNotificationsRead } from '@/features/notifications/use-mark-all-notifications-read';
import { useMarkNotificationRead } from '@/features/notifications/use-mark-notification-read';
import { useNotifications } from '@/features/notifications/use-notifications';
import { useRespondToAccessRequest } from '@/features/notifications/use-respond-access-request';
import type { AppNotification } from '@/features/notifications/types';
import { timeAgo } from '@/lib/format';
import { rx } from '@/theme/rx';

function iconFor(type: string): { name: keyof typeof Ionicons.glyphMap; tint: string; bg: string } {
  if (type === 'patient_access_request') return { name: 'person-add-outline', tint: rx.accent, bg: rx.accentTint };
  if (type === 'patient_access_approved') return { name: 'checkmark-circle-outline', tint: rx.success, bg: rx.successBg };
  if (type === 'patient_access_denied') return { name: 'close-circle-outline', tint: rx.muted2, bg: rx.hairline };
  if (type.startsWith('template_share')) return { name: 'document-text-outline', tint: rx.accent, bg: rx.accentTint };
  return { name: 'notifications-outline', tint: rx.muted2, bg: rx.hairline };
}

export default function NotificationsScreen() {
  const router = useRouter();
  const toast = useToast();
  const { data, isLoading, refetch, isRefetching } = useNotifications();
  const { mutate: markRead } = useMarkNotificationRead();
  const { mutate: markAllRead, isPending: isMarkingAll } = useMarkAllNotificationsRead();
  const { mutate: respond } = useRespondToAccessRequest();
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const openResource = (n: AppNotification) => {
    if (!n.isRead) markRead(n.id);
    if (n.resourceType === 'patient' && n.resourceId) {
      router.push({ pathname: '/patient/[id]', params: { id: String(n.resourceId) } });
    }
  };

  const respondToRequest = (n: AppNotification, action: 'approved' | 'denied') => {
    const requestId = n.metadata?.requestId;
    if (!requestId || !n.resourceId) return;
    setRespondingId(n.id);
    respond(
      { patientId: n.resourceId, requestId, action },
      {
        onSuccess: () => {
          markRead(n.id);
          toast.show({
            message: action === 'approved' ? 'Access approved' : 'Access denied',
            kind: 'success',
          });
        },
        onSettled: () => setRespondingId(null),
      },
    );
  };

  const renderItem = ({ item }: { item: AppNotification }) => {
    const meta = iconFor(item.type);
    const isAccessRequest = item.type === 'patient_access_request' && !!item.metadata?.requestId && !!item.resourceId;
    const isResponding = respondingId === item.id;

    return (
      <Pressable
        onPress={() => openResource(item)}
        className={
          item.isRead
            ? 'rounded-[16px] border border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80'
            : 'rounded-[16px] border border-rx-accent/30 bg-rx-accent/[0.04] px-4 py-[14px] active:opacity-80'
        }
      >
        <View className="flex-row gap-[11px]">
          <View
            className="h-9 w-9 items-center justify-center rounded-full"
            style={{ backgroundColor: meta.bg }}
          >
            <Ionicons name={meta.name} size={17} color={meta.tint} />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-start justify-between gap-2">
              <Text weight="bold" className="flex-1 text-[13.5px] leading-[19px] text-rx-ink">
                {item.message ?? item.title}
              </Text>
              {!item.isRead ? <View className="mt-1.5 h-[7px] w-[7px] rounded-full bg-rx-accent" /> : null}
            </View>
            <Text weight="medium" className="mt-1 text-[11.5px] text-rx-muted">
              {timeAgo(item.createdAt)}
            </Text>

            {isAccessRequest ? (
              <View className="mt-3 flex-row gap-[8px]">
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    respondToRequest(item, 'denied');
                  }}
                  disabled={isResponding}
                  className="h-9 flex-1 items-center justify-center rounded-full border border-rx-line bg-rx-surface active:opacity-80 disabled:opacity-60"
                >
                  <Text weight="bold" className="text-[12.5px] text-rx-ink2">
                    Deny
                  </Text>
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    respondToRequest(item, 'approved');
                  }}
                  disabled={isResponding}
                  className="h-9 flex-1 items-center justify-center rounded-full bg-rx-accent active:opacity-90 disabled:opacity-60"
                >
                  {isResponding ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text weight="bold" className="text-[12.5px] text-white">
                      Approve
                    </Text>
                  )}
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="text-[16px] text-rx-ink">
          Notifications
        </Text>
        {unreadCount > 0 ? (
          <Pressable
            onPress={() => markAllRead()}
            disabled={isMarkingAll}
            hitSlop={8}
            className="active:opacity-70 disabled:opacity-50"
          >
            <Text weight="bold" className="text-[12.5px] text-rx-accent">
              Mark all read
            </Text>
          </Pressable>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={rx.accent} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => String(n.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="items-center px-8 py-16">
              <Ionicons name="notifications-outline" size={30} color={rx.faint} />
              <Text weight="semibold" className="mt-3 text-center text-[13.5px] text-rx-muted">
                No notifications yet.
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
