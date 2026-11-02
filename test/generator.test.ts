/**
 * The scaffold writes six places at once: the component, the manifest, the
 * package barrel, the docs page, the sidebar and the catalogue. A missing barrel
 * line is how the package shipped 12 of 24 components, so the generator gets an
 * end-to-end test in a throwaway repository.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const repo = join(import.meta.dir, "..")
const generator = join(repo, "tools/new-component.ts")
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function fixture(): string {
  const root = mkdtempSync(join(tmpdir(), "flint-generator-"))
  roots.push(root)

  const files: Record<string, string> = {
    "registry/index.ts": `export * from "@/lib/flint/theme.js"\n\nexport * from "@/components/ui/button.js"\n`,
    "registry/registry.json": JSON.stringify(
      {
        name: "test",
        items: [
          {
            name: "button",
            type: "registry:ui",
            description: "A button.",
            registryDependencies: ["theme", "utils"],
            files: [{ path: "components/ui/button.tsx", type: "registry:ui" }],
          },
        ],
      },
      null,
      2
    ),
    "apps/www/astro.config.mjs": `export default {
  sidebar: [
    {
      label: "Components",
      items: [
        { label: "Button", slug: "docs/components/button" },
      ],
    },
  ],
}
`,
    "apps/www/src/content/docs/docs/components.mdx": `<dl>
  <div>
    <dt><a href="button">Button</a></dt>
    <dd>A button.</dd>
  </div>
</dl>
`,
  }

  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  mkdirSync(join(root, "registry/components/ui"), { recursive: true })
  mkdirSync(join(root, "apps/www/src/content/docs/docs/components"), { recursive: true })
  return root
}

function run(root: string, args: string[]) {
  const result = Bun.spawnSync(["bun", generator, ...args], { cwd: root, stdout: "pipe", stderr: "pipe" })
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() }
}

describe.skipIf(!existsSync(generator))("new-component (needs tools/new-component.ts)", () => {
  test("writes the component, manifest, barrel, page, sidebar and catalogue", () => {
    const root = fixture()
    const result = run(root, ["toast", "--meta", "3 tones · auto dismiss"])
    expect(result.code).toBe(0)
    expect(result.out).toContain("Toast scaffolded")

    const component = readFileSync(join(root, "registry/components/ui/toast.tsx"), "utf8")
    expect(component).toContain("export interface ToastProps")
    expect(component).toContain("export function Toast")
    expect(() => new Bun.Transpiler({ loader: "tsx" }).transformSync(component)).not.toThrow()

    const page = readFileSync(join(root, "apps/www/src/content/docs/docs/components/toast.mdx"), "utf8")
    expect(page).toContain("title: Toast")
    expect(page).toContain("flint-ui add toast")
    expect(page).toContain("@/registry/components/ui/toast.tsx?raw")

    const manifest = JSON.parse(readFileSync(join(root, "registry/registry.json"), "utf8")) as {
      items: { name: string; registryDependencies: string[] }[]
    }
    const toast = manifest.items.find((item) => item.name === "toast")
    expect(toast).toBeDefined()
    expect(toast!.registryDependencies).toEqual(["theme", "utils", "theme-provider", "text"])

    const barrel = readFileSync(join(root, "registry/index.ts"), "utf8")
    expect(barrel).toContain('export * from "@/components/ui/toast.js"')

    const config = readFileSync(join(root, "apps/www/astro.config.mjs"), "utf8")
    expect(config).toContain('label: "Toast", slug: "docs/components/toast"')

    const catalogue = readFileSync(join(root, "apps/www/src/content/docs/docs/components.mdx"), "utf8")
    expect(catalogue).toContain('<a href="toast">Toast</a>')
  })

  test("--dry-run reports the six targets and writes none of them", () => {
    const root = fixture()
    const result = run(root, ["toast", "--dry-run"])
    expect(result.code).toBe(0)
    expect(result.out).toContain("would create registry/components/ui/toast.tsx")
    expect(result.out).toContain("would add toast to registry.json, registry/index.ts")
    expect(existsSync(join(root, "registry/components/ui/toast.tsx"))).toBe(false)
    expect(existsSync(join(root, "apps/www/src/content/docs/docs/components/toast.mdx"))).toBe(false)
    expect(readFileSync(join(root, "registry/index.ts"), "utf8")).not.toContain("toast")
  })

  test("refuses a component that already exists", () => {
    const root = fixture()
    expect(run(root, ["toast"]).code).toBe(0)
    const result = run(root, ["toast"])
    expect(result.code).toBe(1)
    expect(result.err).toContain("toast already exists")
  })

  test("rejects a non-kebab name", () => {
    const root = fixture()
    const result = run(root, ["Toast"])
    expect(result.code).toBe(2)
    expect(result.err).toContain("usage:")
  })
})
