import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import { buttonProps } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { useControllableState } from "@/lib/flint/use-controllable.js"
import { Text } from "@/lib/flint/text.js"
import { Icon } from "@/lib/flint/icon.js"

interface AccordionContextValue {
  open: string | null
  toggle: (value: string) => void
}

const AccordionContext = createContext<AccordionContextValue | null>(null)

export interface AccordionProps {
  /** Controlled open item. */
  value?: string | null
  /** Uncontrolled initial item. */
  defaultValue?: string | null
  onValueChange?: (value: string | null) => void
  children?: ReactNode
  style?: Style
}

/**
 * Accordion.
 *
 * One panel open at a time, no measurement and no animation: a panel that is
 * closed is not rendered, so a tall one costs nothing until it opens. The
 * trigger is a real button from `buttonProps`, so Enter, Space and Tab work
 * without a key handler here.
 */
export function Accordion({ value, defaultValue = null, onValueChange, children, style }: AccordionProps) {
  const theme = useTheme()
  const [current, setCurrent] = useControllableState<string | null>({
    value,
    defaultValue,
    onChange: onValueChange,
  })

  const toggle = (next: string) => setCurrent(current === next ? null : next)

  return (
    <AccordionContext.Provider value={{ open: current, toggle }}>
      <div
        style={mergeStyle(
          {
            display: "flex",
            flexDirection: "column",
            width: "100%",
            borderTopWidth: 1,
            borderStyle: "solid",
            borderColor: theme.colors.border,
          },
          style
        )}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

export interface AccordionItemProps {
  value: string
  title: string
  disabled?: boolean
  children?: ReactNode
}

export function AccordionItem({ value, title, disabled = false, children }: AccordionItemProps) {
  const theme = useTheme()
  const context = useContext(AccordionContext)
  if (!context) throw new Error("AccordionItem must be rendered inside <Accordion>")

  const open = context.open === value

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        borderBottomWidth: 1,
        borderStyle: "solid",
        borderColor: theme.colors.border,
      }}
    >
      <div
        {...buttonProps({ disabled, onClick: () => context.toggle(value) })}
        aria-expanded={open}
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          paddingTop: 12,
          paddingBottom: 12,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          userSelect: "none",
        }}
      >
        <Text weight="medium" style={{ flexGrow: 1 }}>
          {title}
        </Text>
        <Icon
          name={open ? "chevronUp" : "chevronDown"}
          size={14}
          color={theme.colors.mutedForeground}
        />
      </div>
      {open ? (
        <div style={{ paddingBottom: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          {children}
        </div>
      ) : null}
    </div>
  )
}
