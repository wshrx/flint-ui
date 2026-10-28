import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface ProgressProps {
  value: number
  /** Defaults to 100. Values above it are clamped. */
  max?: number
  /** Shown above the track, on the left. */
  label?: string
  /** Shown above the track, on the right, as a percentage. */
  showValue?: boolean
  style?: Style
}

/**
 * Progress.
 *
 * A determinate bar in the accent token. No percentage inside the track: at a
 * 6 px height the numerals are unreadable, so the value sits above it and the
 * bar carries the proportion. Reach for the label whenever the number alone
 * would not mean anything.
 */
export function Progress({ value, max = 100, label, showValue = false, style }: ProgressProps) {
  const theme = useTheme()
  const safeMax = max > 0 ? max : 100
  const percent = Math.round(Math.min(Math.max(value / safeMax, 0), 1) * 100)

  return (
    <div style={mergeStyle({ display: "flex", flexDirection: "column", gap: 6, width: "100%" }, style)}>
      {label || showValue ? (
        <Text size="xs" tone="muted">
          {label && showValue ? `${label} — ${percent}%` : label ?? `${percent}%`}
        </Text>
      ) : null}

      <div
        role="progressbar"
        aria-valuetext={`${percent}%`}
        style={{
          height: 6,
          width: "100%",
          overflow: "hidden",
          borderRadius: theme.radius.full,
          backgroundColor: theme.colors.muted,
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${percent}%`,
            borderRadius: theme.radius.full,
            backgroundColor: theme.colors.primary,
          }}
        />
      </div>
    </div>
  )
}
