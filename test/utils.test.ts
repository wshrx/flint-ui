import { expect, test } from "bun:test"
import { mergeStyle } from "@/lib/flint/utils.js"

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
