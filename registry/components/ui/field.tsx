import type { ReactNode } from "react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"
import { Label } from "@/components/ui/label.js"

export interface FieldProps {
  label: string
  /** Shown under the control while there is no error. */
  hint?: string
  /** Replaces the hint. Red, one line. */
  error?: string
  required?: boolean
  disabled?: boolean
  children?: ReactNode
  style?: Style
}

/**
 * Field.
 *
 * The label, the control, the hint and the error are one unit: spacing, the
 * required mark and the order come from here, so two fields side by side line
 * up without a wrapper per row. Errors replace the hint rather than stack under
 * it — two lines of small text under one input is noise.
 */
export function Field({ label, hint, error, required = false, disabled = false, children, style }: FieldProps) {
  const theme = useTheme()

  return (
    <div
      style={mergeStyles(
        { display: "flex", flexDirection: "column", gap: 6, flexGrow: 1, flexBasis: 0, minWidth: 0 },
        style
      )}
    >
      <Label required={required} disabled={disabled}>
        {label}
      </Label>
      {children}
      {error ? (
        <Text size="xs" style={{ color: theme.colors.destructive }}>
          {error}
        </Text>
      ) : hint ? (
        <Text size="xs" tone="muted">
          {hint}
        </Text>
      ) : null}
    </div>
  )
}
