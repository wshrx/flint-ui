import type { ReactNode } from "react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"
import { Icon } from "@/lib/flint/icon.js"
import type { IconName } from "@/lib/flint/icons/index.js"

export type AlertTone = "info" | "success" | "destructive" | "neutral"

export interface AlertProps {
  tone?: AlertTone
  title: string
  description?: string
  /** Actions, usually one or two buttons, under the description. */
  children?: ReactNode
  style?: Style
}

const TONES: Record<AlertTone, { icon: IconName }> = {
  info: { icon: "info" },
  success: { icon: "check" },
  destructive: { icon: "alert" },
  neutral: { icon: "circle" },
}

/**
 * Alert.
 *
 * A message in the flow of the page, not a toast. The tone colours one icon and
 * one hairline on the left; the surface stays neutral so three alerts in a row
 * do not turn the window into a traffic light.
 */
export function Alert({ tone = "info", title, description, children, style }: AlertProps) {
  const theme = useTheme()
  const c = theme.colors

  const toneColor: Record<AlertTone, string> = {
    info: c.primary,
    success: c.success,
    destructive: c.destructive,
    neutral: c.mutedForeground,
  }
  const color = toneColor[tone]

  return (
    <div
      role="alert"
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "row",
          gap: 10,
          paddingTop: 12,
          paddingBottom: 12,
          paddingLeft: 12,
          paddingRight: 12,
          borderRadius: theme.radius.md,
          backgroundColor: c.muted,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: c.border,
        },
        style
      )}
    >
      <div
        style={{
          width: 2,
          flexShrink: 0,
          alignSelf: "stretch",
          borderRadius: 2,
          backgroundColor: color,
        }}
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexGrow: 1 }}>
        <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name={TONES[tone].icon} size={14} color={color} />
          <Text weight="medium">{title}</Text>
        </div>
        {description ? (
          <Text size="sm" tone="muted">
            {description}
          </Text>
        ) : null}
        {children ? (
          <div style={{ display: "flex", flexDirection: "row", gap: 8, paddingTop: 4 }}>{children}</div>
        ) : null}
      </div>
    </div>
  )
}
