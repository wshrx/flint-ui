import type { ReactNode } from "react"
import type { Props } from "@gpuix/react"
import { buttonProps } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { useControllableState } from "@/lib/flint/use-controllable.js"

export interface SwitchProps extends Omit<Props, "style" | "onClick" | "onKeyDown" | "onKeyUp"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  children?: ReactNode
  style?: Style
}

/** 34×20 track, 14px thumb, no animation. State is readable at a glance. */
export function Switch({ checked, defaultChecked = false, onCheckedChange, disabled = false, style, ...rest }: SwitchProps) {
  const theme = useTheme()
  const c = theme.colors
  const [isChecked, setChecked] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange })

  const press = buttonProps({ disabled, onClick: () => setChecked(!isChecked) })

  return (
    <div
      {...rest}
      {...press}
      role="switch"
      tabIndex={disabled ? -1 : 0}
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          width: 34,
          height: 20,
          padding: 3,
          flexShrink: 0,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: isChecked ? c.primary : c.input,
          backgroundColor: isChecked ? c.primary : c.muted,
          justifyContent: isChecked ? "flex-end" : "flex-start",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          hover: disabled ? {} : { borderColor: isChecked ? c.primaryHover : c.mutedForeground },
          focusVisible: { outlineWidth: 2, outlineColor: c.ring, outlineOffset: 2 },
        },
        style
      )}
    >
      <div
        style={{
          width: 12,
          height: 12,
          borderRadius: theme.radius.full,
          backgroundColor: isChecked ? c.primaryForeground : c.mutedForeground,
        }}
      />
    </div>
  )
}
