/**
 * Release gates have their own failure modes: a skipped version, a missing
 * docs archive, or release notes that are a list with no prose. They read the
 * working tree and local tags, so each one runs in a throwaway git repository.
 */
import { afterAll, describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const repo = join(import.meta.dir, "..")
const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function git(cwd: string, args: string[]) {
  const result = Bun.spawnSync(["git", ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  if (result.exitCode !== 0) throw new Error(result.stderr.toString())
  return result.stdout.toString()
}

function fixture(files: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "flint-release-"))
  roots.push(root)
  writeFileSync(join(root, "README.md"), "# fixture\n")
  for (const [path, content] of Object.entries(files)) {
    const full = join(root, path)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, content)
  }
  git(root, ["init", "-q"])
  git(root, ["add", "-A"])
  git(root, ["-c", "user.name=flint", "-c", "user.email=flint@localhost", "commit", "-q", "-m", "fixture"])
  return root
}

function tag(cwd: string, name: string) {
  git(cwd, ["tag", name])
}

function versions(version: string, files: Record<string, string> = {}) {
  return {
    "packages/flint/package.json": JSON.stringify({ name: "@flint-ui/react", version }, null, 2),
    "crates/flint-cli/Cargo.toml": `[package]\nname = "flint-ui"\nversion = "${version}"\nedition = "2024"\n`,
    ...files,
  }
}

function changelog(version: string) {
  return `# flint

## ${version}

This release adds a component and fixes a CLI bug that could leave a project half-written. It also
keeps the docs archive for the previous version, so every release stays readable.

- one change
`
}

function run(script: string, args: string[], cwd: string) {
  const result = Bun.spawnSync(["bun", join(repo, script), ...args], { cwd, stdout: "pipe", stderr: "pipe" })
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() }
}

describe("check-version", () => {
  test("accepts the next patch", () => {
    const root = fixture(versions("0.1.1", { "CHANGELOG.md": changelog("0.1.1") }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.1.1"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("follows 0.1.0")
  })

  test("accepts a minor release", () => {
    const root = fixture(versions("0.2.0", { "CHANGELOG.md": changelog("0.2.0") }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.2.0"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("follows 0.1.0")
  })

  test("accepts a major release", () => {
    const root = fixture(versions("1.0.0", { "CHANGELOG.md": changelog("1.0.0") }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["1.0.0"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("follows 0.1.0")
  })

  test("ignores its own tag when the release workflow runs after tagging", () => {
    const root = fixture(versions("0.1.0", { "CHANGELOG.md": changelog("0.1.0") }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.1.0"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("follows nothing")
  })

  test("ignores its own tag for a later release", () => {
    const root = fixture(versions("0.1.1", { "CHANGELOG.md": changelog("0.1.1") }))
    tag(root, "v0.1.0")
    tag(root, "v0.1.1")
    const result = run("scripts/check-version.ts", ["0.1.1"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("follows 0.1.0")
  })

  test("accepts the first release with no tags", () => {
    const root = fixture(versions("0.1.0", { "CHANGELOG.md": changelog("0.1.0") }))
    const result = run("scripts/check-version.ts", ["0.1.0"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("follows nothing")
  })

  test("rejects a skipped patch", () => {
    const root = fixture(versions("0.1.2", { "CHANGELOG.md": changelog("0.1.2") }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.1.2"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("does not follow 0.1.0")
    expect(result.err).toContain("expected 0.1.1")
  })

  test("rejects package files that were not bumped", () => {
    const root = fixture(
      versions("0.1.0", {
        "packages/flint/package.json": JSON.stringify({ name: "@flint-ui/react", version: "0.1.0" }, null, 2),
        "CHANGELOG.md": changelog("0.1.1"),
      })
    )
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("is at 0.1.0, expected 0.1.1")
  })

  test("rejects a thin or prose-free changelog section", () => {
    const root = fixture(versions("0.1.1", { "CHANGELOG.md": "# flint\n\n## 0.1.1\n\nSmall fix.\n" }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("too thin")
  })

  test("rejects a missing changelog section", () => {
    const root = fixture(versions("0.1.1", { "CHANGELOG.md": changelog("0.1.0") }))
    tag(root, "v0.1.0")
    const result = run("scripts/check-version.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain('CHANGELOG.md has no "## 0.1.1" section')
  })

  test("rejects a malformed version argument", () => {
    const root = fixture()
    const result = run("scripts/check-version.ts", ["0.1"], root)
    expect(result.code).toBe(2)
    expect(result.err).toContain("usage:")
  })
})

describe("check-docs", () => {
  const archive = {
    "apps/www/src/content/docs/v0.1.0/docs/installation.mdx": "---\ntitle: Installation\n---\n",
    "apps/www/src/content/versions/v0.1.0.json": '{"sidebar":[]}\n',
  }

  test("ignores its own tag when the workflow runs after tagging", () => {
    const root = fixture()
    tag(root, "v0.1.0")
    const result = run("scripts/check-docs.ts", ["0.1.0"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("first release")
  })

  test("accepts a release whose previous docs are archived", () => {
    const root = fixture(archive)
    tag(root, "v0.1.0")
    const result = run("scripts/check-docs.ts", ["0.1.1"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("0.1.0 archived")
  })

  test("ignores its own tag for a later release", () => {
    const root = fixture(archive)
    tag(root, "v0.1.0")
    tag(root, "v0.1.1")
    const result = run("scripts/check-docs.ts", ["0.1.1"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("0.1.0 archived")
  })

  test("rejects a release without the previous archive", () => {
    const root = fixture()
    tag(root, "v0.1.0")
    const result = run("scripts/check-docs.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("docs for the previous release 0.1.0 are missing")
  })

  test("accepts the first release", () => {
    const root = fixture()
    const result = run("scripts/check-docs.ts", ["0.1.0"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("first release")
  })

  test("rejects a malformed version argument", () => {
    const root = fixture()
    const result = run("scripts/check-docs.ts", ["0.1"], root)
    expect(result.code).toBe(2)
    expect(result.err).toContain("usage:")
  })
})

describe("changelog-section", () => {
  const prose = `## 0.1.1

This release adds a component and fixes a CLI bug that could leave a project half-written. It also
keeps the docs archive for the previous version, so every release stays readable.

- one change
- another change
`

  test("prints a prose section for release notes", () => {
    const root = fixture({ "CHANGELOG.md": `# flint\n\n${prose}\n## 0.1.0\n\nOld.\n` })
    const result = run("scripts/changelog-section.ts", ["0.1.1"], root)
    expect(result.code).toBe(0)
    expect(result.out).toContain("This release adds a component")
    expect(result.out).not.toContain("## 0.1.0")
  })

  test("rejects a missing section", () => {
    const root = fixture({ "CHANGELOG.md": "# flint\n\n## 0.1.0\n\nOld.\n" })
    const result = run("scripts/changelog-section.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain('CHANGELOG.md has no "## 0.1.1" section')
  })

  test("rejects a section that is too thin", () => {
    const root = fixture({ "CHANGELOG.md": "# flint\n\n## 0.1.1\n\nSmall fix.\n" })
    const result = run("scripts/changelog-section.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("too thin")
  })

  test("rejects a list with no prose", () => {
    const bullets = Array.from({ length: 8 }, (_, index) => `- bullet ${index} with enough words to make the section long`).join("\n")
    const root = fixture({ "CHANGELOG.md": `# flint\n\n## 0.1.1\n\n${bullets}\n` })
    const result = run("scripts/changelog-section.ts", ["0.1.1"], root)
    expect(result.code).toBe(1)
    expect(result.err).toContain("list with no prose")
  })

  test("rejects a missing version argument", () => {
    const root = fixture({ "CHANGELOG.md": "# flint\n" })
    const result = run("scripts/changelog-section.ts", [], root)
    expect(result.code).toBe(2)
    expect(result.err).toContain("usage:")
  })
})
