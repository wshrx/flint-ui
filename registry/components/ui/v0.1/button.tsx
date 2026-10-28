import { forwardRef } from "react"
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from "react"
import { Button as HeadlessButton } from "@gpuix/react"
import type { ButtonProps as HeadlessButtonProps, ButtonState, PublicInstance } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type StateStyle, type Style } from "@/lib/flint/utils.js"
import { Icon } from "@/lib/flint/icon.js"

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive" | "link"
export type ButtonSize = "sm" | "md" | "lg" | "icon"

export interface ButtonProps extends Omit<HeadlessButtonProps, "style" | "children"> {
  children?: ReactNode
  variant?: ButtonVariant
  size?: ButtonSize
  /** Keeps the label, blocks presses, dims the surface. No fake spinner. */
  loading?: boolean
  style?: StateStyle<ButtonState>
}

const SIZES: Record<ButtonSize, Style> = {
  sm: { height: 28, paddingLeft: 10, paddingRight: 10, fontSize: 12, gap: 6, borderRadius: 6, lineHeight: 16 },
  md: { height: 32, paddingLeft: 12, paddingRight: 12, fontSize: 13, gap: 6, borderRadius: 6, lineHeight: 18 },
  lg: { height: 38, paddingLeft: 16, paddingRight: 16, fontSize: 14, gap: 8, borderRadius: 8, lineHeight: 20 },
  icon: { width: 32, height: 32, padding: 0, borderRadius: 6 },
}

/**
 * Button.
 *
 * Keyboard behaviour (Enter, Space, Tab, disabled) comes from the headless
 * `Button` in @gpuix/react. flint adds the surface: variants, sizes, focus ring,
 * and the sky accent.
 */
export const Button: ForwardRefExoticComponent<ButtonProps & RefAttributes<PublicInstance>> = forwardRef<PublicInstance, ButtonProps>(function Button(
  { children, variant = "primary", size = "md", loading = false, disabled = false, style, ...rest },
  ref
) {
  const theme = useTheme()
  const c = theme.colors
  const isDisabled = disabled || loading

  const variantStyle: Record<ButtonVariant, Style> = {
    primary: {
      backgroundColor: c.primary,
      color: c.primaryForeground,
      borderColor: "transparent",
      hover: isDisabled ? {} : { backgroundColor: c.primaryHover },
    },
    secondary: {
      backgroundColor: c.secondary,
      color: c.secondaryForeground,
      borderColor: "transparent",
      hover: isDisabled ? {} : { backgroundColor: c.secondaryHover },
    },
    outline: {
      backgroundColor: "transparent",
      color: c.foreground,
      borderColor: c.border,
      hover: isDisabled ? {} : { backgroundColor: c.accent },
    },
    ghost: {
      backgroundColor: "transparent",
      color: c.foreground,
      borderColor: "transparent",
      hover: isDisabled ? {} : { backgroundColor: c.accent },
    },
    destructive: {
      backgroundColor: c.destructive,
      color: c.destructiveForeground,
      borderColor: "transparent",
      hover: isDisabled ? {} : { backgroundColor: c.destructiveHover },
    },
    link: {
      backgroundColor: "transparent",
      color: c.primary,
      borderColor: "transparent",
      paddingLeft: 0,
      paddingRight: 0,
      textDecoration: "underline",
      hover: isDisabled ? {} : { opacity: 0.8 },
    },
  }

  return (
    <HeadlessButton
      {...rest}
      ref={ref as never}
      disabled={isDisabled}
      style={(state) =>
        mergeStyles(
          {
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            gap: 6,
            borderWidth: 1,
            borderStyle: "solid",
            fontFamily: theme.font.sans,
            fontWeight: "500",
            whiteSpace: "nowrap",
            userSelect: "none",
            cursor: isDisabled ? "not-allowed" : "pointer",
            opacity: isDisabled ? 0.5 : 1,
            focusVisible: {
              outlineWidth: 2,
              outlineColor: c.ring,
              outlineOffset: 2,
            },
          },
          SIZES[size],
          variantStyle[variant],
          typeof style === "function" ? style(state) : style
        )
      }
    >
      {loading ? <Icon name="dot" size={10} color={c.primaryForeground} /> : null}
      {children}
    </HeadlessButton>
  )
})
