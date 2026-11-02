/**
 * Interaction tests for the parts that need the real GPUI pipeline: a right
 * click, an OS file drop and a keyboard press. The renderer exists on macOS and
 * Windows only, so Linux skips instead of failing at module load.
 *
 * The hit target is always the painted parent of a text node. Clicking its
 * padding, not the glyphs, keeps the test about the component rather than about
 * GPUI text hit testing.
 */
import { createElement } from "react"
import { expect, test } from "bun:test"

type Testing = typeof import("@gpuix/react/testing")

let testing: Testing | null = null
try {
  testing = await import("@gpuix/react/testing")
} catch {
  testing = null
}

const native = testing?.hasNativeTestRenderer === true
const whenNative = native ? test : test.skip

async function modules() {
  const [provider, theme, text, dropzone, menu, accordion] = await Promise.all([
    import("@/lib/flint/theme-provider.js"),
    import("@/lib/flint/theme.js"),
    import("@/lib/flint/text.js"),
    import("@/components/ui/dropzone.js"),
    import("@/components/ui/context-menu.js"),
    import("@/components/ui/accordion.js"),
  ])
  return {
    ThemeProvider: provider.ThemeProvider,
    flintDark: theme.flintDark,
    Text: text.Text,
    Dropzone: dropzone.Dropzone,
    ContextMenuProvider: menu.ContextMenuProvider,
    ContextMenu: menu.ContextMenu,
    Accordion: accordion.Accordion,
    AccordionItem: accordion.AccordionItem,
  }
}

function parent(renderer: InstanceType<Testing["TestRenderer"]>, text: string) {
  const node = renderer.findByText(text)
  if (!node) throw new Error(`no painted text "${text}"`)
  const target = node.parentId === null ? node : renderer.getElement(node.parentId) ?? node
  const bounds = renderer.getElementBounds(target.id)
  if (!bounds) throw new Error(`no bounds for "${text}"`)
  return { target, bounds }
}

whenNative("ContextMenu opens on a right click and runs the selected item", async () => {
  const h = createElement
  const { ThemeProvider, flintDark, Text, ContextMenuProvider, ContextMenu } = await modules()
  let selected = 0

  const root = testing!.createTestRoot({ width: 640, height: 320 })
  try {
    root.render(
      h(
        ThemeProvider,
        { theme: flintDark },
        h(
          ContextMenuProvider,
          null,
          h(
            ContextMenu,
            {
              items: [
                { label: "Rename", onSelect: () => selected++ },
                { label: "Delete", onSelect: () => selected++ },
              ],
              style: { width: 240, height: 80 },
            },
            h(Text, null, "Row content")
          )
        )
      )
    )
    root.renderer.flush()

    const zone = parent(root.renderer, "Row content")
    root.renderer.nativeSimulateClick(zone.bounds.x + 12, zone.bounds.y + 12, 2)
    root.renderer.flush()

    expect(root.renderer.findByText("Rename")).toBeDefined()
    expect(root.renderer.findByText("Delete")).toBeDefined()

    const item = parent(root.renderer, "Rename")
    root.renderer.nativeSimulateClick(item.bounds.x + 4, item.bounds.y + item.bounds.height / 2, 0)
    root.renderer.flush()

    expect(selected).toBe(1)
    expect(root.renderer.findByText("Rename")).toBeUndefined()
  } finally {
    root.unmount()
  }
})

whenNative("Dropzone reports accepted paths and drops the rest", async () => {
  const h = createElement
  const { ThemeProvider, flintDark, Dropzone } = await modules()
  const seen: string[][] = []

  const root = testing!.createTestRoot({ width: 640, height: 320 })
  try {
    root.render(
      h(
        ThemeProvider,
        { theme: flintDark },
        h(Dropzone, { accept: [".png"], onFiles: (paths) => seen.push(paths) }, )
      )
    )
    root.renderer.flush()

    const zone = parent(root.renderer, "Drop files here")
    root.renderer.nativeSimulateFileDrop(zone.bounds.x + zone.bounds.width / 2, zone.bounds.y + zone.bounds.height / 2, [
      "/tmp/one.png",
      "/tmp/two.txt",
      "/tmp/three.PNG",
    ])
    root.renderer.flush()

    expect(seen).toEqual([["/tmp/one.png", "/tmp/three.PNG"]])
  } finally {
    root.unmount()
  }
})

whenNative("Accordion opens from the keyboard", async () => {
  const h = createElement
  const { ThemeProvider, flintDark, Text, Accordion, AccordionItem } = await modules()

  const root = testing!.createTestRoot({ width: 640, height: 320 })
  try {
    root.render(
      h(
        ThemeProvider,
        { theme: flintDark },
        h(
          Accordion,
          { defaultValue: null },
          h(AccordionItem, { value: "profile", title: "Profile" }, h(Text, null, "Body copy"))
        )
      )
    )
    root.renderer.flush()

    const trigger = parent(root.renderer, "Profile")
    root.renderer.nativeSimulateKeyDown(trigger.target.id, "enter")
    root.renderer.flush()

    expect(root.renderer.findByText("Body copy")).toBeDefined()
    expect(Object.values(root.renderer.getA11yTree().nodes ?? {}).some((node) => node.aria?.expanded === true)).toBe(true)

    root.renderer.nativeSimulateKeyDown(trigger.target.id, "enter")
    root.renderer.flush()

    expect(root.renderer.findByText("Body copy")).toBeUndefined()
    expect(Object.values(root.renderer.getA11yTree().nodes ?? {}).some((node) => node.aria?.expanded === true)).toBe(false)
  } finally {
    root.unmount()
  }
})
