import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import type { Props } from "@gpuix/react"
import { buttonProps } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { useControllableState } from "@/lib/flint/use-controllable.js"
import { Text } from "@/lib/flint/text.js"

interface TabsContextValue {
  value: string
  setValue: (value: string) => void
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabs(name: string): TabsContextValue {
  const context = useContext(TabsContext)
  if (!context) throw new Error(`flint: ${name} must be used inside <Tabs>`)
  return context
}

export interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  children?: ReactNode
}

export function Tabs({ value, defaultValue = "", onValueChange, children }: TabsProps) {
  const [current, setCurrent] = useControllableState({ value, defaultValue, onChange: onValueChange })
  return <TabsContext.Provider value={{ value: current, setValue: setCurrent }}>{children}</TabsContext.Provider>
}

export interface TabsListProps extends Omit<Props, "style" | "children"> {
  children?: ReactNode
  /** `line` sits on a hairline, `segmented` is a filled track. */
  variant?: "segmented" | "line"
  style?: Style
}

export function TabsList({ children, variant = "segmented", style, ...rest }: TabsListProps) {
  const theme = useTheme()
  return (
    <div
      {...rest}
      role="tablist"
      style={mergeStyles(
        variant === "segmented"
          ? {
              display: "flex",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 2,
              padding: 3,
              borderRadius: theme.radius.sm,
              backgroundColor: theme.colors.muted,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.colors.border,
              alignSelf: "flex-start",
            }
          : {
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 2,
              borderBottomWidth: 1,
              borderColor: theme.colors.border,
              alignSelf: "stretch",
            },
        style
      )}
    >
      {children}
    </div>
  )
}

export interface TabsTriggerProps extends Omit<Props, "style" | "onClick" | "children"> {
  value: string
  children?: ReactNode
  disabled?: boolean
  style?: Style
}

export function TabsTrigger({ value, children, disabled = false, style, ...rest }: TabsTriggerProps) {
  const theme = useTheme()
  const c = theme.colors
  const tabs = useTabs("TabsTrigger")
  const active = tabs.value === value

  return (
    <div
      {...rest}
      {...buttonProps({ disabled, onClick: () => tabs.setValue(value) })}
      role="tab"
      aria-selected={active}
      tabIndex={disabled ? -1 : 0}
      style={mergeStyles(
        {
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: 24,
          paddingLeft: 10,
          paddingRight: 10,
          borderRadius: theme.radius.xs,
          cursor: disabled ? "not-allowed" : "pointer",
          backgroundColor: active ? c.card : "transparent",
          color: active ? c.foreground : c.mutedForeground,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: active ? c.border : "transparent",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none",
          hover: disabled ? {} : { color: active ? c.foreground : c.foreground },
          focusVisible: { outlineWidth: 2, outlineColor: c.ring, outlineOffset: 2 },
        },
        style
      )}
    >
      <Text size="sm" weight={active ? "medium" : "regular"} style={{ color: active ? c.foreground : c.mutedForeground }}>
        {children}
      </Text>
    </div>
  )
}

export interface TabsContentProps extends Omit<Props, "style" | "children"> {
  value: string
  children?: ReactNode
  style?: Style
}

export function TabsContent({ value, children, style, ...rest }: TabsContentProps) {
  const tabs = useTabs("TabsContent")
  if (tabs.value !== value) return null
  return (
    <div {...rest} role="tabpanel" style={mergeStyles({ display: "flex", flexDirection: "column", paddingTop: 12 }, style)}>
      {children}
    </div>
  )
}
