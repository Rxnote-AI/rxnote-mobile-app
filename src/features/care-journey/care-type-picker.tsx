import { Pressable, ScrollView, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { careTypeMeta } from './care-type';
import { careTypes } from './types';

/** Horizontal chip row for picking a care type — shared by the record and edit screens. */
export function CareTypePicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {careTypes.map((type) => {
        const meta = careTypeMeta(type);
        const active = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onChange(type)}
            className={
              active
                ? 'flex-row items-center gap-[6px] rounded-full bg-rx-accent px-[13px] py-[8px]'
                : 'flex-row items-center gap-[6px] rounded-full border border-rx-line bg-rx-surface px-[13px] py-[8px]'
            }
          >
            <View className="h-[7px] w-[7px] rounded-full" style={{ backgroundColor: meta.dotColor }} />
            <Text weight="bold" className={active ? 'text-[12.5px] text-white' : 'text-[12.5px] text-rx-ink2'}>
              {meta.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
