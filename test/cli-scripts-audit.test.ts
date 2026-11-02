/**
 * Audit of the CLI, the release scripts and the repository tooling.
 *
 * These tests deliberately sit outside the existing suites: they cover failure
 * modes that the happy-path tests do not, and they assert the expected contract
 * (exit code plus message) rather than only that something was printed.
 *
 * Everything runs in a throwaway directory. The only git repositories are the
 * fixtures and the temporary bare remotes; nothing touches this checkout and
 * nothing reaches the network.
 *
 * Most of these tests fail on the audited revision on purpose: each failure is
 * the defect described by the test name. The two that pass cover previously
 * untested contracts (registry precedence and linkcheck).
 */
import { afterAll, describe, expect, test } from "bun:test"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

const repo = join(import.meta.dir, "..")
const cli = join(repo, "packages/cli/src/index.ts")
const archiveDocs = join(repo, "scripts/archive-docs.ts")
const checkDocs = join(repo, "scripts/check-docs.ts")
const checkVersion = join(repo, "scripts/check-version.ts")
const changelogSection = join(repo, "scripts/changelog-section.ts")
const anvil = join(repo, "tools/anvil.ts")
const publishScript = join(repo, "scripts/publish.ts")
const hasAnvil = existsSync(anvil)
const hasPublish = existsSync(publishScript)

const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function temp(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), `flint-audit-${prefix}-`))
  roots.push(dir)
  return dir
}

interface Result {
  code: number | null
  out: string
  err: string
}

function spawn(cwd: string, cmd: string[], env?: Record<string, string | undefined>): Result {
  const merged: Record<string, string | undefined> = { ...process.env, ...env }
  if (env) {
    for (const key of Object.keys(env)) {
      if (env[key] === undefined) delete merged[key]
    }
  }
  const result = Bun.spawnSync({
    cmd,
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: merged as Record<string, string>,
  })
  return { code: result.exitCode, out: result.stdout.toString(), err: result.stderr.toString() }
}

function bun(cwd: string, args: string[], env?: Record<string, string | undefined>): Result {
  return spawn(cwd, ["bun", ...args], env)
}

function git(cwd: string, args: string[]): string {
  const result = spawn(cwd, ["git", ...args])
  if (result.code !== 0) throw new Error(`git ${args.join(" ")} failed: ${result.err}`)
  return result.out
}

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
}

function initGit(dir: string) {
  git(dir, ["init", "-q"])
  git(dir, ["config", "user.email", "flint@localhost"])
  git(dir, ["config", "user.name", "flint"])
}

function makeRepo(prefix: string): string {
  const dir = temp(prefix)
  initGit(dir)
  return dir
}

function commitAll(dir: string, message = "fixture") {
  git(dir, ["add", "-A"])
  git(dir, ["commit", "-q", "-m", message])
}

function project(prefix: string): string {
  const dir = temp(prefix)
  write(join(dir, "package.json"), '{"name":"fixture","private":true}\n')
  return dir
}

interface Item {
  name: string
  type: string
  registryDependencies?: string[]
  files: { path: string; type: string }[]
}

function ui(name: string, dependencies: string[] = [], path = `components/ui/${name}.tsx`): Item {
  return {
    name,
    type: "registry:ui",
    registryDependencies: dependencies,
    files: [{ path, type: "registry:ui" }],
  }
}

function makeRegistry(base: string, items: unknown[], files: Record<string, string>): string {
  const registry = join(base, "registry")
  write(join(registry, "registry.json"), JSON.stringify({ name: "test", items }, null, 2))
  for (const [path, content] of Object.entries(files)) write(join(registry, path), content)
  return registry
}

const INIT_ITEMS = ["lib", "theme", "utils", "theme-provider", "text", "icon", "icons", "use-controllable", "fonts"]

const DOCS = {
  "apps/www/src/content/docs/docs/installation.mdx": `---
title: Installation
---

Install with the CLI.
`,
  "apps/www/src/content/docs/docs/components/button.mdx": `---
title: Button
---

A button.

## Source

<Code code={source} lang="tsx" />
`,
}

function writeDocs(dir: string, docs: Record<string, string>) {
  for (const [path, content] of Object.entries(docs)) write(join(dir, path), content)
}

function docsRepo(prefix: string): string {
  const dir = makeRepo(prefix)
  writeDocs(dir, DOCS)
  commitAll(dir)
  return dir
}

function bareRemote(prefix: string): string {
  const dir = temp(prefix)
  const target = join(dir, "remote.git")
  git(dir, ["init", "--bare", "-q", target])
  return target
}

function writeVersion(dir: string, version: string) {
  write(join(dir, "packages/cli/package.json"), JSON.stringify({ name: "flint-ui", version }, null, 2))
  write(join(dir, "packages/flint/package.json"), JSON.stringify({ name: "@flint-ui/react", version }, null, 2))
}

function publishFixture(prefix: string): string {
  const dir = makeRepo(prefix)
  mkdirSync(join(dir, "scripts"), { recursive: true })
  copyFileSync(join(repo, "scripts/publish.ts"), join(dir, "scripts/publish.ts"))
  write(
    join(dir, "package.json"),
    JSON.stringify({ name: "fixture", private: true, scripts: { release: "echo release", build: "echo build" } }, null, 2)
  )
  write(join(dir, "README.md"), "# fixture\n")
  writeVersion(dir, "0.1.0")
  commitAll(dir)
  git(dir, ["tag", "v0.1.0"])
  writeVersion(dir, "0.1.3")
  commitAll(dir)
  return dir
}

describe("CLI failure modes", () => {
  test("init leaves no flint.json when a registry file is missing", () => {
    const dir = temp("init-atomic")
    const items = INIT_ITEMS.map((name) => ({
      name,
      type: "registry:lib",
      registryDependencies: name === "lib" ? INIT_ITEMS.filter((entry) => entry !== "lib") : undefined,
      files: [{ path: `lib/${name}.ts`, type: "registry:lib" }],
    }))
    const files = Object.fromEntries(
      INIT_ITEMS.filter((name) => name !== "fonts").map((name) => [`lib/${name}.ts`, `export const ${name} = 1\n`])
    )
    const registry = makeRegistry(dir, items, files)
    const cwd = project("init-atomic-project")

    const result = bun(cwd, [cli, "init", "--registry", registry])

    expect(result.code).toBe(1)
    expect(result.err).toContain("Missing registry file")
    expect(existsSync(join(cwd, "flint.json"))).toBe(false)
  })

  test("a typo in --dry-run is rejected instead of writing files", () => {
    const dir = temp("unknown-flag")
    const registry = makeRegistry(dir, [ui("widget")], {
      "components/ui/widget.tsx": "export const Widget = 1\n",
    })
    const cwd = project("unknown-flag-project")

    const result = bun(cwd, [cli, "add", "widget", "--dryrun", "--registry", registry])

    expect(result.code).not.toBe(0)
    expect(existsSync(join(cwd, "src/components/ui/widget.tsx"))).toBe(false)
  })

  test("an absolute --root is honoured or rejected, never silently relocated", () => {
    const dir = temp("absolute-root")
    const registry = makeRegistry(dir, [ui("widget")], {
      "components/ui/widget.tsx": "export const Widget = 1\n",
    })
    const cwd = project("absolute-root-project")
    const target = join(dir, "absolute-output")

    const result = bun(cwd, [cli, "add", "widget", "--root", target, "--registry", registry])

    if (result.code === 0) {
      expect(existsSync(join(target, "components/ui/widget.tsx"))).toBe(true)
    } else {
      expect(result.err).toMatch(/root|absolute/i)
    }
  })

  test("a malformed flint.json names the file in the error", () => {
    const dir = temp("bad-config")
    const registry = makeRegistry(dir, [ui("widget")], {
      "components/ui/widget.tsx": "export const Widget = 1\n",
    })
    const cwd = project("bad-config-project")
    write(join(cwd, "flint.json"), "{ broken")

    const result = bun(cwd, [cli, "list", "--registry", registry])

    expect(result.code).toBe(1)
    expect(result.err).toContain("flint.json")
  })

  test("registry precedence is flag, then FLINT_REGISTRY, then flint.json", () => {
    const dir = temp("precedence")
    const config = makeRegistry(join(dir, "config"), [ui("widget")], {
      "components/ui/widget.tsx": "config\n",
    })
    const environment = makeRegistry(join(dir, "environment"), [ui("widget")], {
      "components/ui/widget.tsx": "environment\n",
    })
    const flag = makeRegistry(join(dir, "flag"), [ui("widget")], {
      "components/ui/widget.tsx": "flag\n",
    })
    const cwd = project("precedence-project")
    const output = join(cwd, "src/components/ui/widget.tsx")
    write(join(cwd, "flint.json"), JSON.stringify({ root: "src", registry: config }, null, 2))

    const byFlag = bun(cwd, [cli, "add", "widget", "--registry", flag], { FLINT_REGISTRY: environment })
    expect(byFlag.code).toBe(0)
    expect(readFileSync(output, "utf8")).toBe("flag\n")

    const byEnv = bun(cwd, [cli, "add", "widget", "--overwrite"], { FLINT_REGISTRY: environment })
    expect(byEnv.code).toBe(0)
    expect(readFileSync(output, "utf8")).toBe("environment\n")

    const byConfig = bun(cwd, [cli, "add", "widget", "--overwrite"], { FLINT_REGISTRY: undefined })
    expect(byConfig.code).toBe(0)
    expect(readFileSync(output, "utf8")).toBe("config\n")
  })
})

describe("release gates", () => {
  test("check-version does not accept 0.1.10 as the changelog entry for 0.1.1", () => {
    const dir = makeRepo("check-version-substring")
    writeVersion(dir, "0.1.1")
    write(join(dir, "CHANGELOG.md"), "# flint\n\n## 0.1.10\n\nNotes.\n")
    commitAll(dir)
    git(dir, ["tag", "v0.1.0"])

    const result = bun(dir, [checkVersion, "0.1.1"])

    expect(result.code).toBe(1)
    expect(result.err).toContain('CHANGELOG.md has no "## 0.1.1" section')
  })

  test("check-docs fails when git cannot establish the previous release", () => {
    const dir = temp("check-docs-no-git")
    write(join(dir, "README.md"), "# not a repository\n")

    const result = bun(dir, [checkDocs, "0.1.1"])

    expect(result.code).toBe(1)
    expect(result.err).toMatch(/git|tag|repositor/i)
  })

  test("an archive written as v0.1 satisfies check-docs for 0.1.1", () => {
    const dir = docsRepo("check-docs-legacy-slug")
    git(dir, ["tag", "v0.1.0"])

    const archive = bun(dir, [archiveDocs, "v0.1"])
    expect(archive.code).toBe(0)
    expect(existsSync(join(dir, "apps/www/src/content/docs/v0.1/docs/installation.mdx"))).toBe(true)

    const check = bun(dir, [checkDocs, "0.1.1"])
    expect(check.code).toBe(0)
  })

  test("archive-docs keeps the existing archive when --from fails", () => {
    const dir = docsRepo("archive-destructive")
    git(dir, ["tag", "v0.1.0"])

    const first = bun(dir, [archiveDocs, "v0.1.0"])
    expect(first.code).toBe(0)
    const archived = join(dir, "apps/www/src/content/docs/v0.1.0/docs/installation.mdx")
    const sidebar = join(dir, "apps/www/src/content/versions/v0.1.0.json")
    expect(existsSync(archived)).toBe(true)
    expect(existsSync(sidebar)).toBe(true)
    const before = readFileSync(archived, "utf8")

    const second = bun(dir, [archiveDocs, "v0.1.0", "--from", "v9.9.9"])

    expect(second.code).not.toBe(0)
    expect(existsSync(archived)).toBe(true)
    expect(readFileSync(archived, "utf8")).toBe(before)
  })

  test("archive-docs handles CRLF docs: slug, title and Source removal", () => {
    const dir = temp("archive-crlf")
    writeDocs(dir, {
      "apps/www/src/content/docs/docs/installation.mdx":
        "---\r\ntitle: Installation\r\n---\r\n\r\nInstall with the CLI.\r\n",
      "apps/www/src/content/docs/docs/components/button.mdx":
        "---\r\ntitle: Button\r\n---\r\n\r\nA button.\r\n\r\n## Source\r\n\r\n<Code />\r\n",
    })

    const result = bun(dir, [archiveDocs, "v0.1.1"])
    expect(result.code).toBe(0)

    const installation = readFileSync(
      join(dir, "apps/www/src/content/docs/v0.1.1/docs/installation.mdx"),
      "utf8"
    )
    expect(installation).toContain("slug: v0.1.1/docs/installation")

    const versions = JSON.parse(
      readFileSync(join(dir, "apps/www/src/content/versions/v0.1.1.json"), "utf8")
    ) as { sidebar: { items: { label: string }[] }[] }
    const labels = versions.sidebar.flatMap((group) => group.items.map((item) => item.label))
    expect(labels).toContain("Button")

    const button = readFileSync(
      join(dir, "apps/www/src/content/docs/v0.1.1/docs/components/button.mdx"),
      "utf8"
    )
    expect(button).not.toContain("## Source")
    expect(button).toContain("slug: v0.1.1/docs/components/button")
  })

  test("archive-docs treats --from=ref as a ref or rejects it, not as the working tree", () => {
    const dir = docsRepo("archive-from-equals")
    git(dir, ["tag", "v0.1.0"])
    const source = join(dir, "apps/www/src/content/docs/docs/installation.mdx")
    write(source, readFileSync(source, "utf8") + "\nWorking tree version.\n")

    const result = bun(dir, [archiveDocs, "v0.1.1", "--from=v0.1.0"])

    if (result.code === 0) {
      const archived = readFileSync(
        join(dir, "apps/www/src/content/docs/v0.1.1/docs/installation.mdx"),
        "utf8"
      )
      expect(archived).not.toContain("Working tree version.")
    } else {
      expect(result.err).toMatch(/--from/)
    }
  })

  test("changelog-section rejects a list written with * bullets", () => {
    const dir = temp("changelog-star-list")
    const bullets = Array.from(
      { length: 8 },
      (_, index) => `* change ${index} with enough words to make this section long enough`
    ).join("\n")
    write(join(dir, "CHANGELOG.md"), `# flint\n\n## 0.1.1\n\n${bullets}\n`)

    const result = bun(dir, [changelogSection, "0.1.1"])

    expect(result.code).toBe(1)
    expect(result.err).toContain("list with no prose")
  })
})

describe.skipIf(!hasPublish)("publish snapshot (needs scripts/publish.ts)", () => {
  test("the commit subject and tag use the version in the published ref, not the working tree", () => {
    const dir = publishFixture("publish-ref-version")
    const target = bareRemote("publish-ref-version-remote")

    const result = bun(dir, [join(dir, "scripts/publish.ts"), target, "main", "v0.1.0"])

    expect(result.code).toBe(0)
    const treeVersion = (
      JSON.parse(git(dir, ["--git-dir", target, "show", "main:packages/cli/package.json"])) as {
        version: string
      }
    ).version
    const subject = git(dir, ["--git-dir", target, "show", "--format=%s", "--no-patch", "main"]).trim()
    expect(treeVersion).toBe("0.1.0")
    expect(subject).toBe(`flint ${treeVersion}`)
  })

  test("a failed tag does not leave the branch published", () => {
    const dir = publishFixture("publish-tag-atomic")
    const target = bareRemote("publish-tag-atomic-remote")

    const result = bun(dir, [join(dir, "scripts/publish.ts"), target, "main", "HEAD"], {
      TAG: "bad..tag",
    })

    expect(result.code).not.toBe(0)
    const refs = git(dir, ["--git-dir", target, "for-each-ref", "--format=%(refname)"]).trim()
    expect(refs).toBe("")
  })
})

describe("tooling", () => {
  test.skipIf(!hasAnvil)("anvil review fails when the configured base ref does not exist (needs tools/anvil.ts)", () => {
    const dir = makeRepo("anvil-review")
    write(join(dir, "anvil.json"), JSON.stringify({ repo: "example/fixture", review: { base: "does-not-exist" } }))
    write(join(dir, "README.md"), "# fixture\n")
    commitAll(dir)

    const result = bun(dir, [anvil, "review"])

    expect(result.code).toBe(1)
    expect(result.err + result.out).toMatch(/does-not-exist|base|ref/i)
  })

  test("linkcheck enforces the /flint-ui base and accepts a resolvable link", () => {
    const dir = temp("linkcheck")
    mkdirSync(join(dir, "scripts"), { recursive: true })
    copyFileSync(join(repo, "scripts/linkcheck.ts"), join(dir, "scripts/linkcheck.ts"))
    const page = join(dir, "apps/www/dist/index.html")
    write(page, '<a href="/flint-ui/docs/ok/">ok</a>\n')
    write(join(dir, "apps/www/dist/docs/ok/index.html"), "<p>ok</p>\n")

    const good = bun(dir, [join(dir, "scripts/linkcheck.ts")])
    expect(good.code).toBe(0)
    expect(good.out).toContain("linkcheck ok")

    write(page, '<a href="/docs/ok/">no base</a>\n')
    const bad = bun(dir, [join(dir, "scripts/linkcheck.ts")])
    expect(bad.code).toBe(1)
    expect(bad.err).toContain("no /flint-ui prefix")
  })

  test("linkcheck fails when the build is empty or has no internal links", () => {
    const empty = temp("linkcheck-empty")
    mkdirSync(join(empty, "scripts"), { recursive: true })
    copyFileSync(join(repo, "scripts/linkcheck.ts"), join(empty, "scripts/linkcheck.ts"))
    mkdirSync(join(empty, "apps/www/dist"), { recursive: true })

    const noPages = bun(empty, [join(empty, "scripts/linkcheck.ts")])
    expect(noPages.code).toBe(1)
    expect(noPages.err).toContain("no HTML pages")

    write(join(empty, "apps/www/dist/index.html"), "<p>no links</p>\n")
    const noLinks = bun(empty, [join(empty, "scripts/linkcheck.ts")])
    expect(noLinks.code).toBe(1)
    expect(noLinks.err).toContain("no internal links")
  })

  test("the release workflow checks out the tag passed to workflow_dispatch", () => {
    const workflow = readFileSync(join(repo, ".github/workflows/release.yml"), "utf8")
    const start = workflow.indexOf("- uses: actions/checkout@v4")
    const end = workflow.indexOf("- uses:", start + 1)
    const checkout = workflow.slice(start, end === -1 ? undefined : end)

    expect(checkout).toContain("ref:")
    expect(checkout).toContain("inputs.tag")
  })
})
