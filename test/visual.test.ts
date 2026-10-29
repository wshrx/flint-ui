/**
 * Visual and timing capture. Runs where GPUIX has a test renderer (macOS and
 * Windows); on Linux it skips, because the renderer cannot read a frame back.
 *
 * The screenshots are artifacts for a human diff, not golden files: GPU
 * antialiasing differs between runners, so a byte comparison would be noise.
 * The timing bound is deliberately loose; it catches pathological regressions,
 * not micro-changes.
 */
import { expect, test } from "bun:test"
import { createElement } from "react"
import { existsSync, mkdirSync } from "node:fs"
import { join } from "node:path"

let testing: typeof import("@gpuix/react/testing") | null = null
try {
  testing = await import("@gpuix/react/testing")
} catch {
  testing = null
}

const native = testing?.hasNativeTestRenderer === true
const whenNative = native ? test : test.skip

whenNative("captures the component matrix and keeps a frame budget", async () => {
  const h = createElement
  const [provider, theme, button, input, checkbox, badge, alert, progress, accordion] = await Promise.all([
    import("@/lib/flint/theme-provider.js"),
    import("@/lib/flint/theme.js"),
    import("@/components/ui/button.js"),
    import("@/components/ui/input.js"),
    import("@/components/ui/checkbox.js"),
    import("@/components/ui/badge.js"),
    import("@/components/ui/alert.js"),
    import("@/components/ui/progress.js"),
    import("@/components/ui/accordion.js"),
  ])

  const ThemeProvider = provider.ThemeProvider
  const flintDark = theme.flintDark

  const tree = (label: string) =>
    h(
      ThemeProvider,
      { theme: flintDark },
      h(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: 12, padding: 20 } },
        h(button.Button, null, label),
        h(button.Button, { variant: "secondary" }, "Secondary"),
        h(button.Button, { variant: "outline", size: "sm" }, "Small"),
        h(button.Button, { variant: "destructive" }, "Delete"),
        h(input.Input, { placeholder: "Name", "aria-label": "Name" }),
        h(input.Input, { placeholder: "Invalid", invalid: true, "aria-label": "Invalid" }),
        h(checkbox.Checkbox, { defaultChecked: true, label: "Checkbox" }),
        h(badge.Badge, { variant: "success", dot: true }, "Connected"),
        h(alert.Alert, { tone: "success", title: "Saved", description: "Nothing to retry." }),
        h(progress.Progress, { value: 64, label: "Storage", showValue: true }),
        h(
          accordion.Accordion,
          { defaultValue: "a" },
          h(accordion.AccordionItem, { value: "a", title: "Open" }),
          h(accordion.AccordionItem, { value: "b", title: "Closed" })
        )
      )
    )

  const root = testing!.createTestRoot({ width: 900, height: 640 })
  try {
    root.render(tree("Primary"))
    root.renderer.flush()

    const dir = join(import.meta.dir, "__screenshots__")
    mkdirSync(dir, { recursive: true })
    const file = join(dir, `${process.platform}-${process.arch}.png`)
    root.renderer.captureScreenshot(file)
    expect(existsSync(file)).toBe(true)

    const started = performance.now()
    for (let index = 0; index < 20; index++) {
      root.render(tree(`Frame ${index}`))
      root.renderer.flush()
    }
    const elapsed = performance.now() - started

    // 20 layouts in six seconds is a floor, not a target: a 300 ms frame fails,
    // a 30 ms frame passes with room for a slow runner.
    expect(elapsed).toBeLessThan(6000)
  } finally {
    root.unmount()
  }
})
