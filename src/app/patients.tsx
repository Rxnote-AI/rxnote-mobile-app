import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/ui/avatar';
import { Badge, RoundIconButton } from '@/components/ui/controls';
import { Text } from '@/components/ui/text';
import type { Patient } from '@/features/patients/types';
import { usePatientsInfinite } from '@/features/patients/use-patients-infinite';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { patientMeta, relativeDay } from '@/lib/format';
import { filterPatients } from '@/lib/patient-search';
import { rx } from '@/theme/rx';

export default function PatientsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [inputValue, setInputValue] = useState('');
  const search = useDebouncedValue(inputValue.trim(), 400);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = usePatientsInfinite(search);

  const serverPatients = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.patients),
    [data],
  );
  const total = data?.pages?.[0]?.pagination.total ?? 0;

  // Client-side instant filter over the loaded pages while the server catches up.
  const patients = useMemo(
    () => filterPatients(serverPatients, inputValue),
    [serverPatients, inputValue],
  );

  const renderItem = ({ item }: { item: Patient }) => (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/patient/[id]', params: { id: String(item.id), name: item.name } })
      }
      className="flex-row items-center gap-3 rounded-[16px] border border-rx-line bg-rx-surface px-[14px] py-3 active:opacity-80"
    >
      <Avatar name={item.name} />
      <View className="min-w-0 flex-1">
        <Text weight="bold" numberOfLines={1} className="text-[14.5px] text-rx-ink">
          {item.name}
        </Text>
        <Text weight="medium" className="text-[12px] text-rx-muted">
          {patientMeta(item.age, item.sex) || 'Patient'}
          {item.lastVisit ? ` · Last visit ${relativeDay(item.lastVisit)}` : ''}
        </Text>
      </View>
      {item.medicalRecordNumber ? <Badge label={item.medicalRecordNumber} /> : null}
      <Ionicons name="chevron-forward" size={14} color={rx.faint} />
    </Pressable>
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-rx-bg">
      {/* Header */}
      <View className="flex-row items-center gap-[14px] px-5 pb-2 pt-2">
        <RoundIconButton name="chevron-back" size={20} onPress={() => router.back()} />
        <Text weight="extrabold" className="flex-1 text-[18px] text-rx-ink">
          Patients
        </Text>
        {total > 0 ? <Badge label={`${total} total`} tone="neutral" /> : null}
      </View>

      {/* Search */}
      <View className="px-5 pb-1 pt-1">
        <View className="flex-row items-center gap-[9px] rounded-[14px] border border-rx-line2 bg-rx-surface px-[14px] py-[11px]">
          <Ionicons name="search" size={17} color="#B7B7B2" />
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Search patients by name, MRN, phone"
            placeholderTextColor="#B7B7B2"
            autoCapitalize="words"
            className="flex-1 text-[14px] text-rx-ink"
            style={{ fontFamily: 'PlusJakartaSans' }}
          />
          {inputValue ? (
            <Pressable onPress={() => setInputValue('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={rx.faint} />
            </Pressable>
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color={rx.accent} />
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(p) => String(p.id)}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View className="h-2" />}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 8,
            paddingBottom: Math.max(insets.bottom, 24),
          }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={isRefetching}
          onRefresh={refetch}
          onEndReachedThreshold={0.4}
          onEndReached={() => {
            // Only auto-paginate the full server list (not while client-filtering).
            if (!inputValue.trim() && hasNextPage && !isFetchingNextPage) fetchNextPage();
          }}
          ListFooterComponent={
            isFetchingNextPage ? (
              <View className="py-5">
                <ActivityIndicator color={rx.accent} />
              </View>
            ) : hasNextPage && !inputValue.trim() ? (
              <Pressable
                onPress={() => fetchNextPage()}
                className="mt-3 items-center rounded-[14px] border border-rx-line bg-rx-surface py-3 active:opacity-80"
              >
                <Text weight="bold" className="text-[13.5px] text-rx-accent">
                  See more
                </Text>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            <View className="items-center px-8 py-16">
              <Ionicons name="people-outline" size={30} color={rx.faint} />
              <Text weight="semibold" className="mt-3 text-center text-[13.5px] text-rx-muted">
                {search ? 'No patients match your search.' : 'No patients yet.'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
