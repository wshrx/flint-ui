import type { ReactNode } from "react"
import type { Props } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export type CardVariant = "default" | "inset" | "outline"

export interface CardProps extends Omit<Props, "style" | "children"> {
  children?: ReactNode
  variant?: CardVariant
  style?: Style
}

type SectionProps = Omit<Props, "style" | "children"> & {
  children?: ReactNode
  style?: Style
}

export function Card({ children, variant = "default", style, ...rest }: CardProps) {
  const theme = useTheme()

  const variants: Record<CardVariant, Style> = {
    default: { backgroundColor: theme.colors.card, borderColor: theme.colors.border },
    inset: { backgroundColor: theme.colors.muted, borderColor: "transparent" },
    outline: { backgroundColor: "transparent", borderColor: theme.colors.border },
  }

  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderStyle: "solid",
        },
        variants[variant],
        style
      )}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, style, ...rest }: SectionProps) {
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: 4,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 14,
          paddingBottom: 12,
        },
        style
      )}
    >
      {children}
    </div>
  )
}

export function CardTitle({ children, style, ...rest }: SectionProps) {
  return (
    <Text {...rest} size="md" weight="semibold" style={style}>
      {children}
    </Text>
  )
}

export function CardDescription({ children, style, ...rest }: SectionProps) {
  return (
    <Text {...rest} size="sm" tone="muted" style={style}>
      {children}
    </Text>
  )
}

export function CardContent({ children, style, ...rest }: SectionProps) {
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "column",
          gap: 10,
          paddingLeft: 16,
          paddingRight: 16,
          paddingBottom: 16,
        },
        style
      )}
    >
      {children}
    </div>
  )
}

export function CardFooter({ children, style, ...rest }: SectionProps) {
  const theme = useTheme()
  return (
    <div
      {...rest}
      style={mergeStyles(
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: 8,
          paddingLeft: 16,
          paddingRight: 16,
          paddingTop: 12,
          paddingBottom: 14,
          borderTopWidth: 1,
          borderColor: theme.colors.border,
        },
        style
      )}
    >
      {children}
    </div>
  )
}
