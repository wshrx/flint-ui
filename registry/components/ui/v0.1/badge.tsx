import type { ReactNode } from "react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success"

export interface BadgeProps {
  children?: ReactNode
  variant?: BadgeVariant
  /** A small square of colour before the label. */
  dot?: boolean
  style?: Style
}

export function Badge({ children, variant = "default", dot = false, style }: BadgeProps) {
  const theme = useTheme()
  const c = theme.colors

  const variants: Record<BadgeVariant, Style> = {
    default: { backgroundColor: c.primary, borderColor: "transparent", color: c.primaryForeground },
    secondary: { backgroundColor: c.secondary, borderColor: "transparent", color: c.secondaryForeground },
    outline: { backgroundColor: "transparent", borderColor: c.border, color: c.foreground },
    destructive: { backgroundColor: c.destructive, borderColor: "transparent", color: c.destructiveForeground },
    success: { backgroundColor: c.success, borderColor: c.successBorder, color: c.successForeground },
  }

  const foreground = (variants[variant].color as string | undefined) ?? c.foreground

  return (
    <div
      style={mergeStyles(
        {
          display: "flex",
          alignItems: "center",
          gap: 5,
          height: 20,
          paddingLeft: 7,
          paddingRight: 7,
          borderRadius: theme.radius.xs,
          borderWidth: 1,
          borderStyle: "solid",
          alignSelf: "flex-start",
          flexShrink: 0,
          cursor: "default",
          userSelect: "none",
        },
        variants[variant],
        style
      )}
    >
      {dot ? (
        <div
          style={{
            width: 5,
            height: 5,
            borderRadius: theme.radius.full,
            backgroundColor: foreground,
            opacity: 0.85,
          }}
        />
      ) : null}
      <Text size="xs" weight="medium" style={{ color: foreground, lineHeight: 1 }}>
        {children}
      </Text>
    </div>
  )
}
