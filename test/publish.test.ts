/**
 * The public snapshot is built with `git archive` and force-pushed to a
 * separate repository. A bare repository in a temp directory is enough to
 * prove the shape: one commit, no planning files, no release tooling, and an
 * optional tag.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const repo = join(import.meta.dir, "..")
const script = join(repo, "scripts/publish.ts")
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function git(cwd: string, args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString()
}

// The publish script reads the version from the ref it archives, not from the
// working tree. Read the same source here so a release prep can leave the two
// deliberately out of sync until the version bump is committed.
const version = (
  JSON.parse(git(repo, ["show", "HEAD:packages/flint/package.json"])) as { version: string }
).version

function bare(): string {
  const dir = mkdtempSync(join(tmpdir(), "flint-publish-"))
  roots.push(dir)
  git(dir, ["init", "--bare", "-q"])
  return dir
}

function run(target: string, env: Record<string, string> = {}) {
  const result = Bun.spawnSync(["bun", script, target, "main", "HEAD"], {
    cwd: repo,
    stdout: "pipe",
    stderr: "pipe",
    env: { ...process.env, ...env },
  })
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() }
}

describe.skipIf(!existsSync(script))("publish snapshot (needs scripts/publish.ts)", () => {
  test("pushes one commit with the product tree and no planning files", () => {
    const target = bare()
    const result = run(target)
    expect(result.code).toBe(0)
    expect(result.out).toContain(`flint ${version}:`)

    expect(git(target, ["rev-list", "--count", "main"]).trim()).toBe("1")
    expect(git(target, ["show", "--format=%s", "--no-patch", "main"]).trim()).toBe(`flint ${version}`)

    const files = git(target, ["ls-tree", "-r", "--name-only", "main"]).split("\n").filter(Boolean)
    expect(files).toContain("registry/registry.json")
    expect(files).toContain("apps/www/astro.config.mjs")
    expect(files).toContain("packages/flint/package.json")
    expect(files).toContain("crates/flint-cli/Cargo.toml")
    expect(files).toContain("crates/flint-cli/src/main.rs")

    // The archive used to build the snapshot must not land in it.
    expect(files.filter((file) => file.endsWith(".tar"))).toEqual([])

    for (const excluded of [
      "WORKLOG.md",
      "PLAN.md",
      "PRODUCT.md",
      "DESIGN.md",
      "QA.md",
      "tools/anvil.ts",
      "scripts/publish.ts",
      ".githooks/pre-push",
      ".buildkite/pipeline.yml",
      ".gitattributes",
    ]) {
      expect(files, excluded).not.toContain(excluded)
    }
  })

  test("TAG creates an annotated tag on the snapshot commit", () => {
    const target = bare()
    const result = run(target, { TAG: "v9.9.9" })
    expect(result.code).toBe(0)
    expect(result.out).toContain("tagged v9.9.9")
    expect(git(target, ["tag", "--list"]).trim()).toBe("v9.9.9")
    expect(git(target, ["rev-parse", "v9.9.9^{commit}"]).trim()).toBe(git(target, ["rev-parse", "main"]).trim())
  })

  test("no TAG leaves the remote untagged", () => {
    const target = bare()
    expect(run(target).code).toBe(0)
    expect(git(target, ["tag", "--list"]).trim()).toBe("")
  })
})
