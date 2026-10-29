import { createContext, useContext, useState } from "react"
import type { ReactNode } from "react"
import { buttonProps, DismissableLayer, useWindowSize } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyle, type Style } from "@/lib/flint/utils.js"
import { Text } from "@/lib/flint/text.js"

export interface ContextMenuItem {
  label: string
  onSelect?: () => void
  disabled?: boolean
  /** Renders the label in the destructive colour. */
  danger?: boolean
}

interface MenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

interface ContextValue {
  open: (x: number, y: number, items: ContextMenuItem[]) => void
}

const Context = createContext<ContextValue | null>(null)

export interface ContextMenuProviderProps {
  children?: ReactNode
}

/**
 * Owns the layer where context menus are painted. Mount it once, next to the
 * theme provider. The menu is placed in window coordinates, so it is not
 * clipped by the row or the scroll container that opened it.
 */
export function ContextMenuProvider({ children }: ContextMenuProviderProps) {
  const theme = useTheme()
  const size = useWindowSize()
  const [menu, setMenu] = useState<MenuState | null>(null)

  const close = () => setMenu(null)
  const panelWidth = 220
  const itemHeight = 30
  const padding = 8
  const height = menu ? menu.items.length * itemHeight + padding * 2 : 0
  const left = menu ? Math.max(8, Math.min(menu.x, size.width - panelWidth - 8)) : 0
  const top = menu ? Math.max(8, Math.min(menu.y, size.height - height - 8)) : 0

  return (
    <Context.Provider value={{ open: (x, y, items) => setMenu({ x, y, items }) }}>
      {children}
      {menu ? (
        <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "none" }}>
          <div onClick={close} style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0, pointerEvents: "auto" }} />
          <div
            style={mergeStyle({
              position: "absolute",
              left,
              top,
              width: panelWidth,
              padding: padding,
              borderRadius: theme.radius.md,
              borderWidth: 1,
              borderStyle: "solid",
              borderColor: theme.colors.border,
              backgroundColor: theme.colors.popover,
              boxShadow: theme.shadow.md,
              pointerEvents: "auto",
            })}
          >
            <DismissableLayer onEscapeKeyDown={close}>
              {menu.items.map((item, index) => (
                <div
                  key={`${item.label}-${index}`}
                  {...buttonProps({
                    disabled: item.disabled,
                    onClick: () => {
                      close()
                      item.onSelect?.()
                    },
                  })}
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    height: itemHeight,
                    paddingLeft: 8,
                    paddingRight: 8,
                    borderRadius: theme.radius.xs,
                    cursor: item.disabled ? "not-allowed" : "pointer",
                    opacity: item.disabled ? 0.5 : 1,
                    hover: item.disabled ? {} : { backgroundColor: theme.colors.accent },
                  }}
                >
                  <Text size="base" tone={item.disabled ? "muted" : item.danger ? "destructive" : "default"}>
                    {item.label}
                  </Text>
                </div>
              ))}
            </DismissableLayer>
          </div>
        </div>
      ) : null}
    </Context.Provider>
  )
}

export interface ContextMenuProps {
  items: ContextMenuItem[]
  disabled?: boolean
  children?: ReactNode
  style?: Style
}

/**
 * Right-click area. Opens the provider's menu at the cursor, which is why the
 * provider has to be mounted once at the root of the app.
 */
export function ContextMenu({ items, disabled = false, children, style }: ContextMenuProps) {
  const context = useContext(Context)
  if (!context) throw new Error("ContextMenu must be rendered inside <ContextMenuProvider>")

  return (
    <div
      onAuxClick={(event) => {
        if (disabled || !event.isRightClick) return
        context.open(event.x ?? 0, event.y ?? 0, items)
      }}
      style={style}
    >
      {children}
    </div>
  )
}
