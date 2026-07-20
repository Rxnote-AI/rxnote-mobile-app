import { View } from 'react-native';

import { Text } from '@/components/ui/text';

/** camelCase / snake_case → "Title Case" for section labels. */
function humanize(key: string): string {
  const s = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value as object).length === 0;
  return false;
}

function SoapValue({ value, depth }: { value: unknown; depth: number }) {
  if (isEmpty(value)) return null;

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <Text className="leading-6 text-foreground">{String(value)}</Text>;
  }

  if (Array.isArray(value)) {
    return (
      <View className="gap-1.5">
        {value.map((item, i) =>
          item && typeof item === 'object' ? (
            <SoapValue key={i} value={item} depth={depth} />
          ) : (
            <View key={i} className="flex-row gap-2">
              <Text className="leading-6 text-muted-foreground">•</Text>
              <Text className="flex-1 leading-6 text-foreground">{String(item)}</Text>
            </View>
          ),
        )}
      </View>
    );
  }

  // object
  return (
    <View className="gap-3">
      {Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => !isEmpty(v))
        .map(([k, v]) => (
          <View key={k} className="gap-1.5">
            <Text
              className={
                depth === 0
                  ? 'text-base font-semibold text-foreground'
                  : 'text-sm font-semibold text-muted-foreground'
              }
            >
              {humanize(k)}
            </Text>
            <View className={depth === 0 ? '' : 'pl-1'}>
              <SoapValue value={v} depth={depth + 1} />
            </View>
          </View>
        ))}
    </View>
  );
}

/**
 * Renders a SOAP note. The backend stores notes as a structured JSON string
 * (subjective/objective/assessment/plan with nested fields + arrays); we parse it into
 * clean sections. Falls back to plain text if it isn't JSON.
 */
export function SoapNote({ note }: { note: string }) {
  let parsed: unknown = null;
  try {
    parsed = JSON.parse(note);
  } catch {
    parsed = null;
  }

  if (parsed && typeof parsed === 'object') {
    return <SoapValue value={parsed} depth={0} />;
  }
  return <Text className="leading-6 text-foreground">{note.trim()}</Text>;
}
