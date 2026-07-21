import { Ionicons } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

export type ToastKind = 'error' | 'success' | 'info';

interface ToastPayload {
  message: string;
  kind?: ToastKind;
  /** Optional detail shown under the message (e.g. a server reason). */
  detail?: string;
}

interface ToastContextValue {
  show: (payload: ToastPayload | string) => void;
}

const ToastContext = createContext<ToastContextValue>({ show: () => {} });

/** Fire a toast from anywhere inside the provider. */
export function useToast() {
  return useContext(ToastContext);
}

let externalShow: ((payload: ToastPayload | string) => void) | null = null;

/**
 * Fire a toast from OUTSIDE React (e.g. the React Query global error handlers,
 * which live in a module, not a component). No-ops until the provider mounts.
 */
export function showToast(payload: ToastPayload | string) {
  externalShow?.(payload);
}

const VISIBLE_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-16)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: -16, duration: 180, useNativeDriver: true }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const show = useCallback(
    (payload: ToastPayload | string) => {
      const next = typeof payload === 'string' ? { message: payload } : payload;
      setToast(next);
      if (timer.current) clearTimeout(timer.current);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9 }),
      ]).start();
      timer.current = setTimeout(hide, VISIBLE_MS);
    },
    [opacity, translateY, hide],
  );

  // Bridge for non-React callers.
  useEffect(() => {
    externalShow = show;
    return () => {
      externalShow = null;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [show]);

  const value = useMemo(() => ({ show }), [show]);
  const kind = toast?.kind ?? 'error';

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="box-none"
          style={{
            position: 'absolute',
            top: insets.top + 8,
            left: 16,
            right: 16,
            opacity,
            transform: [{ translateY }],
            zIndex: 999,
          }}
        >
          <Pressable
            onPress={hide}
            className="flex-row items-start gap-3 rounded-[16px] border px-4 py-[13px]"
            style={{
              backgroundColor: rx.surface,
              borderColor: kind === 'error' ? rx.accentMuted : rx.line,
              shadowColor: '#000',
              shadowOpacity: 0.14,
              shadowRadius: 18,
              shadowOffset: { width: 0, height: 8 },
              elevation: 8,
            }}
          >
            <Ionicons name={iconFor(kind)} size={18} color={colorFor(kind)} style={{ marginTop: 1 }} />
            <View className="flex-1">
              <Text weight="bold" className="text-[13.5px] leading-[19px] text-rx-ink">
                {toast.message}
              </Text>
              {toast.detail ? (
                <Text weight="medium" className="mt-0.5 text-[12px] leading-[17px] text-rx-muted">
                  {toast.detail}
                </Text>
              ) : null}
            </View>
            <Ionicons name="close" size={16} color={rx.faint} style={{ marginTop: 2 }} />
          </Pressable>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

function iconFor(kind: ToastKind): keyof typeof Ionicons.glyphMap {
  if (kind === 'success') return 'checkmark-circle';
  if (kind === 'info') return 'information-circle';
  return 'alert-circle';
}

function colorFor(kind: ToastKind): string {
  if (kind === 'success') return rx.success;
  if (kind === 'info') return rx.muted2;
  return rx.accent;
}
