import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface KbdProps {
  /** One key or a chord, already formatted: `K`, `⌘ K`, `Ctrl Shift P`. */
  children: string
  style?: Style
}

/**
 * Kbd.
 *
 * A keyboard hint on a hairline pill, in the mono face so the glyphs line up
 * with the command they describe. One key or one chord per element; a row of
 * separate `Kbd`s reads as a sequence, not as a shortcut.
 */
export function Kbd({ children, style }: KbdProps) {
  const theme = useTheme()

  return (
    <Text
      size="xs"
      mono
      style={mergeStyles(
        {
          paddingLeft: 5,
          paddingRight: 5,
          paddingTop: 1,
          paddingBottom: 1,
          borderRadius: 4,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.muted,
          color: theme.colors.mutedForeground,
        },
        style
      )}
    >
      {children}
    </Text>
  )
}
