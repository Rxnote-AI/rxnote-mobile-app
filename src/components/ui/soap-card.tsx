import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { useUpdateVisitNote } from '@/features/patients/use-update-visit-note';
import { rx } from '@/theme/rx';
import { Text } from './text';

export type SoapSub = { label: string; text: string };
export type SoapSection = { letter: string; title: string; subs: SoapSub[] };

const SECTION_COLORS: Record<string, string> = {
  S: '#f87171',
  O: '#60a5fa',
  A: '#facc15',
  P: '#4ade80',
};

function formatContent(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function ContentLine({ line, isLast }: { line: string; isLast: boolean }) {
  const isBullet = /^[-•●*]\s/.test(line) || /^[-•●*](?=[A-Za-z])/.test(line);
  const isNumbered = /^\d+[.)]\s/.test(line) || /^\d+[.)](?=[A-Za-z])/.test(line);
  const cleanLine = isBullet
    ? line.replace(/^[-•●*]\s*/, '')
    : isNumbered
      ? line.replace(/^\d+[.)]\s*/, '')
      : line;

  if (isBullet || isNumbered) {
    return (
      <View className={`flex-row gap-2 ${isLast ? '' : 'mb-[6px]'}`}>
        <Text weight="medium" className="mt-[1px] text-[13px] text-rx-accent">
          {isBullet ? '•' : line.match(/^\d+/)?.[0] + '.'}
        </Text>
        <Text
          style={{ fontFamily: 'PlusJakartaSans' }}
          className="flex-1 text-[13.5px] leading-[21px] text-rx-ink2"
        >
          {cleanLine}
        </Text>
      </View>
    );
  }

  return (
    <Text
      style={{ fontFamily: 'PlusJakartaSans' }}
      className={`text-[13.5px] leading-[21px] text-rx-ink2 ${isLast ? '' : 'mb-[5px]'}`}
    >
      {line}
    </Text>
  );
}

function SubSection({
  sub,
  edited,
  onPress,
}: {
  sub: SoapSub;
  edited: boolean;
  onPress: () => void;
}) {
  const lines = formatContent(sub.text);

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 rounded-[12px] px-3 py-[10px] active:bg-rx-accent/[0.04]"
    >
      {sub.label ? (
        <View className="mb-[6px] flex-row items-center gap-1.5">
          <Text weight="bold" className="text-[11px] tracking-wide text-rx-label">
            {sub.label}
          </Text>
          {edited ? (
            <Text weight="bold" className="text-[9px] text-rx-accent">
              · edited
            </Text>
          ) : null}
        </View>
      ) : null}
      {lines.map((line, i) => (
        <ContentLine key={i} line={line} isLast={i === lines.length - 1} />
      ))}
    </Pressable>
  );
}

/**
 * Convert edited plain text to the format the web expects:
 * - Lines with bullet prefixes (- or •) → string array (web renders as <ul>)
 * - Otherwise → single string (web renders as <p>)
 */
function textToFieldValue(text: string): string | string[] {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const bulletLines = lines.filter((l) => /^[-•●*]\s?/.test(l));
  if (bulletLines.length > 0 && bulletLines.length >= lines.length * 0.5) {
    return lines.map((l) => l.replace(/^[-•●*]\s*/, '').trim()).filter(Boolean);
  }
  return text.trim();
}

export function SoapSections({
  sections,
  compact = false,
  visitId,
  patientId,
  rawNote,
}: {
  sections: SoapSection[];
  compact?: boolean;
  visitId?: number;
  patientId?: number;
  rawNote?: unknown;
}) {
  const router = useRouter();
  const [edits, setEdits] = useState<Record<string, string>>({});
  const updateNote = useUpdateVisitNote();
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const editsRef = useRef(edits);
  editsRef.current = edits;
  const rawNoteRef = useRef(rawNote);
  rawNoteRef.current = rawNote;

  useEffect(() => {
    (globalThis as any).__soapEditCallback = (si: string, gi: string, text: string) => {
      setEdits((prev) => ({ ...prev, [`${si}-${gi}`]: text }));

      if (visitId && patientId && rawNoteRef.current) {
        try {
          const raw = rawNoteRef.current;
          const noteObj: Record<string, unknown> =
            typeof raw === 'string' ? JSON.parse(raw) : { ...(raw as Record<string, unknown>) };
          const section = sectionsRef.current[Number(si)];
          if (section) {
            const sectionKey = findSectionKey(noteObj, section.title);
            if (sectionKey) {
              const fieldValue = textToFieldValue(text);
              const sectionValue = noteObj[sectionKey];
              if (sectionValue && typeof sectionValue === 'object' && !Array.isArray(sectionValue)) {
                const subKeys = Object.keys(sectionValue as Record<string, unknown>);
                const subKey = subKeys[Number(gi)];
                if (subKey) {
                  (noteObj[sectionKey] as Record<string, unknown>)[subKey] = fieldValue;
                }
              } else {
                noteObj[sectionKey] = fieldValue;
              }
              // Remove cached HTML so web re-renders from updated structure
              delete noteObj._htmlContent;
              updateNote.mutate({
                visitId,
                patientId,
                noteJson: noteObj,
              });
            }
          }
        } catch {
          // Not JSON or parse failed — skip DB save
        }
      }
    };
    return () => {
      delete (globalThis as any).__soapEditCallback;
    };
  }, [visitId, patientId, updateNote]);

  return (
    <View className="gap-[12px]">
      {sections.map((section, si) => {
        const color = SECTION_COLORS[section.letter] ?? rx.accent;
        return (
          <View
            key={section.letter + si}
            className="overflow-hidden rounded-[18px] border border-rx-line bg-rx-surface"
          >
            {/* Section header */}
            <View
              className="flex-row items-center gap-[10px] px-4 py-[14px]"
              style={{ borderBottomWidth: 1, borderBottomColor: '#f0efec' }}
            >
              <View
                className="h-[28px] w-[28px] items-center justify-center rounded-[10px]"
                style={{ backgroundColor: color }}
              >
                <Text weight="extrabold" className="text-[14px] text-white">
                  {section.letter}
                </Text>
              </View>
              <Text weight="extrabold" className="flex-1 text-[15px] text-rx-ink">
                {section.title}
              </Text>
              {!compact ? (
                <Ionicons name="create-outline" size={16} color={rx.faint} />
              ) : null}
            </View>

            {/* Sub-sections */}
            <View className="px-1 py-2">
              {section.subs.map((sub, gi) => {
                const key = `${si}-${gi}`;
                const edited = edits[key] != null;
                const text = edited ? edits[key] : sub.text;
                return (
                  <SubSection
                    key={key}
                    sub={{ ...sub, text }}
                    edited={edited}
                    onPress={() => {
                      router.push({
                        pathname: '/edit-section',
                        params: {
                          sectionTitle: section.title,
                          sectionLetter: section.letter,
                          subLabel: sub.label,
                          content: text,
                          sectionIndex: String(si),
                          subIndex: String(gi),
                        },
                      });
                    }}
                  />
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function findSectionKey(obj: Record<string, unknown>, title: string): string | null {
  const lower = title.toLowerCase();
  for (const key of Object.keys(obj)) {
    if (key.toLowerCase() === lower) return key;
  }
  const map: Record<string, string[]> = {
    subjective: ['subjective', 's'],
    objective: ['objective', 'o'],
    assessment: ['assessment', 'a'],
    plan: ['plan', 'p'],
  };
  for (const [canonical, aliases] of Object.entries(map)) {
    if (aliases.includes(lower) && canonical in obj) return canonical;
  }
  return null;
}
