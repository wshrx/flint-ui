import type { ReactNode } from "react"
import { useWindowInsets } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface WindowHeaderProps {
  title?: string
  /** Rendered before the title, usually an icon or a back control. */
  leading?: ReactNode
  /** Rendered at the far right. */
  trailing?: ReactNode
  /**
   * Extra left padding. On macOS with `titlebarTransparent: true`, pass 78 so
   * the content clears the traffic lights; GPUIX does not report that inset.
   */
  leadingInset?: number
  height?: number
  border?: boolean
  style?: Style
}

/**
 * WindowHeader.
 *
 * The in-app strip under the native titlebar: safe-area aware, with slots for a
 * leading control and trailing actions. It is not window chrome: GPUIX 0.11 does
 * not expose window dragging or closing, and Wayland client-side decorations are
 * the compositor's business. Use it under the native titlebar, or on macOS with
 * `titlebarTransparent: true` plus `leadingInset={78}`.
 */
export function WindowHeader({
  title,
  leading,
  trailing,
  leadingInset = 0,
  height = 44,
  border = true,
  style,
}: WindowHeaderProps) {
  const theme = useTheme()
  const insets = useWindowInsets()

  return (
    <div
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          height,
          flexShrink: 0,
          paddingLeft: insets.safeArea.left + leadingInset + 12,
          paddingRight: insets.safeArea.right + 12,
          backgroundColor: theme.colors.background,
          borderBottomWidth: border ? 1 : 0,
          borderStyle: "solid",
          borderColor: theme.colors.border,
        },
        style
      )}
    >
      {leading}
      {title ? (
        <Text size="sm" weight="medium" style={{ flexGrow: 1 }}>
          {title}
        </Text>
      ) : (
        <div style={{ flexGrow: 1 }} />
      )}
      {trailing}
    </div>
  )
}
