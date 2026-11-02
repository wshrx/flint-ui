/**
 * Meta-tests for the suite itself.
 *
 * These do not exercise the product. They keep the test suite honest: a skipped
 * test needs a stated reason, a test body needs an assertion, and a production
 * module must be reachable from at least one test. The audit reads source and
 * the registry manifest only, so it is deterministic and does not spawn a
 * process or touch the network.
 */
import { describe, expect, test } from "bun:test"
import { readFileSync, readdirSync } from "node:fs"
import { join, relative } from "node:path"

const root = join(import.meta.dir, "..")
const testDir = import.meta.dir
const SELF = "test-quality-audit.test.ts"

interface TestFile {
  name: string
  source: string
  lines: string[]
}

const files: TestFile[] = readdirSync(testDir)
  .filter((name) => name.endsWith(".test.ts") && name !== SELF)
  .sort()
  .map((name) => {
    const source = readFileSync(join(testDir, name), "utf8")
    return { name, source, lines: source.split("\n") }
  })

function lineNumber(source: string, index: number): number {
  return source.slice(0, index).split("\n").length
}

function isCommentLine(line: string): boolean {
  return /^\s*(\/\/|\/\*|\*|<!--)/.test(line)
}

interface Case {
  name: string
  line: number
  body: string
  skipped: boolean
}

/**
 * Find `test("name", () => { ... })`, `it(...)` and the platform alias used by
 * the native-only suites (`whenNative(...)`). The body is found with a brace
 * walker that skips strings and comments, so nested blocks and template
 * literals do not end the match early.
 */
function casesIn(file: TestFile): Case[] {
  const cases: Case[] = []
  const pattern =
    /\b(test|it|whenNative)\s*(?:\.(only|skip|todo))?\s*\(\s*(["'`])([^\n]*?)\3\s*,\s*(?:async\s*)?(?:\([^)]*\)|[\w$]+)\s*=>\s*\{/g

  for (const match of file.source.matchAll(pattern)) {
    const line = lineNumber(file.source, match.index!)
    if (isCommentLine(file.lines[line - 1] ?? "")) continue

    const open = match.index! + match[0].length - 1
    const close = matchingBrace(file.source, open)
    cases.push({
      name: match[4]!,
      line,
      body: file.source.slice(open + 1, close === -1 ? undefined : close),
      skipped: match[2] === "skip" || match[2] === "todo",
    })
  }

  return cases
}

function matchingBrace(source: string, open: number): number {
  let depth = 0
  let quote: string | null = null
  let lineComment = false
  let blockComment = false

  for (let index = open; index < source.length; index++) {
    const char = source[index]!
    const next = source[index + 1]

    if (lineComment) {
      if (char === "\n") lineComment = false
      continue
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false
        index++
      }
      continue
    }
    if (quote) {
      if (char === "\\") {
        index++
        continue
      }
      if (char === quote) quote = null
      continue
    }
    if (char === "/" && next === "/") {
      lineComment = true
      index++
      continue
    }
    if (char === "/" && next === "*") {
      blockComment = true
      index++
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char
      continue
    }
    if (char === "{") depth++
    else if (char === "}") {
      depth--
      if (depth === 0) return index
    }
  }

  return -1
}

function withoutComments(body: string): string {
  return body.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")
}

function hasAssertion(body: string): boolean {
  return /\b(?:expect|assert)\s*\(/.test(body)
}

function hasReason(file: TestFile, line: number, title = ""): boolean {
  const nearby = file.lines
    .slice(Math.max(0, line - 13), line + 5)
    .filter(isCommentLine)
    .join("\n")
  const header = file.lines.slice(0, 16).filter(isCommentLine).join("\n")
  const reason =
    /because|platform|linux|macos|windows|renderer|native|unsupported|intentional|requires|offline|unavailable|flaky|quarantine/i
  return reason.test(nearby) || reason.test(header) || reason.test(title)
}

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".build") return []
      return walk(full)
    }
    return /\.(?:tsx?)$/.test(entry.name) ? [relative(root, full).replaceAll("\\", "/")] : []
  })
}

const isArchived = (path: string) => /\/v\d+(?:\.\d+)*\//.test(path)

const manifest = JSON.parse(readFileSync(join(root, "registry/registry.json"), "utf8")) as {
  items: { name: string; type: string; files: { path: string }[] }[]
}
const manifestPaths = new Set(manifest.items.flatMap((item) => item.files.map((file) => `registry/${file.path}`)))
const testCorpus = files.map((file) => file.source).join("\n")

// registry.test.ts reads registry.json and walks item.files, so a manifested
// module is checked for existence and for the export its file name promises.
const manifestDriven = files.some(
  (file) =>
    file.source.includes("registry.json") && /\.files\b/.test(file.source) && /\.path\b/.test(file.source)
)

function hasExplicitReference(path: string): boolean {
  if (testCorpus.includes(path)) return true
  const bare = path.replace(/^registry\//, "")
  const specifier = `@/${bare.replace(/\.(?:tsx?)$/, ".js")}`
  return testCorpus.includes(specifier)
}

const registryModules = walk(join(root, "registry"))
const packageModules = walk(join(root, "packages"))
const modules = [...registryModules, ...packageModules].sort()

describe("suite invariants", () => {
  test("the audit can see the suite", () => {
    expect(files.length).toBeGreaterThan(0)
    expect(files.map((file) => file.name)).toContain("utils.test.ts")
    expect(modules.length).toBeGreaterThan(0)
    expect(manifest.items.length).toBeGreaterThan(0)
    expect(manifestDriven).toBe(true)
  })

  test("no test is focused with .only", () => {
    const offenders: string[] = []
    for (const file of files) {
      for (const match of file.source.matchAll(/\b(?:test|it|describe)\s*\.\s*only\b/g)) {
        const line = lineNumber(file.source, match.index!)
        if (!isCommentLine(file.lines[line - 1] ?? "")) offenders.push(`${file.name}:${line}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test("every skipped test carries a reason", () => {
    const offenders: string[] = []
    for (const file of files) {
      const cases = casesIn(file)
      for (const match of file.source.matchAll(/\b(?:test|it|describe)\s*\.\s*(?:skip|todo)\b/g)) {
        const line = lineNumber(file.source, match.index!)
        if (isCommentLine(file.lines[line - 1] ?? "")) continue
        const title = cases.find((entry) => entry.line === line)?.name ?? ""
        if (!hasReason(file, line, title)) offenders.push(`${file.name}:${line}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test("no test has an empty body", () => {
    const offenders: string[] = []
    for (const file of files) {
      for (const entry of casesIn(file)) {
        if (withoutComments(entry.body).replace(/[\s;]/g, "").length === 0) {
          offenders.push(`${file.name}:${entry.line} ${entry.name}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  test("every test file contains an assertion", () => {
    const offenders = files.filter((file) => !hasAssertion(file.source)).map((file) => file.name)
    expect(offenders).toEqual([])
  })

  test("every test case contains an assertion", () => {
    const offenders: string[] = []
    for (const file of files) {
      for (const entry of casesIn(file)) {
        if (!hasAssertion(entry.body)) offenders.push(`${file.name}:${entry.line} ${entry.name}`)
      }
    }
    expect(offenders).toEqual([])
  })

  test("no assertion compares a literal with itself", () => {
    const literal = /^(?:true|false|null|undefined|-?\d+(?:\.\d+)?|\[\]|\{\}|"[^"\n]*"|'[^'\n]*')$/
    const pattern =
      /\bexpect\s*\(\s*([^()\n]*?)\s*\)\s*\.\s*(toBe|toEqual|toStrictEqual|toBeTruthy|toBeFalsy|toBeDefined|toBeNull|toBeUndefined)\s*\(\s*([^()\n]*?)\s*\)/g
    const offenders: string[] = []

    for (const file of files) {
      for (const match of file.source.matchAll(pattern)) {
        const line = lineNumber(file.source, match.index!)
        if (isCommentLine(file.lines[line - 1] ?? "")) continue

        const left = match[1]!.trim()
        const matcher = match[2]!
        const right = match[3]!.trim()
        if (!literal.test(left)) continue

        const placeholder =
          matcher === "toBeTruthy" || matcher === "toBeDefined"
            ? left === "true" || left === "1" || /^["'][^"']+["']$/.test(left)
            : matcher === "toBeFalsy" || matcher === "toBeNull"
              ? left === "false" || left === "0" || left === "null"
              : matcher === "toBeUndefined"
                ? left === "undefined"
                : literal.test(right) && left.replace(/\s/g, "") === right.replace(/\s/g, "")

        if (placeholder) offenders.push(`${file.name}:${line} ${match[0]}`)
      }
    }

    expect(offenders).toEqual([])
  })

  test("every production module has a test reference", () => {
    const uncovered = modules.filter((path) => {
      if (isArchived(path)) return false
      if (hasExplicitReference(path)) return false
      return !(manifestDriven && manifestPaths.has(path))
    })
    expect(uncovered).toEqual([])
  })

  test("no registry source is orphaned from the manifest", () => {
    const barrels = new Set(["registry/index.ts", "registry/lib/flint/index.ts"])
    const orphans = registryModules.filter(
      (path) => !isArchived(path) && !manifestPaths.has(path) && !barrels.has(path)
    )
    expect(orphans).toEqual([])
    expect([...manifestPaths].filter(isArchived)).toEqual([])
  })
})
