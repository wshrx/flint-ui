import type { ReactNode } from "react"
import { Tooltip as BaseTooltip, TooltipContent as BaseTooltipContent, TooltipTrigger } from "@gpuix/react"
import type { TooltipContentProps as BaseTooltipContentProps, TooltipProps } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export type { TooltipProps }
export { TooltipTrigger }
export const Tooltip = BaseTooltip

export interface TooltipContentProps extends Omit<BaseTooltipContentProps, "style"> {
  children?: ReactNode
  style?: Style
}

/** Inverted surface: foreground fill, background text. One line, no wrapping. */
export function TooltipContent({ children, style, ...rest }: TooltipContentProps) {
  const theme = useTheme()
  return (
    <BaseTooltipContent
      {...rest}
      sideOffset={6}
      align="center"
      style={mergeStyles(
        {
          maxWidth: 280,
          paddingLeft: 9,
          paddingRight: 9,
          paddingTop: 6,
          paddingBottom: 6,
          borderRadius: theme.radius.xs,
          backgroundColor: theme.colors.foreground,
          boxShadow: theme.shadow.md,
        },
        style
      )}
    >
      <Text size="sm" style={{ color: theme.colors.background, lineHeight: Math.round(theme.text.sm * theme.leading.normal) }}>
        {children}
      </Text>
    </BaseTooltipContent>
  )
}
