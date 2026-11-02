import { forwardRef, useState } from "react"
import type { ForwardRefExoticComponent, ReactNode, RefAttributes } from "react"
import type { PublicInstance, TextareaProps as NativeTextareaProps } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { inputTheme } from "@/lib/flint/theme.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"

export interface TextareaProps extends Omit<NativeTextareaProps, "style"> {
  invalid?: boolean
  style?: Style
  children?: ReactNode
}

/** Same surface as `Input`, but the native editor grows between `minRows` and `maxRows`. */
export const Textarea: ForwardRefExoticComponent<TextareaProps & RefAttributes<PublicInstance>> = forwardRef<PublicInstance, TextareaProps>(function Textarea(
  { style, invalid = false, theme: themeOverride, onFocus, onBlur, minRows = 3, maxRows = 8, ...rest },
  ref
) {
  const theme = useTheme()
  const [focused, setFocused] = useState(false)

  return (
    <div
      style={mergeStyles(
        {
          display: "flex",
          paddingLeft: 10,
          paddingRight: 10,
          paddingTop: 8,
          paddingBottom: 8,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderStyle: "solid",
          backgroundColor: theme.colors.muted,
          borderColor: invalid ? theme.colors.destructive : focused ? theme.colors.ring : theme.colors.input,
          cursor: "text",
        },
        focused && !invalid
          ? { outlineWidth: 2, outlineColor: theme.colors.ring, outlineOffset: 0 }
          : undefined,
        style
      )}
    >
      <textarea
        {...rest}
        ref={ref}
        minRows={minRows}
        maxRows={maxRows}
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
          backgroundColor: "transparent",
          color: theme.colors.foreground,
          fontSize: theme.text.base,
          fontFamily: theme.font.sans,
          lineHeight: Math.round(theme.text.base * theme.leading.normal),
        }}
      />
    </div>
  )
})
