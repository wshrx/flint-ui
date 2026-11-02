import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { ICONS, ICON_NAMES } from "@/lib/flint/icons/index.js"
import { FLINT_FONT_FILES } from "@/lib/flint/fonts.js"
import { flintDark, flintLight, flintTheme, inputTheme } from "@/lib/flint/theme.js"

const root = join(import.meta.dir, "..")

describe("tokens", () => {
  test("dark and light describe the same surface", () => {
    const keys = (value: object) => Object.keys(value).sort()
    expect(keys(flintLight)).toEqual(keys(flintDark))
    expect(keys(flintLight.colors)).toEqual(keys(flintDark.colors))
    expect(keys(flintLight.radius)).toEqual(keys(flintDark.radius))
    expect(keys(flintLight.font)).toEqual(keys(flintDark.font))
    expect(keys(flintLight.text)).toEqual(keys(flintDark.text))
    expect(keys(flintLight.leading)).toEqual(keys(flintDark.leading))
    expect(keys(flintLight.shadow)).toEqual(keys(flintDark.shadow))
  })

  test("every colour is a hex literal", () => {
    for (const theme of [flintDark, flintLight]) {
      for (const [name, value] of Object.entries(theme.colors)) {
        expect(value, `${theme.name}.${name}`).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/i)
      }
      for (const shadows of Object.values(theme.shadow)) {
        for (const shadow of shadows) expect(shadow.color).toMatch(/^#[0-9A-F]{6}([0-9A-F]{2})?$/i)
      }
    }
  })

  test("the type scale and radius scale ascend", () => {
    const values = Object.values(flintDark.text)
    expect(values).toEqual([...values].sort((a, b) => a - b))
    const radius = Object.values(flintDark.radius)
    expect(radius).toEqual([...radius].sort((a, b) => a - b))
  })

  test("the default theme is dark", () => {
    expect(flintTheme).toBe(flintDark)
    expect(flintTheme.name).toBe("dark")
    expect(flintTheme.appearance).toBe("dark")
  })

  test("inputTheme maps the native editor keys", () => {
    expect(inputTheme(flintDark)).toEqual({
      appearance: "dark",
      bg: flintDark.colors.muted,
      text: flintDark.colors.foreground,
      textMuted: flintDark.colors.mutedForeground,
      border: flintDark.colors.input,
      caret: flintDark.colors.caret,
      accent: flintDark.colors.primary,
      fontSans: flintDark.font.sans,
      fontMono: flintDark.font.mono,
    })
  })

})

describe("icons", () => {
  test("names are unique and every icon is an svg document", () => {
    expect(new Set(ICON_NAMES).size).toBe(ICON_NAMES.length)
    expect(ICON_NAMES.length).toBe(Object.keys(ICONS).length)
    for (const name of ICON_NAMES) {
      const source = ICONS[name]
      expect(source.startsWith('<svg xmlns="http://www.w3.org/2000/svg"'), name).toBe(true)
      expect(source.endsWith("</svg>"), name).toBe(true)
    }
  })
})

describe("fonts", () => {
  test("every advertised file ships in the registry", () => {
    expect(FLINT_FONT_FILES.length).toBe(6)
    for (const file of FLINT_FONT_FILES) {
      expect(file).toMatch(/^Medeo(Sans|Mono)-[A-Za-z]+\.ttf$/)
      expect(existsSync(join(root, "registry/lib/fonts", file)), file).toBe(true)
    }
  })
})
