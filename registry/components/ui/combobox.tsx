import type { ComponentProps, ReactNode } from "react"
import {
  Combobox as BaseCombobox,
  ComboboxContent as BaseComboboxContent,
  ComboboxEmpty as BaseComboboxEmpty,
  ComboboxInput as BaseComboboxInput,
  ComboboxItem as BaseComboboxItem,
  ComboboxList as BaseComboboxList,
} from "@gpuix/react"
import type {
  ComboboxInputProps,
  ComboboxItemProps as BaseComboboxItemProps,
  ComboboxItemState,
  ComboboxProps,
} from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { inputTheme } from "@/lib/flint/theme.js"
import { mergeStyles, type StateStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"
import { Icon } from "@/lib/flint/icon.js"

export type { ComboboxProps }
export const Combobox = BaseCombobox

export interface ComboboxInputProps2 extends ComboboxInputProps {
  style?: Style
}

/** The search field. Same surface as `<Input>`, with the native editor inside. */
export function ComboboxInput({ style, theme: themeOverride, ...rest }: ComboboxInputProps2) {
  const theme = useTheme()

  return (
    <BaseComboboxInput
      {...rest}
      theme={{ ...inputTheme(theme), ...themeOverride }}
      style={mergeStyles(
        {
          height: 32,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: theme.radius.sm,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.colors.input,
          backgroundColor: theme.colors.muted,
          color: theme.colors.foreground,
          selectionColor: theme.colors.selection,
          fontSize: theme.text.base,
          fontFamily: theme.font.sans,
        },
        style
      )}
    />
  )
}

type ContentProps = ComponentProps<typeof BaseComboboxContent>
export interface ComboboxContentProps extends Omit<ContentProps, "style"> {
  style?: Style
}

/** The popover surface. Opens below the field unless there is no room. */
export function ComboboxContent({ children, style, ...rest }: ComboboxContentProps) {
  const theme = useTheme()

  return (
    <BaseComboboxContent
      {...rest}
      sideOffset={6}
      style={mergeStyles(
        {
          minWidth: 200,
          maxHeight: 320,
          padding: 4,
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: theme.colors.border,
          backgroundColor: theme.colors.popover,
          boxShadow: theme.shadow.md,
          overflowY: "scroll",
          scrollbarColor: theme.colors.border,
          scrollbarWidth: 6,
        },
        style
      )}
    >
      {children}
    </BaseComboboxContent>
  )
}

type ListProps = ComponentProps<typeof BaseComboboxList>
export interface ComboboxListProps extends Omit<ListProps, "style"> {
  style?: Style
}

export function ComboboxList({ children, style, ...rest }: ComboboxListProps) {
  return (
    <BaseComboboxList
      {...rest}
      style={mergeStyles({ display: "flex", flexDirection: "column", gap: 2, padding: 2 }, style)}
    >
      {children}
    </BaseComboboxList>
  )
}

export interface ComboboxItemProps extends Omit<BaseComboboxItemProps, "children" | "style"> {
  /** The visible label; it is the value unless `value` says otherwise. */
  children: string
  style?: StateStyle<ComboboxItemState>
}

/**
 * One option. The label, the check and the highlight all come from the
 * primitive's state, so a filtered list keeps the same selection.
 */
export function ComboboxItem({ children, style, ...rest }: ComboboxItemProps) {
  const theme = useTheme()
  const c = theme.colors

  return (
    <BaseComboboxItem
      {...rest}
      children={(state) => (
        <>
          <Text size="base" tone={state.disabled ? "muted" : "default"}>
            {children}
          </Text>
          {state.selected ? <Icon name="check" size={13} color={c.primary} /> : null}
        </>
      )}
      style={(state) =>
        mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            height: 30,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: theme.radius.xs,
            fontFamily: theme.font.sans,
            cursor: state.disabled ? "not-allowed" : "pointer",
            opacity: state.disabled ? 0.5 : 1,
            backgroundColor: state.highlighted ? c.accent : "transparent",
            hover: state.disabled ? {} : { backgroundColor: c.accent },
          },
          typeof style === "function" ? style(state) : style
        )
      }
    />
  )
}

export interface ComboboxEmptyProps {
  children?: ReactNode
  style?: Style
}

export function ComboboxEmpty({ children = "Nothing found", style }: ComboboxEmptyProps) {
  return (
    <BaseComboboxEmpty style={mergeStyles({ paddingTop: 10, paddingBottom: 10, paddingLeft: 8, paddingRight: 8 }, style)}>
      <Text size="sm" tone="muted">
        {children}
      </Text>
    </BaseComboboxEmpty>
  )
}
