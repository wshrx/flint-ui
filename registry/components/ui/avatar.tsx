import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface AvatarProps {
  /** File path, data URL or http(s) URL. Without it the initials are painted. */
  src?: string
  /** Full name: the initials come from the first two words. */
  name?: string
  alt?: string
  size?: number
  style?: Style
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase()
  return `${words[0]![0] ?? ""}${words[1]![0] ?? ""}`.toUpperCase()
}

/**
 * Avatar.
 *
 * A square crop in a circle: 32 px by default, the image covers, the fallback
 * paints initials on the muted surface. The fallback is not an error state —
 * most people never upload a photo.
 */
export function Avatar({ src, name = "", alt, size = 32, style }: AvatarProps) {
  const theme = useTheme()

  const frame: Style = {
    width: size,
    height: size,
    flexShrink: 0,
    borderRadius: theme.radius.full,
    overflow: "hidden",
    backgroundColor: theme.colors.muted,
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: theme.colors.border,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }

  if (src) {
    return (
      <img
        src={src}
        alt={alt ?? name}
        objectFit="cover"
        style={mergeStyle(frame, style)}
      />
    )
  }

  return (
    <div style={mergeStyle(frame, style)}>
      <Text size="xs" weight="medium" tone="muted">
        {initials(name)}
      </Text>
    </div>
  )
}
