import { describe, expect, test } from "bun:test"
import {
  clampPercent,
  flattenStyle,
  mergeStyle,
  mergeStyles,
  px,
  resolveStyle,
  variants,
  type Style,
} from "@/lib/flint/utils.js"

test("mergeStyle keeps the base and overrides the top level", () => {
  expect(mergeStyle({ backgroundColor: "base" }, { backgroundColor: "next" })).toEqual({
    backgroundColor: "next",
  })
})

test("mergeStyle merges hover, active and focusVisible one level deep", () => {
  expect(
    mergeStyle(
      { hover: { opacity: 1, backgroundColor: "base" }, focusVisible: { outlineWidth: 2 } },
      { hover: { backgroundColor: "next" } }
    )
  ).toEqual({
    hover: { opacity: 1, backgroundColor: "next" },
    focusVisible: { outlineWidth: 2 },
  })
})

test("mergeStyle returns whichever side exists", () => {
  const only = { color: "x" }
  expect(mergeStyle(undefined, only)).toEqual(only)
  expect(mergeStyle(only, undefined)).toEqual(only)
  expect(mergeStyle(undefined, undefined)).toBeUndefined()
})

/** A small deterministic PRNG, so a failure reproduces without a seed file. */
function random(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0
    return state / 2 ** 32
  }
}

const COLORS = ["#000000", "#FFFFFF", "#38BDF8", "transparent"]
const pick = <T,>(next: () => number, values: T[]): T => values[Math.floor(next() * values.length)]!

function randomStyle(next: () => number): Style {
  const style: Style = {}
  if (next() < 0.7) style.backgroundColor = pick(next, COLORS)
  if (next() < 0.6) style.color = pick(next, COLORS)
  if (next() < 0.5) style.opacity = Math.round(next() * 100) / 100
  if (next() < 0.4) style.borderWidth = Math.round(next() * 4)
  if (next() < 0.5) style.hover = { backgroundColor: pick(next, COLORS), opacity: Math.round(next() * 10) / 10 }
  if (next() < 0.4) style.active = { opacity: Math.round(next() * 10) / 10 }
  if (next() < 0.4) style.focusVisible = { outlineWidth: Math.round(next() * 3), outlineColor: pick(next, COLORS) }
  return style
}

const STATES = ["hover", "active", "focusVisible"] as const

describe("mergeStyle properties", () => {
  test("does not mutate either input", () => {
    const next = random(1)
    for (let index = 0; index < 100; index++) {
      const base = randomStyle(next)
      const override = randomStyle(next)
      const beforeBase = JSON.stringify(base)
      const beforeOverride = JSON.stringify(override)
      mergeStyle(base, override)
      expect(JSON.stringify(base)).toBe(beforeBase)
      expect(JSON.stringify(override)).toBe(beforeOverride)
    }
  })

  test("top-level keys come from the override, state keys merge", () => {
    const next = random(2)
    for (let index = 0; index < 200; index++) {
      const base = randomStyle(next)
      const override = randomStyle(next)
      const merged = mergeStyle(base, override)!

      for (const [key, value] of Object.entries(override)) {
        if ((STATES as readonly string[]).includes(key)) continue
        expect(merged[key as keyof Style]).toEqual(value)
      }
      for (const key of STATES) {
        const expected = base[key] && override[key] ? { ...base[key], ...override[key] } : override[key] ?? base[key]
        expect(merged[key]).toEqual(expected)
      }
    }
  })

  test("is associative for the styles flint uses", () => {
    const next = random(3)
    for (let index = 0; index < 100; index++) {
      const a = randomStyle(next)
      const b = randomStyle(next)
      const c = randomStyle(next)
      expect(mergeStyle(mergeStyle(a, b), c)).toEqual(mergeStyle(a, mergeStyle(b, c)))
    }
  })
})

test("mergeStyles folds left and skips false and undefined", () => {
  const a: Style = { color: "a", hover: { opacity: 1 } }
  const b: Style = { color: "b", hover: { backgroundColor: "b" } }
  const c: Style = { opacity: 0.5 }
  expect(mergeStyles(a, false, undefined, b, c)).toEqual({
    color: "b",
    opacity: 0.5,
    hover: { opacity: 1, backgroundColor: "b" },
  })
})

test("flattenStyle collapses states, later states winning", () => {
  const style: Style = {
    color: "base",
    opacity: 1,
    hover: { opacity: 0.8, backgroundColor: "hover" },
    active: { opacity: 0.6 },
    focusVisible: { opacity: 0.9, outlineWidth: 2 },
  }
  expect(flattenStyle(style)).toEqual({
    color: "base",
    opacity: 0.9,
    backgroundColor: "hover",
    outlineWidth: 2,
  })
  expect(style.hover).toEqual({ opacity: 0.8, backgroundColor: "hover" })
})

test("clampPercent clamps and survives bad numbers", () => {
  expect(clampPercent(0)).toBe(0)
  expect(clampPercent(50)).toBe(50)
  expect(clampPercent(100)).toBe(100)
  expect(clampPercent(-10)).toBe(0)
  expect(clampPercent(150)).toBe(100)
  expect(clampPercent(3, 8)).toBe(38)
  expect(clampPercent(1, 0)).toBe(1)
  expect(clampPercent(1, -5)).toBe(1)
  expect(clampPercent(1, Number.NaN)).toBe(1)
  expect(clampPercent(Number.NaN)).toBe(0)
  expect(clampPercent(Number.POSITIVE_INFINITY)).toBe(100)
  expect(clampPercent(Number.NEGATIVE_INFINITY)).toBe(0)
})

test("variants returns the first defined match, then the fallback, then throws", () => {
  const table: Record<string, number> = { sm: 1, md: 2 }
  expect(variants({ size: "md", tone: "sm" }, table)).toBe(2)
  expect(variants({ size: undefined, tone: "sm" }, table)).toBe(1)
  expect(variants({ size: "nope", tone: "sm" }, table)).toBe(1)
  expect(variants({ size: "nope" }, table, 9)).toBe(9)
  expect(() => variants({ size: "nope" }, table)).toThrow("no variant matched")
})

test("resolveStyle accepts a value or a function", () => {
  const value = { color: "x" }
  expect(resolveStyle(value, { pressed: true })).toBe(value)
  expect(resolveStyle((state: { pressed: boolean }) => ({ opacity: state.pressed ? 1 : 0 }), { pressed: true })).toEqual({
    opacity: 1,
  })
  expect(resolveStyle(undefined, {})).toBeUndefined()
})

test("px rounds, it does not truncate", () => {
  expect(px(1.4)).toBe(1)
  expect(px(1.5)).toBe(2)
  expect(px(1.6)).toBe(2)
})
