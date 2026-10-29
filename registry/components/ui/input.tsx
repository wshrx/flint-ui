import { forwardRef, useState } from "react"
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from "react"
import type { InputProps as NativeInputProps, PublicInstance } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { inputTheme } from "@/lib/flint/theme.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"

export interface InputProps extends Omit<NativeInputProps, "style"> {
  /** Red hairline plus a red focus ring. Pair with a message, not instead of it. */
  invalid?: boolean
  /** Leading adornment, usually an `<Icon>`. */
  leading?: ReactNode
  /** Trailing adornment, usually a `<Button variant="ghost" size="icon">`. */
  trailing?: ReactNode
  style?: Style
}

/**
 * Input.
 *
 * The border and the focus ring live on a wrapper, not on the native editor:
 * GPUI draws its own text box, and owning the surface here is what makes the
 * padding, the ring and the invalid state line up with every other control.
 */
export const Input: ForwardRefExoticComponent<InputProps & RefAttributes<PublicInstance>> = forwardRef<PublicInstance, InputProps>(function Input(
  { style, invalid = false, leading, trailing, theme: themeOverride, onFocus, onBlur, ...rest },
  ref
) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <div
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          height: 32,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderStyle: "solid",
          backgroundColor: theme.colors.muted,
          borderColor: invalid ? theme.colors.destructive : focused ? theme.colors.ring : theme.colors.input,
          cursor: "text",
        },
        focused && !invalid
          ? { outlineWidth: 2, outlineColor: theme.colors.ring, outlineOffset: 0, borderColor: theme.colors.ring }
          : undefined,
        style
      )}
    >
      {leading}
      <input
        {...rest}
        ref={ref}
        theme={{ ...inputTheme(theme), ...themeOverride }}
        onFocus={(event) => {
          setFocused(true)
          onFocus?.(event)
        }}
        onBlur={(event) => {
          setFocused(false)
          onBlur?.(event)
        }}
        style={{
          flexGrow: 1,
          minWidth: 0,
          height: "100%",
          backgroundColor: "transparent",
          color: theme.colors.foreground,
          selectionColor: theme.colors.selection,
          fontSize: theme.text.base,
          fontFamily: theme.font.sans,
        }}
      />
      {trailing}
    </div>
  )
})
