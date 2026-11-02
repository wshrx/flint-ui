import type { Style } from "./utils.js"
import { useTheme } from "./theme-provider.js"
import { ICONS, type IconName } from "./icons/index.js"

export interface IconProps {
  name: IconName
  size?: number
  /** Defaults to the theme foreground. Pass a tone explicitly for muted icons. */
  color?: string
  style?: Style
}

/** A monochrome icon. GPUI tints the whole SVG with `color`. */
export function Icon({ name, size = 15, color, style }: IconProps) {
  const theme = useTheme()
  return (
    <svg
      source={ICONS[name]}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        color: color ?? theme.colors.foreground,
        ...style,
      }}
    />
  )
}
