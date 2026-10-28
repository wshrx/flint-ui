import type { ReactNode } from "react"
import {
  Select as BaseSelect,
  SelectContent as BaseSelectContent,
  SelectGroup as BaseSelectGroup,
  SelectItem as BaseSelectItem,
  SelectLabel as BaseSelectLabel,
  SelectSeparator as BaseSelectSeparator,
  SelectTrigger as BaseSelectTrigger,
  SelectValue as BaseSelectValue,
} from "@gpuix/react"
import type {
  SelectContentProps as BaseSelectContentProps,
  SelectItemProps as BaseSelectItemProps,
  SelectProps,
  SelectTriggerProps as BaseSelectTriggerProps,
} from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type StateStyle, type Style } from "@/lib/flint/utils.js"
import { Icon } from "@/lib/flint/icon.js"
import { Text } from "@/lib/flint/text.js"

export type { SelectProps }
export const Select = BaseSelect
export function SelectGroup({ children, ...rest }: { children?: ReactNode } & Record<string, unknown>) {
  return <BaseSelectGroup {...rest}>{children}</BaseSelectGroup>
}

export interface SelectTriggerProps extends Omit<BaseSelectTriggerProps, "style"> {
  children?: ReactNode
  style?: StateStyle<{ open: boolean; disabled: boolean; placeholder: boolean }>
}

/** The field. Same surface as `<Input>`, with a chevron and an open state. */
export function SelectTrigger({ children, style, ...rest }: SelectTriggerProps) {
  const theme = useTheme()
  const c = theme.colors

  return (
    <BaseSelectTrigger
      {...rest}
      style={(state) =>
        mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            height: 32,
            paddingLeft: 10,
            paddingRight: 8,
            borderRadius: theme.radius.sm,
            borderWidth: 1,
            borderStyle: "solid",
            backgroundColor: c.muted,
            borderColor: state.open ? c.ring : c.input,
            color: state.placeholder ? c.mutedForeground : c.foreground,
            fontSize: theme.text.base,
            fontFamily: theme.font.sans,
            cursor: state.disabled ? "not-allowed" : "pointer",
            opacity: state.disabled ? 0.5 : 1,
            userSelect: "none",
            hover: state.disabled ? {} : { borderColor: c.ring },
            focusVisible: { outlineWidth: 2, outlineColor: c.ring, outlineOffset: 0 },
          },
          typeof style === "function" ? style(state) : style
        )
      }
    >
      {children}
    </BaseSelectTrigger>
  )
}

export interface SelectValueProps {
  placeholder?: ReactNode
  children?: ReactNode
}

export function SelectValue({ placeholder, children }: SelectValueProps) {
  return (
    <BaseSelectValue placeholder={placeholder} style={{ flexGrow: 1, overflow: "hidden" }}>
      {children}
    </BaseSelectValue>
  )
}

export interface SelectContentProps extends Omit<BaseSelectContentProps, "style"> {
  style?: Style
}

/** The menu. Painted above dialogs, below tooltips (base priority 1). */
export function SelectContent({ children, style, ...rest }: SelectContentProps) {
  const theme = useTheme()
  return (
    <BaseSelectContent
      {...rest}
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
      sideOffset={6}
    >
      {children}
    </BaseSelectContent>
  )
}

export interface SelectItemProps extends Omit<BaseSelectItemProps, "style"> {
  children?: ReactNode | ((state: { selected: boolean; highlighted: boolean; disabled: boolean }) => ReactNode)
  style?: StateStyle<{ selected: boolean; highlighted: boolean; disabled: boolean }>
}

export function SelectItem({ children, style, ...rest }: SelectItemProps) {
  const theme = useTheme()
  const c = theme.colors

  return (
    <BaseSelectItem
      {...rest}
      style={(state) =>
        mergeStyles(
          {
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            height: 28,
            paddingLeft: 8,
            paddingRight: 8,
            borderRadius: theme.radius.xs,
            backgroundColor: state.highlighted ? c.accent : "transparent",
            color: state.disabled ? c.mutedForeground : c.foreground,
            fontSize: theme.text.base,
            fontFamily: theme.font.sans,
            cursor: state.disabled ? "not-allowed" : "pointer",
            opacity: state.disabled ? 0.5 : 1,
            userSelect: "none",
          },
          typeof style === "function" ? style(state) : style
        )
      }
    >
      {(state) => (
        <>
          <Text size="base" style={{ color: state.disabled ? c.mutedForeground : c.foreground }}>
            {typeof children === "function" ? children(state) : children}
          </Text>
          {state.selected ? <Icon name="check" size={13} color={c.primary} /> : null}
        </>
      )}
    </BaseSelectItem>
  )
}

export function SelectLabel({ children }: { children?: ReactNode }) {
  const theme = useTheme()
  return (
    <BaseSelectLabel style={{ paddingLeft: 8, paddingTop: 6, paddingBottom: 4 }}>
      <Text size="xs" tone="muted" weight="medium">
        {children}
      </Text>
    </BaseSelectLabel>
  )
}

export function SelectSeparator() {
  const theme = useTheme()
  return <BaseSelectSeparator style={{ height: 1, marginTop: 4, marginBottom: 4, backgroundColor: theme.colors.border }} />
}
