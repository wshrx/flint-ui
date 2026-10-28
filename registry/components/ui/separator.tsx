import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical"
  /** A label turns the line into `— label —`. Horizontally only. */
  label?: string
  style?: Style
}

/**
 * Separator.
 *
 * One hairline in the border token. A labelled separator is a section break,
 * not a heading: it stays 11 px and never takes the accent colour.
 */
export function Separator({ orientation = "horizontal", label, style }: SeparatorProps) {
  const theme = useTheme()
  const line = { backgroundColor: theme.colors.border, borderRadius: 1 }

  if (label && orientation === "horizontal") {
    return (
      <div
        style={mergeStyle(
          { display: "flex", flexDirection: "row", alignItems: "center", gap: 10, width: "100%" },
          style
        )}
      >
        <div style={{ ...line, flexGrow: 1, height: 1 }} />
        <Text size="xs" tone="muted">
          {label}
        </Text>
        <div style={{ ...line, flexGrow: 1, height: 1 }} />
      </div>
    )
  }

  return (
    <div
      role="separator"
      style={mergeStyle(
        orientation === "vertical"
          ? { ...line, width: 1, alignSelf: "stretch" }
          : { ...line, height: 1, width: "100%" },
        style
      )}
    />
  )
}
