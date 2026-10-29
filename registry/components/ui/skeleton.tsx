import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"

export interface SkeletonProps {
  width?: number | string
  height?: number
  /** Defaults to the small radius; pass `theme.radius.full` for a circle. */
  radius?: number
  style?: Style
}

/**
 * Skeleton.
 *
 * A quiet block in the muted token, sized like the thing it replaces. No
 * shimmer: a loading placeholder that moves competes with the content it is
 * standing in for.
 */
export function Skeleton({ width = "100%", height = 12, radius, style }: SkeletonProps) {
  const theme = useTheme()

  return (
    <div
      aria-hidden="true"
      style={mergeStyle(
        {
          width,
          height,
          flexShrink: 0,
          borderRadius: radius ?? theme.radius.sm,
          backgroundColor: theme.colors.muted,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.colors.border,
        },
        style
      )}
    />
  )
}
