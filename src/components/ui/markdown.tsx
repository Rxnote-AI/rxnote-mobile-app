import { Linking, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { rx } from '@/theme/rx';

/**
 * Lightweight Markdown renderer for chat replies. Dependency-free (third-party RN
 * markdown libs are shaky on the New Architecture / React 19), covering what the
 * copilot emits: headings, bold/italic, inline + fenced code, bullet/ordered lists,
 * blockquotes, links, and horizontal rules. Unknown syntax degrades to plain text.
 */

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'code'; text: string }
  | { type: 'quote'; text: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: { num: string; text: string }[] }
  | { type: 'hr' };

const HEADING = /^(#{1,6})\s+(.*)$/;
const UL = /^\s*[-*+]\s+(.*)$/;
const OL = /^\s*(\d+)\.\s+(.*)$/;
const HR = /^(-{3,}|\*{3,}|_{3,})$/;
const QUOTE = /^>\s?(.*)$/;
// Ordered so `**bold**` wins over `*italic*` at the same position.
const INLINE = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;

function parseBlocks(src: string): Block[] {
  const lines = src.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i++]);
      i++; // closing fence
      blocks.push({ type: 'code', text: body.join('\n') });
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (HR.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    const heading = line.match(HEADING);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }

    if (UL.test(line)) {
      const items: string[] = [];
      while (i < lines.length && UL.test(lines[i])) items.push(lines[i++].match(UL)![1]);
      blocks.push({ type: 'ul', items });
      continue;
    }

    if (OL.test(line)) {
      const items: { num: string; text: string }[] = [];
      while (i < lines.length && OL.test(lines[i])) {
        const m = lines[i++].match(OL)!;
        items.push({ num: m[1], text: m[2] });
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    if (QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(lines[i++].match(QUOTE)![1]);
      blocks.push({ type: 'quote', text: body.join(' ') });
      continue;
    }

    // Paragraph: gather consecutive plain lines.
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('```') &&
      !HEADING.test(lines[i]) &&
      !UL.test(lines[i]) &&
      !OL.test(lines[i]) &&
      !QUOTE.test(lines[i]) &&
      !HR.test(lines[i].trim())
    ) {
      para.push(lines[i++]);
    }
    blocks.push({ type: 'paragraph', text: para.join(' ') });
  }

  return blocks;
}

/** Render inline spans (bold / italic / code / link) inside a line of text. */
function Inline({ text, color, size }: { text: string; color: string; size: number }) {
  const parts = text.split(INLINE).filter((p) => p !== '' && p !== undefined);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <Text key={idx} weight="bold" style={{ color, fontSize: size }}>
              {part.slice(2, -2)}
            </Text>
          );
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <Text key={idx} style={{ color, fontSize: size, fontStyle: 'italic' }}>
              {part.slice(1, -1)}
            </Text>
          );
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return (
            <Text
              key={idx}
              style={{ color: rx.ink, fontSize: size - 1, fontFamily: 'SpaceMono', backgroundColor: rx.subtle }}
            >
              {` ${part.slice(1, -1)} `}
            </Text>
          );
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          return (
            <Text
              key={idx}
              onPress={() => Linking.openURL(link[2]).catch(() => {})}
              style={{ color: rx.accent, fontSize: size, textDecorationLine: 'underline' }}
            >
              {link[1]}
            </Text>
          );
        }
        return (
          <Text key={idx} style={{ color, fontSize: size }}>
            {part}
          </Text>
        );
      })}
    </>
  );
}

interface Props {
  content: string;
  /** Base body color (defaults to card body ink). */
  color?: string;
  /** Base font size in px. */
  size?: number;
}

export function Markdown({ content, color = rx.ink2, size = 13.5 }: Props) {
  const blocks = parseBlocks(content);
  const lineHeight = Math.round(size * 1.42);

  return (
    <View>
      {blocks.map((b, i) => {
        const spacing = i === 0 ? undefined : { marginTop: 8 };
        switch (b.type) {
          case 'heading': {
            const hSize = b.level <= 1 ? size + 4 : b.level === 2 ? size + 2 : size + 1;
            return (
              <Text
                key={i}
                weight="extrabold"
                style={{ color: rx.ink, fontSize: hSize, lineHeight: hSize + 6, ...spacing }}
              >
                <Inline text={b.text} color={rx.ink} size={hSize} />
              </Text>
            );
          }
          case 'code':
            return (
              <View
                key={i}
                className="rounded-[10px] border border-rx-line bg-rx-subtle px-3 py-2.5"
                style={spacing}
              >
                <Text style={{ color: rx.ink, fontSize: size - 1, fontFamily: 'SpaceMono', lineHeight: lineHeight }}>
                  {b.text}
                </Text>
              </View>
            );
          case 'quote':
            return (
              <View key={i} className="border-l-[3px] border-rx-line2 pl-3" style={spacing}>
                <Text style={{ color: rx.muted2, fontSize: size, lineHeight }}>
                  <Inline text={b.text} color={rx.muted2} size={size} />
                </Text>
              </View>
            );
          case 'hr':
            return <View key={i} className="h-px bg-rx-line" style={{ marginVertical: 10 }} />;
          case 'ul':
            return (
              <View key={i} style={spacing}>
                {b.items.map((it, j) => (
                  <View key={j} className="mb-1 flex-row">
                    <Text style={{ color, fontSize: size, lineHeight }}>{'•  '}</Text>
                    <Text style={{ flex: 1, color, fontSize: size, lineHeight }}>
                      <Inline text={it} color={color} size={size} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          case 'ol':
            return (
              <View key={i} style={spacing}>
                {b.items.map((it, j) => (
                  <View key={j} className="mb-1 flex-row">
                    <Text weight="semibold" style={{ color, fontSize: size, lineHeight }}>{`${it.num}.  `}</Text>
                    <Text style={{ flex: 1, color, fontSize: size, lineHeight }}>
                      <Inline text={it.text} color={color} size={size} />
                    </Text>
                  </View>
                ))}
              </View>
            );
          default:
            return (
              <Text key={i} style={{ color, fontSize: size, lineHeight, ...spacing }}>
                <Inline text={b.text} color={color} size={size} />
              </Text>
            );
        }
      })}
    </View>
  );
}
