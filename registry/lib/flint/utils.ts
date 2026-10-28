/**
 * `mergeStyle` is flint's `cn()`.
 *
 * GPUIX styles are objects, so the merge is a spread with one rule that
 * matters: `hover`, `active` and `focusVisible` are merged one level deep.
 * A caller passing `{ backgroundColor }` keeps the component's focus ring;
 * a caller passing `{ hover: { opacity } }` keeps the rest of the hover style.
 */

import type { StyleDesc } from "@gpuix/react"

export type Style = StyleDesc
export type StateStyle<State> = Style | ((state: State) => Style)

const STATE_KEYS = ["hover", "active", "focusVisible"] as const

export function mergeStyle(base?: Style, override?: Style): Style | undefined {
  if (!base) return override
  if (!override) return base
  const merged: Style = { ...base, ...override }
  for (const key of STATE_KEYS) {
    const a = base[key]
    const b = override[key]
    if (a && b) merged[key] = { ...a, ...b }
  }
  return merged
}

/** Merge any number of styles, left to right. `undefined` entries are skipped. */
export function mergeStyles(...styles: Array<Style | undefined | false>): Style {
  let out: Style = {}
  for (const style of styles) {
    if (!style) continue
    out = mergeStyle(out, style) ?? out
  }
  return out
}

export function resolveStyle<State>(style: StateStyle<State> | undefined, state: State): Style | undefined {
  return typeof style === "function" ? style(state) : style
}

/**
 * Pick a value from a variants record, with a `default` fallback. Keeps
 * component signatures readable:
 *
 *   variants({ variant, size }, buttonVariants)
 */
export function variants<Key extends string, Value>(
  selection: Record<string, Key | undefined>,
  table: Record<Key, Value> | Record<string, Value>,
  fallback?: Value
): Value {
  for (const key of Object.keys(selection)) {
    const value = selection[key]
    if (value === undefined) continue
    const hit = (table as Record<string, Value>)[value]
    if (hit !== undefined) return hit
  }
  if (fallback !== undefined) return fallback
  throw new Error(`flint: no variant matched ${JSON.stringify(selection)}`)
}

/** Collapse a style's states into one flat style, for measuring and debugging. */
export function flattenStyle(style: Style): Style {
  return { ...style }
}

export function px(value: number): number {
  return Math.round(value)
}
