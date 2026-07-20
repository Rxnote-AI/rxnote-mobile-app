/** @type {import('tailwindcss').Config} */
// Colors map to CSS variables defined in src/global.css (mirrors web app/globals.css).
// Keep this in sync with src/theme/tokens.ts — the token values live there.
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // RxScribe Mobile design palette (exact hex — mirrors src/theme/rx.ts).
        rx: {
          bg: '#F6F5F3',
          surface: '#FFFFFF',
          ink: '#17181A',
          ink2: '#2A2C31',
          ink3: '#33353B',
          muted: '#8A8D94',
          muted2: '#6B6E76',
          label: '#9A9CA3',
          line: '#ECEBE7',
          line2: '#E4E3DF',
          hairline: '#F2F1ED',
          subtle: '#F2F1ED',
          seg: '#EDECE8',
          accent: '#E5322D',
          'accent-tint': '#FCE7E6',
          'accent-muted': '#D9C6C4',
          success: '#1F9D57',
          'success-bg': '#E6F5EC',
          faint: '#C6C6C2',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px',
      },
      fontFamily: {
        // Plus Jakarta Sans — registered per weight (RN doesn't synthesize weights reliably).
        sans: ['PlusJakartaSans', 'system-ui'],
        'sans-medium': ['PlusJakartaSans-Medium', 'system-ui'],
        'sans-semibold': ['PlusJakartaSans-SemiBold', 'system-ui'],
        'sans-bold': ['PlusJakartaSans-Bold', 'system-ui'],
        'sans-extrabold': ['PlusJakartaSans-ExtraBold', 'system-ui'],
        mono: ['SpaceMono', 'monospace'],
        'mono-bold': ['SpaceMono-Bold', 'monospace'],
        serif: ['Fraunces', 'serif'],
      },
    },
  },
  plugins: [],
};
