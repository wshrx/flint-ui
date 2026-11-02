import type { ReactNode } from "react"
import type { Props } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface LabelProps extends Omit<Props, "style" | "children"> {
  children?: ReactNode
  /** Draws an accent asterisk after the text. */
  required?: boolean
  disabled?: boolean
  style?: Style
}

/**
 * Label.
 *
 * GPUI has no `for=`, so this is a text node with the right colour and spacing.
 * It never carries the hint itself: the hint goes in a muted `<Text>` under the
 * field, where a screen reader and a user both find it.
 */
export function Label({ children, required = false, disabled = false, style, ...rest }: LabelProps) {
  const theme = useTheme()
  const color = disabled ? theme.colors.mutedForeground : theme.colors.foreground

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 3,
          opacity: disabled ? 0.6 : 1,
        },
        style
      )}
    >
      <Text size="sm" weight="medium" style={{ color }}>
        {children}
      </Text>
      {required ? (
        <Text size="sm" style={{ color: theme.colors.primary }}>
          *
        </Text>
      ) : null}
    </div>
  )
}
