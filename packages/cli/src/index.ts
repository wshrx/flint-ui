#!/usr/bin/env bun
/**
 * flint-ui — add flint components to a GPUIX app.
 *
 *   flint-ui init
 *   flint-ui add button dialog tabs
 *   flint-ui list
 *
 * There is no build step in the user's project and no runtime package: the
 * files are copied, imports go through `@/`, and the user owns the code.
 */

import { existsSync } from "node:fs"
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { dirname, isAbsolute, join, resolve } from "node:path"

const FETCH_TIMEOUT_MS = 30_000
const HEAD_TIMEOUT_MS = 10_000

const REGISTRY_BASE = "https://raw.githubusercontent.com/wshrx/flint-ui"
const DEFAULT_REGISTRY = `${REGISTRY_BASE}/main/registry`
const CONFIG = "flint.json"

interface RegistryFile {
  path: string
  type: string
}

interface RegistryItem {
  name: string
  type: string
  description?: string
  registryDependencies?: string[]
  files: RegistryFile[]
}

interface Registry {
  name: string
  items: RegistryItem[]
}

interface FlintConfig {
  $schema?: string
  root: string
  registry: string
}

function parseArgs(argv: string[]) {
  const [command, ...rest] = argv
  const names: string[] = []
  const flags = new Set<string>()
  let root: string | undefined
  let registry: string | undefined

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]
    if (!arg) continue
    if (arg === "--root") {
      const value = rest[++i]
      if (value === undefined) fail("--root needs a directory")
      root = value
    } else if (arg.startsWith("--root=")) root = arg.slice("--root=".length)
    else if (arg === "--registry") {
      const value = rest[++i]
      if (value === undefined) fail("--registry needs a path or URL")
      registry = value
    } else if (arg.startsWith("--registry=")) registry = arg.slice("--registry=".length)
    else if (arg === "--dry-run" || arg === "--overwrite" || arg === "--help") flags.add(arg)
    else if (arg.startsWith("--")) fail(`Unknown flag "${arg}". Try ${bold("flint-ui help")}.`)
    else names.push(arg)
  }

  return { command, names, flags, root, registry }
}

function bold(text: string) {
  return `\u001b[1m${text}\u001b[0m`
}

function dim(text: string) {
  return `\u001b[2m${text}\u001b[0m`
}

function fail(message: string): never {
  console.error(`\n${message}\n`)
  process.exit(1)
}

function isUrl(source: string) {
  return source.startsWith("http://") || source.startsWith("https://")
}

/**
 * A registry file path is relative to the registry root. Absolute paths and
 * `..` segments would let a registry write outside the project, so both are
 * rejected before a single byte is copied.
 */
function escapes(path: string): boolean {
  if (isAbsolute(path)) return true
  if (/^[A-Za-z]:[\\/]/.test(path)) return true
  return path.split(/[\\/]+/).includes("..")
}

/** Lines in a file, not counting the empty tail after the final newline. */
function lineCount(text: string): number {
  if (text.length === 0) return 0
  const lines = text.split("\n").length
  return text.endsWith("\n") ? lines - 1 : lines
}

async function readSource(source: string, path: string): Promise<Buffer> {
  if (isUrl(source)) {
    const response = await fetch(`${source}/${path}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) })
    if (!response.ok) fail(`Could not download ${path} (${response.status})`)
    return Buffer.from(await response.arrayBuffer())
  }
  const full = join(source, path)
  if (!existsSync(full)) fail(`Missing registry file: ${full}`)
  return readFile(full)
}

function validateRegistry(data: unknown): Registry {
  const invalid = (message: string): never => fail(`Invalid registry: ${message}`)
  if (typeof data !== "object" || data === null) invalid("registry.json must be an object")

  const registry = data as { name?: unknown; items?: unknown }
  if (!Array.isArray(registry.items) || registry.items.length === 0) invalid('"items" must be a non-empty array')

  const items = registry.items as unknown[]
  const names = new Set<string>()

  for (const [index, raw] of items.entries()) {
    if (typeof raw !== "object" || raw === null) invalid(`items[${index}] must be an object`)
    const item = raw as Record<string, unknown>

    if (typeof item.name !== "string" || item.name.length === 0) invalid(`items[${index}] needs a name`)
    const name = item.name as string
    if (names.has(name)) invalid(`duplicate item "${name}"`)
    names.add(name)

    if (typeof item.type !== "string") invalid(`"${name}" needs a type`)
    if (!Array.isArray(item.files) || item.files.length === 0) invalid(`"${name}" needs at least one file`)

    for (const entry of item.files as unknown[]) {
      if (typeof entry !== "object" || entry === null) invalid(`"${name}" has a file entry that is not an object`)
      const path = (entry as Record<string, unknown>).path
      if (typeof path !== "string" || path.length === 0) invalid(`"${name}" has a file without a path`)
      if (escapes(path as string)) invalid(`"${name}" has a file path that escapes the registry: ${path}`)
      const type = (entry as Record<string, unknown>).type
      if (type !== undefined && typeof type !== "string") invalid(`"${name}" has a file with a non-string type`)
    }

    if (item.registryDependencies !== undefined) {
      if (!Array.isArray(item.registryDependencies)) invalid(`"${name}" registryDependencies must be an array`)
      for (const dependency of item.registryDependencies as unknown[]) {
        if (typeof dependency !== "string") invalid(`"${name}" has a non-string dependency`)
      }
    }
  }

  const typed = items as RegistryItem[]
  for (const item of typed) {
    for (const dependency of item.registryDependencies ?? []) {
      if (!names.has(dependency)) invalid(`"${item.name}" depends on "${dependency}", which is not in the registry`)
    }
  }

  return { name: typeof registry.name === "string" ? registry.name : "registry", items: typed }
}

async function loadRegistry(source: string): Promise<Registry> {
  const bytes = await readSource(source, "registry.json")
  let parsed: unknown
  try {
    parsed = JSON.parse(bytes.toString("utf8"))
  } catch (error) {
    fail(`Invalid registry: registry.json is not JSON (${error instanceof Error ? error.message : String(error)})`)
  }
  return validateRegistry(parsed)
}

/**
 * A release pins its own registry: `v0.1.4/registry` is frozen, `main` moves.
 * When the tag is not published yet (working on the CLI itself), fall back to
 * main so development still works.
 */
async function pinnedRegistry(version: string): Promise<string> {
  if (!/^\d+\.\d+\.\d+$/.test(version)) return DEFAULT_REGISTRY
  const pinned = `${REGISTRY_BASE}/v${version}/registry`
  try {
    const response = await fetch(`${pinned}/registry.json`, {
      method: "HEAD",
      signal: AbortSignal.timeout(HEAD_TIMEOUT_MS),
    })
    if (response.ok) return pinned
  } catch {
    // offline, or the tag is not public: the moving registry is the fallback
  }
  return DEFAULT_REGISTRY
}

function resolveRegistry(flag: string | undefined, config: FlintConfig | null): string {
  const chosen = flag ?? process.env.FLINT_REGISTRY ?? config?.registry ?? DEFAULT_REGISTRY
  if (isUrl(chosen)) return chosen.replace(/\/$/, "")
  return resolve(process.cwd(), chosen)
}

async function readConfig(): Promise<FlintConfig | null> {
  const path = join(process.cwd(), CONFIG)
  if (!existsSync(path)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(path, "utf8"))
  } catch (error) {
    fail(`${CONFIG} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    fail(`${CONFIG} must contain a JSON object`)
  }
  const config = parsed as Record<string, unknown>
  if (config.root !== undefined && typeof config.root !== "string") fail(`${CONFIG}: "root" must be a string`)
  if (config.registry !== undefined && typeof config.registry !== "string") {
    fail(`${CONFIG}: "registry" must be a string`)
  }
  return config as unknown as FlintConfig
}

function collect(items: RegistryItem[], names: string[]): RegistryItem[] {
  const byName = new Map(items.map((item) => [item.name, item]))
  const picked: RegistryItem[] = []
  const seen = new Set<string>()

  const visit = (name: string) => {
    if (seen.has(name)) return
    const item = byName.get(name)
    if (!item) {
      fail(`Unknown component "${name}". Run ${bold("flint-ui list")} to see what exists.`)
    }
    seen.add(name)
    for (const dependency of item.registryDependencies ?? []) visit(dependency)
    picked.push(item)
  }

  for (const name of names) visit(name)
  return picked
}

async function writeItems(
  source: string,
  root: string,
  items: RegistryItem[],
  overwrite: boolean,
  dryRun = false,
  beforeWrite?: () => Promise<void>
) {
  // Read every source before writing the first file. A missing file in the
  // middle of a registry used to leave the project half-updated; now the
  // failure happens before the user's tree changes.
  const pending: Array<{ path: string; target: string; bytes: Buffer }> = []
  const skippedFiles: string[] = []
  const base = resolve(process.cwd(), root)

  for (const item of items) {
    for (const file of item.files) {
      const target = join(base, file.path)
      if (existsSync(target) && !overwrite) {
        skippedFiles.push(file.path)
        continue
      }
      pending.push({ path: file.path, target, bytes: await readSource(source, file.path) })
    }
  }

  if (!dryRun) {
    // `init` passes a callback so flint.json is written only after every
    // registry source has been read successfully.
    await beforeWrite?.()
    for (const entry of pending) {
      await mkdir(dirname(entry.target), { recursive: true })
      await writeFile(entry.target, entry.bytes)
    }
  }

  for (const path of skippedFiles) console.log(`  ${dim(dryRun ? "would skip " : "skip")} ${path}`)
  for (const entry of pending) console.log(`  ${dim(dryRun ? "would add  " : "add ")} ${entry.path}`)

  return { written: pending.length, skipped: skippedFiles.length }
}

async function init(args: ReturnType<typeof parseArgs>) {
  const config = await readConfig()
  const root = args.root ?? config?.root ?? "src"
  const explicit = args.registry ?? process.env.FLINT_REGISTRY ?? config?.registry
  const registry = explicit ? resolveRegistry(args.registry, config) : await pinnedRegistry(await readVersion())
  const next: FlintConfig = {
    $schema: "https://wshrx.github.io/flint-ui/schema/flint.json",
    root,
    registry,
  }

  // `lib` depends on every shared item, so one name is enough. The old
  // hardcoded list drifted whenever the shared layer grew.
  const data = await loadRegistry(registry)
  const items = collect(data.items, ["lib"])

  const dryRun = args.flags.has("--dry-run")
  if (dryRun) console.log(`\n${bold("flint")}  would write ${CONFIG}  ${dim(`root=${root}`)}`)
  const { written, skipped } = await writeItems(
    registry,
    root,
    items,
    args.flags.has("--overwrite"),
    dryRun,
    async () => {
      await writeFile(join(process.cwd(), CONFIG), `${JSON.stringify(next, null, 2)}\n`)
      console.log(`\n${bold("flint")}  wrote ${CONFIG}  ${dim(`root=${root}`)}`)
    }
  )

  console.log(`\n${written} file(s) ${dryRun ? "would be added" : "added"}, ${skipped} skipped\n`)
  console.log("Next:")
  console.log(`  ${dim("1.")} tsconfig.json → "jsxImportSource": "@gpuix/react" and paths: { "@/*": ["./${root}/*"] }`)
  console.log(`  ${dim("2.")} wrap the app in <ThemeProvider>`)
  console.log(`  ${dim("3.")} flint-ui add button dialog select`)
  console.log("")
}

async function add(args: ReturnType<typeof parseArgs>) {
  const config = await readConfig()
  const root = args.root ?? config?.root ?? "src"
  const registry = resolveRegistry(args.registry, config)

  if (args.names.length === 0) fail(`Name at least one component: ${bold("flint-ui add button")}`)

  const data = await loadRegistry(registry)
  const items = collect(data.items, args.names)
  const dryRun = args.flags.has("--dry-run")
  const { written, skipped } = await writeItems(registry, root, items, args.flags.has("--overwrite"), dryRun)

  console.log(`\n${written} file(s) ${dryRun ? "would be added" : "added"}, ${skipped} skipped`)
  if (skipped > 0) console.log(dim("Files that already exist were left alone. Use --overwrite to replace them."))
  console.log("")
}

async function list(args: ReturnType<typeof parseArgs>) {
  const config = await readConfig()
  const registry = resolveRegistry(args.registry, config)
  const data = await loadRegistry(registry)

  const ui = data.items.filter((item) => item.type === "registry:ui")
  const lib = data.items.filter((item) => item.type !== "registry:ui")

  console.log(`\n${bold("components")}`)
  for (const item of ui) console.log(`  ${item.name.padEnd(12)} ${dim(item.description ?? "")}`)
  console.log(`\n${bold("shared")}`)
  for (const item of lib) console.log(`  ${item.name.padEnd(12)} ${dim(item.description ?? "")}`)
  console.log("")
}

async function diff(args: ReturnType<typeof parseArgs>) {
  const config = await readConfig()
  const root = args.root ?? config?.root ?? "src"
  const registry = resolveRegistry(args.registry, config)

  if (args.names.length === 0) fail(`Name at least one component: ${bold("flint-ui diff button")}`)

  const data = await loadRegistry(registry)
  const items = collect(data.items, args.names)

  let changed = 0
  let missing = 0
  let unchanged = 0

  for (const item of items) {
    for (const file of item.files) {
      const target = join(process.cwd(), root, file.path)
      const remote = await readSource(registry, file.path)

      if (!existsSync(target)) {
        console.log(`  ${dim("missing ")} ${file.path}`)
        missing++
        continue
      }

      const local = await readFile(target)
      if (local.equals(remote)) {
        unchanged++
        continue
      }

      changed++
      const before = lineCount(local.toString("utf8"))
      const after = lineCount(remote.toString("utf8"))
      console.log(`  ${dim("changed ")} ${file.path} ${dim(`(${before} → ${after} lines)`)}`)
    }
  }

  console.log(`\n${changed} changed, ${missing} missing, ${unchanged} unchanged`)
  if (changed + missing > 0) process.exitCode = 1
}

async function readVersion(): Promise<string> {
  // A compiled binary has no package.json next to it; the release build injects
  // the version with `bun build --define process.env.FLINT_VERSION`.
  if (process.env.FLINT_VERSION) return process.env.FLINT_VERSION
  try {
    const raw = await readFile(new URL("../package.json", import.meta.url), "utf8")
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0"
  } catch {
    return "0.0.0"
  }
}

function help() {
  console.log(`
${bold("flint-ui")} — UI for GPUIX

  ${bold("init")}                 write flint.json and copy the shared files
  ${bold("add")} <component...>   copy components and their dependencies
  ${bold("list")}                 list the registry
  ${bold("diff")} <component...>   compare local files with the registry
  ${bold("--version")}            print the CLI version

  ${dim("--root <dir>")}          where the files go (default: src)
  ${dim("--registry <path|url>")}  registry location
  ${dim("--overwrite")}           replace existing files
  ${dim("--dry-run")}             print what would be written, write nothing
`)
}

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.command === "--version" || args.command === "-v" || args.command === "version") {
    console.log(await readVersion())
    return
  }

  if (args.flags.has("--help")) {
    help()
    return
  }

  switch (args.command) {
    case "init":
      await init(args)
      return
    case "add":
      await add(args)
      return
    case "list":
    case "ls":
      await list(args)
      return
    case "diff":
      await diff(args)
      return
    case undefined:
    case "--help":
    case "help":
      help()
      return
    default:
      fail(`Unknown command "${args.command}". Try ${bold("flint-ui help")}.`)
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
