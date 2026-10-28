/**
 * Real-pipeline smoke test.
 *
 * GPUIX's TestGpuixRenderer drives the actual GPUI build and layout offscreen,
 * but it exists on macOS and Windows only: the Linux build cannot read a
 * rendered frame back yet. On Linux this test is skipped, which is why the
 * kitchen sink (`examples/kitchen-sink`) stays the manual check there.
 */
import { expect, test } from "bun:test"
import { createTestRoot, hasNativeTestRenderer } from "@gpuix/react/testing"
import { ThemeProvider } from "@/lib/flint/theme-provider.js"
import { flintDark } from "@/lib/flint/theme.js"
import { Text } from "@/lib/flint/text.js"
import { Badge } from "@/components/ui/badge.js"
import { Button } from "@/components/ui/button.js"

const whenNative = hasNativeTestRenderer ? test : test.skip

whenNative("renders flint components through the GPUI pipeline", () => {
  const t = createTestRoot({ width: 640, height: 320 })
  t.render(
    <ThemeProvider theme={flintDark}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: 16 }}>
        <Text>Hello from flint</Text>
        <Badge>Beta</Badge>
        <Button>Save changes</Button>
      </div>
    </ThemeProvider>,
  )
  t.renderer.flush()

  const text = t.renderer.getAllText().join(" ")
  expect(text).toContain("Hello from flint")
  expect(text).toContain("Save changes")

  t.unmount()
})
