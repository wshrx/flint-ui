/**
 * The docs archive is frozen per release and taken from a tag, not from the
 * working tree. These tests use a throwaway git repository so the archive can
 * be checked without touching the real release history.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const repo = join(import.meta.dir, "..")
const script = join(repo, "scripts/archive-docs.ts")
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

const DOCS = {
  "apps/www/src/content/docs/docs/installation.mdx": `---
title: Installation
description: Install flint.
---

Install with the CLI.
`,
  "apps/www/src/content/docs/docs/components/button.mdx": `---
title: Button
description: A button.
---

import { Code } from "@astrojs/starlight/components"
import source from "@/registry/components/ui/button.tsx?raw"
import Preview from "@docs/Preview.astro"

\`\`\`bash
flint-ui add button
\`\`\`

<Preview name="button" />

## Usage

Body.

## Source

<Code code={source} lang="tsx" title="components/ui/button.tsx" />
`,
}

function git(cwd: string, args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString()
}

function fixture(files: Record<string, string> = DOCS): string {
  const root = mkdtempSync(join(tmpdir(), "flint-archive-"))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  git(root, ["init", "-q"])
  git(root, ["add", "-A"])
  git(root, ["-c", "user.name=flint", "-c", "user.email=flint@localhost", "commit", "-q", "-m", "docs"])
  git(root, ["tag", "v0.1.0"])
  return root
}

function run(cwd: string, args: string[]) {
  const result = Bun.spawnSync(["bun", script, ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() }
}

describe("archive-docs", () => {
  test("freezes the docs from a tag and writes the sidebar snapshot", () => {
    const root = fixture()
    const result = run(root, ["v0.1.0", "--from", "v0.1.0"])
    expect(result.code).toBe(0)
    expect(result.out).toContain("1 start pages, 1 components")

    const installation = readFileSync(
      join(root, "apps/www/src/content/docs/v0.1.0/docs/installation.mdx"),
      "utf8"
    )
    expect(installation).toContain("slug: v0.1.0/docs/installation")
    expect(installation).toContain("Install with the CLI.")

    const button = readFileSync(
      join(root, "apps/www/src/content/docs/v0.1.0/docs/components/button.mdx"),
      "utf8"
    )
    expect(button).toContain("slug: v0.1.0/docs/components/button")
    expect(button).not.toContain("import source")
    expect(button).not.toContain("import Preview")
    expect(button).not.toContain("<Preview")
    expect(button).not.toContain("## Source")
    expect(button).not.toContain("<Code code={source}")

    const versions = JSON.parse(
      readFileSync(join(root, "apps/www/src/content/versions/v0.1.0.json"), "utf8")
    ) as { sidebar: { label: string; items: { label: string; slug: string }[] }[] }
    const start = versions.sidebar.find((group) => group.label === "Start here")
    const components = versions.sidebar.find((group) => group.label === "Components")
    expect(start?.items).toContainEqual({ label: "Installation", slug: "docs/installation" })
    expect(components?.items).toContainEqual({ label: "Button", slug: "docs/components/button" })
    expect(versions.sidebar.flatMap((group) => group.items.map((item) => item.slug))).not.toContain(
      "docs/versioning"
    )
  })

  test("copies the working tree when --from is absent", () => {
    const root = fixture()
    const path = join(root, "apps/www/src/content/docs/docs/installation.mdx")
    writeFileSync(path, `${readFileSync(path, "utf8")}\nUncommitted sentence.\n`)

    const result = run(root, ["v0.1.1"])
    expect(result.code).toBe(0)
    const archived = readFileSync(join(root, "apps/www/src/content/docs/v0.1.1/docs/installation.mdx"), "utf8")
    expect(archived).toContain("Uncommitted sentence.")
  })

  test("replaces an existing archive instead of merging into it", () => {
    const root = fixture()
    expect(run(root, ["v0.1.0", "--from", "v0.1.0"]).code).toBe(0)
    const path = join(root, "apps/www/src/content/docs/docs/installation.mdx")
    writeFileSync(path, readFileSync(path, "utf8").replace("Install with the CLI.", "New text."))
    expect(run(root, ["v0.1.0"]).code).toBe(0)
    const archived = readFileSync(join(root, "apps/www/src/content/docs/v0.1.0/docs/installation.mdx"), "utf8")
    expect(archived).toContain("New text.")
    expect(archived).not.toContain("Install with the CLI.")
  })

  test("rejects a malformed slug", () => {
    const root = fixture()
    const result = run(root, ["0.1"])
    expect(result.code).toBe(2)
    expect(result.err).toContain("usage:")
  })

  test("--from needs a ref", () => {
    const root = fixture()
    const result = run(root, ["v0.1.0", "--from"])
    expect(result.code).toBe(2)
    expect(result.err).toContain("--from needs a git ref")
  })

  test("rejects a git ref that does not exist", () => {
    const root = fixture()
    const result = run(root, ["v0.1.0", "--from", "v9.9.9"])
    expect(result.code).not.toBe(0)
    expect(result.err).toMatch(/v9\.9\.9|not a valid object name|unknown revision|bad revision/i)
    expect(existsSync(join(root, "apps/www/src/content/docs/v0.1.0"))).toBe(false)
    expect(existsSync(join(root, "apps/www/src/content/versions/v0.1.0.json"))).toBe(false)
  })
})
