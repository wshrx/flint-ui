/**
 * CLI contract tests: they spawn the real entry point against a throwaway
 * registry, so dry-run, diff and registry validation are checked the way a
 * user meets them.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync, readFileSync, appendFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const cli = join(import.meta.dir, "..", "packages/cli/src/index.ts")
let root = ""
let registry = ""
let project = ""

function run(args: string[]) {
  const result = Bun.spawnSync(["bun", cli, ...args], { cwd: project, stdout: "pipe", stderr: "pipe" })
  return {
    code: result.exitCode,
    out: result.stdout.toString(),
    err: result.stderr.toString(),
  }
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "flint-cli-"))
  registry = join(root, "registry")
  project = join(root, "project")
  mkdirSync(join(registry, "components"), { recursive: true })
  mkdirSync(project, { recursive: true })
  writeFileSync(join(project, "package.json"), '{"name":"t","private":true}\n')

  writeFileSync(
    join(registry, "registry.json"),
    JSON.stringify({
      name: "test",
      items: [
        {
          name: "widget",
          type: "registry:ui",
          description: "A test widget.",
          registryDependencies: ["shared"],
          files: [{ path: "components/widget.tsx", type: "registry:ui" }],
        },
        {
          name: "shared",
          type: "registry:lib",
          files: [{ path: "lib/shared.ts", type: "registry:lib" }],
        },
      ],
    })
  )
  writeFileSync(join(registry, "components", "widget.tsx"), "export const widget = 1\n")
  mkdirSync(join(registry, "lib"), { recursive: true })
  writeFileSync(join(registry, "lib", "shared.ts"), "export const shared = 1\n")
})

afterAll(() => rmSync(root, { recursive: true, force: true }))

describe("flint-ui", () => {
  test("--dry-run prints what would happen and writes nothing", () => {
    const result = run(["add", "widget", "--registry", registry, "--dry-run"])
    expect(result.code).toBe(0)
    expect(result.out).toContain("would add")
    expect(existsSync(join(project, "src/components/widget.tsx"))).toBe(false)
    expect(existsSync(join(project, "src/lib/shared.ts"))).toBe(false)
  })

  test("add copies the component and its dependency", () => {
    const result = run(["add", "widget", "--registry", registry])
    expect(result.code).toBe(0)
    expect(existsSync(join(project, "src/components/widget.tsx"))).toBe(true)
    expect(existsSync(join(project, "src/lib/shared.ts"))).toBe(true)
  })

  test("diff is clean right after add", () => {
    const result = run(["diff", "widget", "--registry", registry])
    expect(result.code).toBe(0)
    expect(result.out).toContain("0 changed, 0 missing")
  })

  test("diff reports an edited file and exits non-zero", () => {
    appendFileSync(join(project, "src/components/widget.tsx"), "// local edit\n")
    const result = run(["diff", "widget", "--registry", registry])
    expect(result.code).toBe(1)
    expect(result.out).toContain("changed")
    expect(readFileSync(join(project, "src/components/widget.tsx"), "utf8")).toContain("local edit")
  })

  test("a registry with a missing dependency is rejected before copying", () => {
    const broken = join(root, "broken")
    mkdirSync(join(broken, "x"), { recursive: true })
    writeFileSync(
      join(broken, "registry.json"),
      JSON.stringify({
        name: "broken",
        items: [
          {
            name: "thing",
            type: "registry:ui",
            registryDependencies: ["nope"],
            files: [{ path: "x/thing.tsx", type: "registry:ui" }],
          },
        ],
      })
    )
    const result = run(["add", "thing", "--registry", broken])
    expect(result.code).not.toBe(0)
    expect(result.err).toContain('depends on "nope"')
    expect(existsSync(join(project, "src/x/thing.tsx"))).toBe(false)
  })
})
