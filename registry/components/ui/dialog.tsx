import type { ReactNode } from "react"
import {
  Dialog as BaseDialog,
  DialogBackdrop,
  DialogClose,
  DialogDescription,
  DialogPopup,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@gpuix/react"
import type { DialogPopupProps, DialogProps } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { Icon } from "@/lib/flint/icon.js"
import { Text } from "@/lib/flint/text.js"

export type { DialogProps }
export { DialogTrigger, DialogClose }
export const Dialog = BaseDialog

export interface DialogContentProps extends Omit<DialogPopupProps, "style"> {
  children?: ReactNode
  /** The X in the corner. Turn off when the dialog has one obvious action. */
  showClose?: boolean
  style?: Style
}

/**
 * Dialog.
 *
 * Portal + backdrop + surface in one component, like shadcn. The base package
 * already centers the layer, traps Tab, restores focus and closes on Escape;
 * flint adds the surface and the close control.
 */
export function DialogContent({ children, showClose = true, style, ...rest }: DialogContentProps) {
  const theme = useTheme()

  return (
    <DialogPortal>
      <DialogBackdrop style={{ backgroundColor: theme.colors.overlay }} />
      <DialogPopup
        {...rest}
        style={mergeStyles(
          {
            position: "relative",
            display: "flex",
            flexDirection: "column",
            width: 420,
            maxWidth: "90%",
            padding: 20,
            gap: 14,
            borderRadius: theme.radius.lg,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: theme.colors.border,
            backgroundColor: theme.colors.popover,
            boxShadow: theme.shadow.lg,
          },
          style
        )}
      >
        {children}
        {showClose ? (
          <DialogClose asChild>
            <div
              aria-label="Close"
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: theme.radius.xs,
                cursor: "pointer",
                color: theme.colors.mutedForeground,
                hover: { backgroundColor: theme.colors.accent, color: theme.colors.foreground },
                focusVisible: { outlineWidth: 2, outlineColor: theme.colors.ring, outlineOffset: 1 },
              }}
            >
              <Icon name="x" size={14} color={theme.colors.mutedForeground} />
            </div>
          </DialogClose>
        ) : null}
      </DialogPopup>
    </DialogPortal>
  )
}

export function DialogHeader({ children }: { children?: ReactNode }) {
  return <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingRight: 24 }}>{children}</div>
}

export function DialogFooter({ children }: { children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, paddingTop: 4 }}>
      {children}
    </div>
  )
}

export function DialogHeading({ children }: { children?: ReactNode }) {
  return <DialogTitle>{<Text size="lg" weight="semibold">{children}</Text>}</DialogTitle>
}

export function DialogBody({ children }: { children?: ReactNode }) {
  return (
    <DialogDescription>
      <Text size="base" tone="muted">
        {children}
      </Text>
    </DialogDescription>
  )
}
