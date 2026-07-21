import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, Share, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

/**
 * "Share with your doctor" bottom sheet — the SHARE SHEET in the RxScribe Mobile
 * design (project f5d838c9).
 *
 * "Send directly on RxNote" flips `patient_visits.sharedWithDoctor`; the second
 * option hands off to the OS share sheet.
 */
export function ShareSheet({
  open,
  onClose,
  onSendDirect,
  shareText,
  sending = false,
}: {
  open: boolean;
  onClose: () => void;
  onSendDirect: () => void;
  shareText?: string;
  sending?: boolean;
}) {
  const shareExternally = async () => {
    onClose();
    try {
      await Share.share({ message: shareText ?? 'My visit summary from RxNote' });
    } catch {
      // User dismissed the OS sheet — nothing to do.
    }
  };

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-[rgba(15,15,17,0.42)]" onPress={onClose}>
        <Pressable
          onPress={(e) => e.stopPropagation()}
          className="rounded-t-[26px] bg-rx-bg px-5 pb-[34px] pt-[10px]"
        >
          <View className="mx-auto mb-[18px] h-[5px] w-[38px] rounded-[5px] bg-[#DCDBD6]" />
          <Text weight="extrabold" className="mb-4 text-[17px] text-rx-ink">
            Share with your doctor
          </Text>

          <Option
            icon="checkmark-circle-outline"
            tint
            title={sending ? 'Sending…' : 'Send directly on RxNote'}
            sub="Your doctor gets it instantly in their inbox"
            onPress={onSendDirect}
            disabled={sending}
          />
          <View className="h-[10px]" />
          <Option
            icon="link-outline"
            title="Share a link or PDF"
            sub="Send by email, message, or print it"
            onPress={shareExternally}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Option({
  icon,
  title,
  sub,
  onPress,
  tint = false,
  disabled = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  sub: string;
  onPress: () => void;
  tint?: boolean;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center gap-[13px] rounded-[16px] border-[1.5px] border-rx-line bg-rx-surface px-4 py-[14px] active:opacity-80"
      style={{ opacity: disabled ? 0.6 : 1 }}
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
