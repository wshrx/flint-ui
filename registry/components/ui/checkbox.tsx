import type { ReactNode } from "react"
import type { Props } from "@gpuix/react"
import { useTheme } from "@/lib/flint/theme-provider.js"
import { mergeStyles, type Style } from "@/lib/flint/utils.js"
import { pressable } from "@/lib/flint/pressable.js"
import { useControllableState } from "@/lib/flint/use-controllable.js"
import { Icon } from "@/lib/flint/icon.js"
import { Text } from "@/lib/flint/text.js"

export interface CheckboxProps extends Omit<Props, "style" | "onClick" | "onKeyDown" | "onKeyUp" | "children"> {
  checked?: boolean
  defaultChecked?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  /** Text next to the box. Clicking it toggles, like a `<label>`. */
  label?: ReactNode
  style?: Style
}

export function Checkbox({
  checked,
  defaultChecked = false,
  onCheckedChange,
  disabled = false,
  label,
  style,
  ...rest
}: CheckboxProps) {
  const theme = useTheme()
  const c = theme.colors
  const [isChecked, setChecked] = useControllableState({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange })

  const press = pressable({
    disabled,
    tabIndex: rest.tabIndex,
    onClick: () => setChecked(!isChecked),
  })

  return (
    <div
      {...rest}
      {...press}
      role="checkbox"
      style={mergeStyles(
        {
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          cursor: disabled ? "not-allowed" : "pointer",
          userSelect: "none",
          opacity: disabled ? 0.5 : 1,
          focusVisible: { outlineWidth: 2, outlineColor: c.ring, outlineOffset: 2 },
        },
        style
      )}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          flexShrink: 0,
          borderRadius: theme.radius.xs,
          borderWidth: 1,
          borderStyle: "solid",
          borderColor: isChecked ? c.primary : c.input,
          backgroundColor: isChecked ? c.primary : "transparent",
          color: c.primaryForeground,
          hover: disabled ? {} : { borderColor: isChecked ? c.primaryHover : c.mutedForeground },
          focusVisible: { outlineWidth: 2, outlineColor: c.ring, outlineOffset: 2 },
        }}
      >
        {isChecked ? <Icon name="check" size={11} color={c.primaryForeground} /> : null}
      </div>
      {label ? <Text size="base">{label}</Text> : null}
    </div>
  )
}
