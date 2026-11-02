/**
 * The registry checker itself needs tests: a false negative lets a broken
 * manifest reach a release, and a false positive blocks an ordinary one.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const repo = join(import.meta.dir, "..")
const script = join(repo, "scripts/check-registry.ts")
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function fixture(items: unknown[], files: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "flint-registry-"))
  roots.push(root)
  const registry = join(root, "registry")
  mkdirSync(registry, { recursive: true })
  writeFileSync(join(registry, "registry.json"), JSON.stringify({ name: "test", items }, null, 2))
  for (const [path, content] of Object.entries(files)) {
    const full = join(registry, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return root
}

function run(root: string) {
  const result = Bun.spawnSync(["bun", script, root], { cwd: repo, stdout: "pipe", stderr: "pipe" })
  return {
    code: result.exitCode,
    out: result.stdout.toString(),
    err: result.stderr.toString(),
  }
}

const ui = (name: string, dependencies: string[] = [], path = `components/ui/${name}.tsx`) => ({
  name,
  type: "registry:ui",
  registryDependencies: dependencies,
  files: [{ path, type: "registry:ui" }],
})

describe("check-registry", () => {
  test("accepts an item whose dependency is declared later", () => {
    const root = fixture(
      [ui("a", ["b"]), ui("b")],
      { "components/ui/a.tsx": "export const A = 1\n", "components/ui/b.tsx": "export const B = 1\n" }
    )
    const result = run(root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("registry ok: 2 items, 2 files")
  })

  test("rejects a dependency cycle", () => {
    const root = fixture(
      [ui("a", ["b"]), ui("b", ["a"])],
      { "components/ui/a.tsx": "export const A = 1\n", "components/ui/b.tsx": "export const B = 1\n" }
    )
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("dependency cycle")
    expect(result.err).toContain("a -> b -> a")
  })

  test("rejects a self-dependency", () => {
    const root = fixture([ui("a", ["a"])], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("depends on itself")
  })

  test("rejects an unknown dependency", () => {
    const root = fixture([ui("a", ["nope"])], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain('unknown dependency "nope"')
  })

  test("rejects a path that walks out of the registry", () => {
    const root = fixture([ui("a", [], "../escape.tsx")], { "../escape.tsx": "export const E = 1\n" })
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("escapes the registry")
  })

  test("rejects an absolute path", () => {
    const root = fixture([ui("a", [], "/tmp/escape.tsx")])
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("escapes the registry")
  })

  test("rejects a missing file", () => {
    const root = fixture([ui("a")])
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("missing file")
  })

  test("rejects a duplicate item name", () => {
    const root = fixture([ui("a"), ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain('duplicate item "a"')
  })

  test("rejects a file listed by two items", () => {
    const root = fixture([ui("a"), ui("b", [], "components/ui/a.tsx")], {
      "components/ui/a.tsx": "export const A = 1\n",
    })
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("listed by more than one item")
  })

  test("rejects a name that is not kebab-case", () => {
    const root = fixture(
      [{ ...ui("a", [], "components/ui/Bad_Name.tsx"), name: "Bad_Name" }],
      { "components/ui/Bad_Name.tsx": "export const B = 1\n" }
    )
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("kebab-case")
  })

  test("rejects a component file that is not in the manifest", () => {
    const root = fixture([ui("a")], {
      "components/ui/a.tsx": "export const A = 1\n",
      "components/ui/extra.tsx": "export const E = 1\n",
    })
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("components/ui/extra.tsx is not in registry.json")
  })

  test("rejects an empty manifest", () => {
    const root = fixture([])
    const result = run(root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("non-empty items array")
  })
})
