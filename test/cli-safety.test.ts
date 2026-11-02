/**
 * CLI safety and failure modes. The happy path lives in cli.test.ts; this file
 * covers the cases that decide whether a bad registry can damage a project.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const repo = join(import.meta.dir, "..")
const cli = join(repo, "packages/cli/src/index.ts")
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

interface Fixture {
  root: string
  registry: string
  project: string
}

function makeFixture(items: unknown[], files: Record<string, string> = {}): Fixture {
  const root = mkdtempSync(join(tmpdir(), "flint-cli-safety-"))
  roots.push(root)
  const registry = join(root, "registry")
  const project = join(root, "project")
  mkdirSync(registry, { recursive: true })
  mkdirSync(project, { recursive: true })
  writeFileSync(join(registry, "registry.json"), JSON.stringify({ name: "test", items }, null, 2))
  writeFileSync(join(project, "package.json"), '{"name":"t","private":true}\n')
  for (const [path, content] of Object.entries(files)) {
    const full = join(registry, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  return { root, registry, project }
}

const ui = (name: string, dependencies: string[] = [], path = `components/ui/${name}.tsx`) => ({
  name,
  type: "registry:ui",
  registryDependencies: dependencies,
  files: [{ path, type: "registry:ui" }],
})

function run(fixture: Fixture, args: string[]) {
  const result = Bun.spawnSync(["bun", cli, ...args], {
    cwd: fixture.project,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    code: result.exitCode,
    out: result.stdout.toString(),
    err: result.stderr.toString(),
  }
}

describe("registry paths", () => {
  test("rejects a path that walks out of the registry before writing", () => {
    const fixture = makeFixture([
      { name: "bad", type: "registry:ui", files: [{ path: "../escape.ts", type: "registry:ui" }] },
    ])
    const result = run(fixture, ["add", "bad", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain("escapes the registry")
    expect(existsSync(join(fixture.project, "escape.ts"))).toBe(false)
  })

  test("rejects an absolute path", () => {
    const target = join(tmpdir(), `flint-escape-${process.pid}.ts`)
    const fixture = makeFixture([ui("bad", [], target)])
    const result = run(fixture, ["add", "bad", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain("escapes the registry")
    expect(existsSync(target)).toBe(false)
  })

  test("reads every file before writing the first one", () => {
    const fixture = makeFixture(
      [
        {
          name: "pack",
          type: "registry:ui",
          files: [
            { path: "components/ui/pack.tsx", type: "registry:ui" },
            { path: "components/ui/late.tsx", type: "registry:ui" },
          ],
        },
      ],
      { "components/ui/pack.tsx": "export const Pack = 1\n" }
    )
    const result = run(fixture, ["add", "pack", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain("Missing registry file")
    expect(existsSync(join(fixture.project, "src/components/ui/pack.tsx"))).toBe(false)
  })
})

describe("registry shape", () => {
  test("accepts a dependency declared later in the manifest", () => {
    const fixture = makeFixture([ui("a", ["b"]), ui("b")], {
      "components/ui/a.tsx": "export const A = 1\n",
      "components/ui/b.tsx": "export const B = 1\n",
    })
    const result = run(fixture, ["add", "a", "--registry", fixture.registry])
    expect(result.code).toBe(0)
    expect(existsSync(join(fixture.project, "src/components/ui/a.tsx"))).toBe(true)
    expect(existsSync(join(fixture.project, "src/components/ui/b.tsx"))).toBe(true)
  })

  test("reports an unknown component and exits non-zero", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "nope", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain('Unknown component "nope"')
  })

  test("requires at least one component name", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain("Name at least one component")
  })
})

describe("diff", () => {
  test("counts lines without the empty tail after the final newline", () => {
    const fixture = makeFixture([ui("widget")], {
      "components/ui/widget.tsx": "one\ntwo\nthree\n",
    })
    expect(run(fixture, ["add", "widget", "--registry", fixture.registry]).code).toBe(0)
    appendFileSync(join(fixture.project, "src/components/ui/widget.tsx"), "four\n")

    const result = run(fixture, ["diff", "widget", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.out).toContain("(4 → 3 lines)")
  })
})

const INIT_NAMES = ["lib", "theme", "utils", "theme-provider", "text", "icon", "icons", "use-controllable", "fonts"]

function initFixture() {
  const items = INIT_NAMES.map((name) => ({
    name,
    type: "registry:lib",
    registryDependencies: name === "lib" ? INIT_NAMES.filter((entry) => entry !== "lib") : undefined,
    files: [{ path: `lib/${name}.ts`, type: "registry:lib" }],
  }))
  const files = Object.fromEntries(INIT_NAMES.map((name) => [`lib/${name}.ts`, `export const ${name} = 1\n`]))
  return makeFixture(items, files)
}

describe("init", () => {
  test("--dry-run writes neither flint.json nor files", () => {
    const fixture = initFixture()
    const result = run(fixture, ["init", "--dry-run", "--registry", fixture.registry])
    expect(result.code).toBe(0)
    expect(result.out).toContain("would write flint.json")
    expect(existsSync(join(fixture.project, "flint.json"))).toBe(false)
    expect(existsSync(join(fixture.project, "src"))).toBe(false)
  })

  test("a broken registry leaves no flint.json behind", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["init", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain('Unknown component "lib"')
    expect(existsSync(join(fixture.project, "flint.json"))).toBe(false)
  })
})

describe("arguments and config", () => {
  test("--root needs a value", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "--root"])
    expect(result.code).toBe(1)
    expect(result.err).toContain("--root needs a directory")
  })

  test("--registry needs a value", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "--registry"])
    expect(result.code).toBe(1)
    expect(result.err).toContain("--registry needs a path or URL")
  })

  test("rejects a flint.json that is not an object", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    writeFileSync(join(fixture.project, "flint.json"), "[]\n")
    const result = run(fixture, ["list", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain('flint.json must contain a JSON object')
  })

  test("list prints components and shared items", () => {
    const fixture = makeFixture(
      [ui("a"), { name: "shared", type: "registry:lib", files: [{ path: "lib/shared.ts", type: "registry:lib" }] }],
      { "components/ui/a.tsx": "export const A = 1\n", "lib/shared.ts": "export const shared = 1\n" }
    )
    const result = run(fixture, ["list", "--registry", fixture.registry])
    expect(result.code).toBe(0)
    expect(result.out).toMatch(/^\s+a\s{2,}/m)
    expect(result.out).toMatch(/^\s+shared\s{2,}/m)
  })

  test("--version prints a semantic version", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["--version"])
    expect(result.code).toBe(0)
    expect(result.out.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test("--root places files in the chosen directory", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "a", "--root", "app", "--registry", fixture.registry])
    expect(result.code).toBe(0)
    expect(existsSync(join(fixture.project, "app/components/ui/a.tsx"))).toBe(true)
  })

  test("flint.json root is used when no --root is passed", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    writeFileSync(
      join(fixture.project, "flint.json"),
      JSON.stringify({ root: "app", registry: fixture.registry }, null, 2)
    )
    const result = run(fixture, ["add", "a"])
    expect(result.code).toBe(0)
    expect(readFileSync(join(fixture.project, "app/components/ui/a.tsx"), "utf8")).toContain("export const A")
  })

  test("--root wins over the config", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    writeFileSync(
      join(fixture.project, "flint.json"),
      JSON.stringify({ root: "configured", registry: fixture.registry }, null, 2)
    )
    const result = run(fixture, ["add", "a", "--root", "flag"])
    expect(result.code).toBe(0)
    expect(existsSync(join(fixture.project, "flag/components/ui/a.tsx"))).toBe(true)
    expect(existsSync(join(fixture.project, "configured/components/ui/a.tsx"))).toBe(false)
  })

  test("a non-string root in flint.json is rejected", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    writeFileSync(join(fixture.project, "flint.json"), JSON.stringify({ root: 5, registry: fixture.registry }))
    const result = run(fixture, ["list"])
    expect(result.code).toBe(1)
    expect(result.err).toContain('"root" must be a string')
  })

  test("help lists the commands", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, [])
    expect(result.code).toBe(0)
    expect(result.out).toContain("flint-ui")
    expect(result.out).toContain("init")
    expect(result.out).toContain("add")
    expect(result.out).toContain("diff")
  })

  test("an unknown command is rejected", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["nope"])
    expect(result.code).toBe(1)
    expect(result.err).toContain('Unknown command "nope"')
  })
})

describe("copy behaviour", () => {
  test("--dry-run reports writes and leaves the tree alone", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "a", "--dry-run", "--registry", fixture.registry])
    expect(result.code).toBe(0)
    expect(result.out).toContain("would add")
    expect(existsSync(join(fixture.project, "src/components/ui/a.tsx"))).toBe(false)
  })

  test("existing files are skipped and --overwrite replaces them", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "registry version\n" })
    expect(run(fixture, ["add", "a", "--registry", fixture.registry]).code).toBe(0)
    const target = join(fixture.project, "src/components/ui/a.tsx")
    writeFileSync(target, "local version\n")

    const skipped = run(fixture, ["add", "a", "--registry", fixture.registry])
    expect(skipped.code).toBe(0)
    expect(skipped.out).toContain("skip")
    expect(readFileSync(target, "utf8")).toBe("local version\n")

    const replaced = run(fixture, ["add", "a", "--overwrite", "--registry", fixture.registry])
    expect(replaced.code).toBe(0)
    expect(readFileSync(target, "utf8")).toBe("registry version\n")
  })

  test("repeating a name copies its files once", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "a", "a", "--registry", fixture.registry])
    expect(result.code).toBe(0)
    expect(result.out.split("components/ui/a.tsx").length - 1).toBe(1)
  })

  test("diff reports a missing file and exits non-zero", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["diff", "a", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.out).toContain("missing")
    expect(result.out).toContain("0 changed, 1 missing")
  })
})

describe("registry validation", () => {
  test("rejects a duplicate item name", () => {
    const fixture = makeFixture([ui("a"), ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "a", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain('duplicate item "a"')
  })

  test("rejects a dependency that is not in the manifest", () => {
    const fixture = makeFixture([ui("a", ["nope"])], { "components/ui/a.tsx": "export const A = 1\n" })
    const result = run(fixture, ["add", "a", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain('depends on "nope"')
    expect(existsSync(join(fixture.project, "src/components/ui/a.tsx"))).toBe(false)
  })

  test("rejects a registry.json that is not JSON", () => {
    const fixture = makeFixture([ui("a")], { "components/ui/a.tsx": "export const A = 1\n" })
    writeFileSync(join(fixture.registry, "registry.json"), "{ broken")
    const result = run(fixture, ["list", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain("registry.json is not JSON")
  })

  test("rejects an empty items array", () => {
    const fixture = makeFixture([], {})
    const result = run(fixture, ["list", "--registry", fixture.registry])
    expect(result.code).toBe(1)
    expect(result.err).toContain('"items" must be a non-empty array')
  })
})
