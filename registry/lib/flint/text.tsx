import type { ReactNode } from "react"
import type { Props } from "@gpuix/react"
import { useTheme } from "./theme-provider.js"
import { mergeStyle, type Style } from "./utils.js"
import type { FlintTextSize } from "./theme.js"

export type TextTone = "default" | "muted" | "faint" | "primary" | "destructive" | "onPrimary"
export type TextWeight = "regular" | "medium" | "semibold" | "bold"

export interface TextProps extends Omit<Props, "style" | "children"> {
  children?: ReactNode
  tone?: TextTone
  size?: keyof FlintTextSize
  weight?: TextWeight
  mono?: boolean
  truncate?: boolean
  style?: Style
}

const WEIGHTS: Record<TextWeight, string> = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
}

/**
 * Every piece of text in flint goes through `<Text>`.
 *
 * GPUI does not inherit `color`, so a bare `<text>` paints black and vanishes
 * on a dark surface. This component is the one place that rule is enforced:
 * the tone picks a token, and the caller can still override it with `style`.
 */
export function Text({
  children,
  tone = "default",
  size = "base",
  weight = "regular",
  mono = false,
  truncate = false,
  style,
  ...rest
}: TextProps) {
  const theme = useTheme()

  const toneColor = {
    default: theme.colors.foreground,
    muted: theme.colors.mutedForeground,
    faint: theme.colors.border,
    primary: theme.colors.primary,
    destructive: theme.colors.destructive,
    onPrimary: theme.colors.primaryForeground,
  } satisfies Record<TextTone, string>

  const base: Style = {
    color: toneColor[tone],
    fontSize: theme.text[size],
    fontFamily: mono ? theme.font.mono : theme.font.sans,
    fontWeight: WEIGHTS[weight],
    lineHeight: Math.round(theme.text[size] * theme.leading.normal),
    ...(truncate ? { whiteSpace: "nowrap" as const, textOverflow: "ellipsis" as const, overflow: "hidden" } : {}),
  }

  return (
    <text {...rest} style={mergeStyle(base, style)}>
      {children}
    </text>
  )
}
