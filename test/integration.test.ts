/**
 * Real-pipeline smoke test.
 *
 * GPUIX's TestGpuixRenderer drives the actual GPUI build and layout offscreen,
 * but it exists on macOS and Windows only, and the native addon needs system
 * libraries a bare Linux CI image does not have. Everything is imported
 * lazily, so on Linux the suite skips instead of failing at module load.
 */
import { createElement, type ReactNode } from "react"
import { expect, test } from "bun:test"

type Testing = typeof import("@gpuix/react/testing")
type Modules = {
  ThemeProvider: (props: { theme: unknown; children?: ReactNode }) => ReactNode
  flintDark: unknown
  Text: (props: { children?: ReactNode }) => ReactNode
  Badge: (props: { children?: ReactNode }) => ReactNode
  Button: (props: { children?: ReactNode }) => ReactNode
}

let testing: Testing | null = null
try {
  testing = await import("@gpuix/react/testing")
} catch {
  testing = null
}

const native = testing?.hasNativeTestRenderer === true
const whenNative = native ? test : test.skip

whenNative("renders flint components through the GPUI pipeline", async () => {
  const h = createElement
  const [{ ThemeProvider, flintDark, Text, Badge, Button }] = await Promise.all([
    Promise.all([
      import("@/lib/flint/theme-provider.js"),
      import("@/lib/flint/theme.js"),
      import("@/lib/flint/text.js"),
      import("@/components/ui/badge.js"),
      import("@/components/ui/button.js"),
    ]).then(([provider, theme, text, badge, button]) => ({
      ThemeProvider: provider.ThemeProvider,
      flintDark: theme.flintDark,
      Text: text.Text,
      Badge: badge.Badge,
      Button: button.Button,
    })),
  ]) as [Modules]

  const root = testing!.createTestRoot({ width: 640, height: 320 })
  root.render(
    h(
      ThemeProvider,
      { theme: flintDark },
      h(
        "div",
        { style: { display: "flex", alignItems: "center", gap: 8, padding: 16 } },
        h(Text, null, "Hello from flint"),
        h(Badge, null, "Beta"),
        h(Button, null, "Save changes")
      )
    )
  )
  root.renderer.flush()

  const painted = root.renderer.getAllText().join(" ")
  expect(painted).toContain("Hello from flint")
  expect(painted).toContain("Save changes")

  root.unmount()
})
