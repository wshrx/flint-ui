import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { isAbsolute, join, relative, resolve } from "node:path"
import { COMPONENTS, PREVIEWS } from "../apps/www/src/components/previews.js"

const root = join(import.meta.dir, "..")
const registryDir = join(root, "registry")

interface Item {
  name: string
  type: string
  description?: string
  registryDependencies?: string[]
  files: { path: string; type: string }[]
}

const manifest = JSON.parse(readFileSync(join(registryDir, "registry.json"), "utf8")) as {
  name: string
  items: Item[]
}
const items = manifest.items
const ui = items.filter((item) => item.type === "registry:ui")

const pascal = (name: string) =>
  name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")

function inside(base: string, target: string): boolean {
  const rel = relative(base, target)
  return rel.length > 0 && !rel.startsWith("..") && !isAbsolute(rel)
}

function read(path: string): string {
  return readFileSync(join(root, path), "utf8")
}

describe("registry manifest", () => {
  test("has a name and a non-empty item list", () => {
    expect(typeof manifest.name).toBe("string")
    expect(manifest.name.length).toBeGreaterThan(0)
    expect(items.length).toBeGreaterThan(0)
  })

  test("item names are unique kebab-case and typed", () => {
    const names = new Set<string>()
    for (const item of items) {
      expect(item.name).toMatch(/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/)
      expect(names.has(item.name), item.name).toBe(false)
      names.add(item.name)
      expect(typeof item.type).toBe("string")
      expect(item.type.length).toBeGreaterThan(0)
      expect(item.files.length).toBeGreaterThan(0)
    }
  })

  test("every file exists inside the registry and is listed once", () => {
    const seen = new Set<string>()
    const allowed = /\.(tsx?|ttf|otf|txt|json)$/

    for (const item of items) {
      for (const file of item.files) {
        expect(file.path).not.toMatch(/^[A-Za-z]:[\\/]/)
        expect(isAbsolute(file.path), file.path).toBe(false)
        expect(file.path.split(/[\\/]+/)).not.toContain("..")
        expect(seen.has(file.path), `${file.path} is listed twice`).toBe(false)
        seen.add(file.path)

        const full = resolve(registryDir, file.path)
        expect(inside(registryDir, full), file.path).toBe(true)
        expect(existsSync(full), file.path).toBe(true)
        expect(statSync(full).isFile(), file.path).toBe(true)
        expect(allowed.test(file.path), file.path).toBe(true)
      }
    }
  })

  test("dependencies resolve and the graph has no cycles", () => {
    const byName = new Map(items.map((item) => [item.name, item]))
    for (const item of items) {
      for (const dependency of item.registryDependencies ?? []) {
        expect(byName.has(dependency), `${item.name} -> ${dependency}`).toBe(true)
        expect(dependency).not.toBe(item.name)
      }
    }

    const state = new Map<string, "visiting" | "done">()
    const stack: string[] = []
    const cycles: string[] = []

    const visit = (name: string) => {
      const seen = state.get(name)
      if (seen === "done") return
      if (seen === "visiting") {
        const start = stack.indexOf(name)
        cycles.push([...stack.slice(start), name].join(" -> "))
        return
      }
      state.set(name, "visiting")
      stack.push(name)
      for (const dependency of byName.get(name)?.registryDependencies ?? []) visit(dependency)
      stack.pop()
      state.set(name, "done")
    }

    for (const name of byName.keys()) visit(name)
    expect(cycles).toEqual([])
  })

  test("every UI item has a component file", () => {
    for (const item of ui) {
      const source = join(registryDir, "components/ui", `${item.name}.tsx`)
      expect(existsSync(source), item.name).toBe(true)
    }
  })
})

describe("package barrel", () => {
  const barrel = read("registry/index.ts")
  const lines = barrel
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("export * from"))

  test("exports every UI component, once", () => {
    const uiLines = lines.filter((line) => line.includes("components/ui/"))
    expect(new Set(uiLines).size).toBe(uiLines.length)

    for (const item of ui) {
      expect(uiLines, item.name).toContain(`export * from "@/components/ui/${item.name}.js"`)
    }
    expect(uiLines.length).toBe(ui.length)
  })

  test("every export points at a real file", () => {
    for (const line of lines) {
      const match = line.match(/"@\/(.+?)\.js"/)
      expect(match).not.toBeNull()
      const base = join(registryDir, match![1]!)
      expect(existsSync(`${base}.ts`) || existsSync(`${base}.tsx`), match![1]).toBe(true)
    }
  })

  test("the shared barrel exposes every top-level lib module", () => {
    const libBarrel = read("registry/lib/flint/index.ts")
    for (const entry of readdirSync(join(registryDir, "lib/flint"), { withFileTypes: true })) {
      if (entry.isDirectory() || entry.name === "index.ts") continue
      const specifier = `./${entry.name.replace(/\.tsx?$/, ".js")}`
      expect(libBarrel, entry.name).toContain(specifier)
    }
  })
})

describe("component sources", () => {
  test("each file exports the PascalCase component it is named after", () => {
    for (const item of ui) {
      const source = read(`registry/components/ui/${item.name}.tsx`)
      const name = pascal(item.name)
      expect(source, item.name).toMatch(new RegExp(`export (?:function|const) ${name}\\b`))
    }
  })

  test("no component paints a raw colour or bypasses Text", () => {
    for (const item of ui) {
      const source = read(`registry/components/ui/${item.name}.tsx`)
      expect(source, `${item.name} has a hex colour`).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(source, `${item.name} uses a bare <text>`).not.toMatch(/<text[\s>]/)
      expect(source, `${item.name} logs`).not.toMatch(/console\.(log|debug|info|warn|error)/)
      expect(source, `${item.name} has a marker`).not.toMatch(/\b(TODO|FIXME|XXX)\b/)
    }
  })

  test("pressable elements go through the helper, not raw buttonProps", () => {
    for (const item of ui) {
      const source = read(`registry/components/ui/${item.name}.tsx`)
      expect(source, `${item.name} imports buttonProps directly`).not.toMatch(/import \{[^}]*buttonProps/)
      expect(source, `${item.name} calls buttonProps directly`).not.toMatch(/buttonProps\(/)
    }
  })

  test("interactive roles carry the aria props GPUIX supports", () => {
    const progress = read("registry/components/ui/progress.tsx")
    expect(progress).toContain('role="progressbar"')
    expect(progress).toContain("aria-valuetext")

    const tabs = read("registry/components/ui/tabs.tsx")
    expect(tabs).toContain('role="tablist"')
    expect(tabs).toContain('role="tab"')
    expect(tabs).toContain("aria-selected")
    expect(tabs).toContain('role="tabpanel"')

    const accordion = read("registry/components/ui/accordion.tsx")
    expect(accordion).toContain("aria-expanded")

    const menu = read("registry/components/ui/context-menu.tsx")
    expect(menu).toContain('role="menu"')
    expect(menu).toContain('role="menuitem"')

    const separator = read("registry/components/ui/separator.tsx")
    expect(separator).toContain('role="separator"')
  })
})

describe("docs", () => {
  const docsDir = join(root, "apps/www/src/content/docs/docs/components")

  test("every UI item has exactly one docs page", () => {
    const pages = readdirSync(docsDir)
      .filter((file) => file.endsWith(".mdx"))
      .map((file) => file.replace(/\.mdx$/, ""))
      .sort()
    expect(pages).toEqual(ui.map((item) => item.name).sort())
  })

  test("each page has the contract sections and a source block", () => {
    for (const item of ui) {
      const page = read(`apps/www/src/content/docs/docs/components/${item.name}.mdx`)
      expect(page, item.name).toContain(`title: ${pascal(item.name)}`)
      expect(page, item.name).toContain("```bash")
      expect(page, item.name).toContain(`flint-ui add ${item.name}`)
      expect(page, item.name).toContain("## Props")
      expect(page, item.name).toContain("## Keyboard and accessibility")
      expect(page, item.name).toContain("## Source")
      expect(page, item.name).toContain(`@/registry/components/ui/${item.name}.tsx?raw`)
      expect(page, item.name).toContain("<Code code={source}")
    }
  })

  test("every component has a preview and every page shows it", () => {
    expect(COMPONENTS.map((component) => String(component.name)).sort()).toEqual(ui.map((item) => item.name).sort())
    for (const item of ui) {
      expect(PREVIEWS).toHaveProperty(item.name)
      const page = read(`apps/www/src/content/docs/docs/components/${item.name}.mdx`)
      expect(page, item.name).toContain('import Preview from "@docs/Preview.astro"')
      expect(page, item.name).toContain(`<Preview name="${item.name}" />`)
    }
  })

  test("stateful previews stay interactive", () => {
    const required: Record<string, string[]> = {
      accordion: ["<details"],
      alert: ["data-pv-dismiss"],
      button: ["data-pv-toast", "<button"],
      card: ["data-pv-toast"],
      checkbox: ["data-pv-check", 'role="checkbox"'],
      combobox: ["data-pv-combobox-input", "data-pv-option"],
      "context-menu": ["data-pv-context", "data-pv-menu"],
      dialog: ["data-pv-open-dialog", "data-pv-dialog"],
      dropzone: ["data-pv-dropzone", 'type="file"'],
      field: ["<input"],
      input: ["<input"],
      label: ["<input"],
      progress: ["data-pv-range", "data-pv-progress-value"],
      select: ["data-pv-select-trigger", "data-pv-option"],
      switch: ["data-pv-switch", 'role="switch"'],
      tabs: ["data-pv-tab", "data-pv-panel"],
      textarea: ["<textarea"],
      tooltip: ["pv-tooltip"],
    }

    for (const [name, needles] of Object.entries(required)) {
      for (const needle of needles) {
        expect(PREVIEWS[name as keyof typeof PREVIEWS], `${name} missing ${needle}`).toContain(needle)
      }
    }

    expect(read("apps/www/src/scripts/previews.ts")).toContain("data-pv-switch")
    expect(read("apps/www/src/components/Preview.astro")).toContain('import "../scripts/previews.ts"')
  })

  test("the sidebar and the catalogue list every component", () => {
    const config = read("apps/www/astro.config.mjs")
    const catalogue = read("apps/www/src/content/docs/docs/components.mdx")
    for (const item of ui) {
      expect(config, `sidebar ${item.name}`).toContain(`slug: "docs/components/${item.name}"`)
      expect(catalogue, `catalogue ${item.name}`).toContain(`href="${item.name}"`)
    }
  })

  test("the public catalogues list every component", () => {
    const llms = read("apps/www/public/llms.txt")
    const readme = read("README.md")

    for (const item of ui) {
      const name = pascal(item.name)
      expect(llms, `llms ${item.name}`).toContain(`docs/components/${item.name}/`)
      expect(readme, `README ${item.name}`).toContain(`| [${name}](`)
    }
  })

  test("prose has no em dashes", () => {
    const docsRoot = join(root, "apps/www/src/content/docs/docs")
    const files: string[] = []
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) walk(full)
        else if (entry.name.endsWith(".mdx")) files.push(full)
      }
    }
    walk(docsRoot)

    for (const file of files) {
      let fenced = false
      const lines = readFileSync(file, "utf8").split("\n")
      for (const [index, line] of lines.entries()) {
        if (line.trim().startsWith("```")) {
          fenced = !fenced
          continue
        }
        if (fenced) continue
        const trimmed = line.trim()
        if (trimmed.startsWith("<tr") || trimmed.startsWith("<td") || trimmed.startsWith("<th")) continue
        if (trimmed.startsWith("|")) continue
        expect(line.includes("—"), `${file}:${index + 1}`).toBe(false)
      }
    }
  })
})
