/** Tiny className joiner (no clsx/tailwind-merge dep needed for RN class strings). */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}
