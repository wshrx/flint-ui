import { buttonProps } from "@gpuix/react"
import type { ButtonBehavior, Props } from "@gpuix/react"

/**
 * `buttonProps` plus a tab index that is always explicit.
 *
 * `buttonProps` leaves `tabIndex` unset when the control is enabled, because
 * the headless button's `renderSlot` fills in 0. A component that spreads the
 * result directly onto a `div` gets no tab stop at all, which made accordion
 * triggers and context-menu items unreachable from the keyboard. Use this
 * helper for every raw pressable element.
 *
 * It lives outside `utils.ts` so the pure style helpers can be imported in a
 * test or a Node process without loading the native GPUIX binding.
 */
export function pressable(behavior: ButtonBehavior = {}): Props & { tabIndex: number } {
  const disabled = behavior.disabled ?? false
  const tabIndex = disabled && !behavior.focusableWhenDisabled ? -1 : behavior.tabIndex ?? 0
  return { ...buttonProps(behavior), tabIndex }
}
