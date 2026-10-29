import { useState } from "react"
import type { ReactNode } from "react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"
import { Icon } from "@/lib/flint/icon.js"

export interface DropzoneProps {
  /** Absolute paths from the OS drop. */
  onFiles?: (paths: string[]) => void
  /** Extensions to accept, e.g. `[".png", ".jpg"]`. Empty accepts everything. */
  accept?: string[]
  disabled?: boolean
  /** Replaces the default heading. */
  label?: string
  hint?: string
  children?: ReactNode
  style?: Style
}

const matches = (path: string, accept: string[]) =>
  accept.length === 0 || accept.some((extension) => path.toLowerCase().endsWith(extension.toLowerCase()))

/**
 * Dropzone.
 *
 * A dashed area that accepts files from the OS. The drop event carries absolute
 * paths; flint does not read or upload them, it only reports the list. Rejected
 * extensions are dropped silently: a drag that ends with nothing is less
 * confusing than a modal that explains a file extension.
 */
export function Dropzone({
  onFiles,
  accept = [],
  disabled = false,
  label = "Drop files here",
  hint,
  children,
  style,
}: DropzoneProps) {
  const theme = useTheme()
  const [active, setActive] = useState(false)

  return (
    <div
      onFileDrop={(event) => {
        if (disabled) return
        setActive(false)
        const paths = (event.paths ?? []).filter((path) => matches(path, accept))
        if (paths.length > 0) onFiles?.(paths)
      }}
      onMouseEnter={() => {
        if (!disabled) setActive(true)
      }}
      onMouseLeave={() => setActive(false)}
      style={mergeStyle(
        {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          paddingTop: 20,
          paddingBottom: 20,
          paddingLeft: 16,
          paddingRight: 16,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: active ? theme.colors.primary : theme.colors.border,
          backgroundColor: active ? theme.colors.accent : theme.colors.muted,
          cursor: disabled ? "not-allowed" : "copy",
          opacity: disabled ? 0.5 : 1,
        },
        style
      )}
    >
      <Icon name="plus" size={16} color={active ? theme.colors.primary : theme.colors.mutedForeground} />
      <Text size="sm" weight="medium">
        {children ?? label}
      </Text>
      {hint ? (
        <Text size="xs" tone="muted">
          {hint}
        </Text>
      ) : null}
    </div>
  )
}
