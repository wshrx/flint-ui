/**
 * WCAG check for every token pair flint actually paints.
 *
 * Run with `bun run contrast`. Text pairs must clear 4.5:1, control edges and
 * focus rings 3:1. The script exits non-zero so CI catches a palette drift.
 */

import { flintDark, flintLight, type FlintTheme } from "../registry/lib/flint/theme.js"

function parse(color: string): [number, number, number] | null {
  const hex = color.trim().replace("#", "")
  if (/^[0-9a-f]{6}$/i.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
  }
  if (/^[0-9a-f]{8}$/i.test(hex)) {
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)]
  }
  return null
}

function luminance([r, g, b]: [number, number, number]): number {
  const channel = (value: number) => {
    const s = value / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

function ratio(a: string, b: string): number {
  const ca = parse(a)
  const cb = parse(b)
  if (!ca || !cb) return Number.NaN
  const la = luminance(ca)
  const lb = luminance(cb)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

type Pair = [label: string, foreground: keyof FlintTheme["colors"], background: keyof FlintTheme["colors"], min: number]

const PAIRS: Pair[] = [
  ["body text", "foreground", "background", 4.5],
  ["body on card", "cardForeground", "card", 4.5],
  ["body on popover", "popoverForeground", "popover", 4.5],
  ["muted text", "mutedForeground", "background", 4.5],
  ["muted text on card", "mutedForeground", "card", 4.5],
  ["muted text on muted", "mutedForeground", "muted", 4.5],
  ["primary label", "primaryForeground", "primary", 4.5],
  ["secondary label", "secondaryForeground", "secondary", 4.5],
  ["destructive label", "destructiveForeground", "destructive", 4.5],
  ["success label", "successForeground", "success", 4.5],
  ["accent label", "accentForeground", "accent", 4.5],
  ["link on background", "primary", "background", 4.5],
  ["input edge", "input", "background", 3],
  ["focus ring", "ring", "background", 3],
  ["border on card", "border", "card", 1],
]

function check(theme: FlintTheme): number {
  let failures = 0
  console.log(`\n${theme.name}`)
  for (const [label, fg, bg, min] of PAIRS) {
    const value = ratio(theme.colors[fg], theme.colors[bg])
    const ok = value >= min
    if (!ok) failures++
    const shown = Number.isNaN(value) ? "n/a" : value.toFixed(2)
    console.log(`${ok ? "ok  " : "FAIL"}  ${label.padEnd(22)} ${shown.padStart(6)}:1  (min ${min})`)
  }
  return failures
}

const failures = check(flintDark) + check(flintLight)

if (failures > 0) {
  console.error(`\n${failures} pair(s) below the floor`)
  process.exit(1)
}

console.log("\nall pairs pass")
