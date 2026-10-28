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

const DEFAULT_REGISTRY = "https://raw.githubusercontent.com/wshrx/flint-ui/main/registry"
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
    if (arg === "--root") root = rest[++i]
    else if (arg.startsWith("--root=")) root = arg.slice("--root=".length)
    else if (arg === "--registry") registry = rest[++i]
    else if (arg.startsWith("--registry=")) registry = arg.slice("--registry=".length)
    else if (arg.startsWith("--")) flags.add(arg)
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

async function readSource(source: string, path: string): Promise<Buffer> {
  if (isUrl(source)) {
    const response = await fetch(`${source}/${path}`)
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

function resolveRegistry(flag: string | undefined, config: FlintConfig | null): string {
  const chosen = flag ?? process.env.FLINT_REGISTRY ?? config?.registry ?? DEFAULT_REGISTRY
  if (isUrl(chosen)) return chosen.replace(/\/$/, "")
  return resolve(process.cwd(), chosen)
}

async function readConfig(): Promise<FlintConfig | null> {
  const path = join(process.cwd(), CONFIG)
  if (!existsSync(path)) return null
  return JSON.parse(await readFile(path, "utf8")) as FlintConfig
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
  dryRun = false
) {
  let written = 0
  let skipped = 0

  for (const item of items) {
    for (const file of item.files) {
      const target = join(process.cwd(), root, file.path)
      if (existsSync(target) && !overwrite) {
        console.log(`  ${dim(dryRun ? "would skip " : "skip")} ${file.path}`)
        skipped++
        continue
      }
      const bytes = await readSource(source, file.path)
      if (!dryRun) {
        await mkdir(dirname(target), { recursive: true })
        await writeFile(target, bytes)
      }
      console.log(`  ${dim(dryRun ? "would add  " : "add ")} ${file.path}`)
      written++
    }
  }

  return { written, skipped }
}

async function init(args: ReturnType<typeof parseArgs>) {
  const config = await readConfig()
  const root = args.root ?? config?.root ?? "src"
  const registry = resolveRegistry(args.registry, config)
  const next: FlintConfig = {
    $schema: "https://wshrx.github.io/flint-ui/schema/flint.json",
    root,
    registry,
  }

  const dryRun = args.flags.has("--dry-run")
  if (dryRun) {
    console.log(`\n${bold("flint")}  would write ${CONFIG}  ${dim(`root=${root}`)}`)
  } else {
    await writeFile(join(process.cwd(), CONFIG), `${JSON.stringify(next, null, 2)}\n`)
    console.log(`\n${bold("flint")}  wrote ${CONFIG}  ${dim(`root=${root}`)}`)
  }

  const data = await loadRegistry(registry)
  const items = collect(data.items, ["lib", "theme", "utils", "theme-provider", "text", "icon", "icons", "use-controllable", "fonts"])
  const { written, skipped } = await writeItems(registry, root, items, args.flags.has("--overwrite"), dryRun)

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
      const before = local.toString("utf8").split("\n").length
      const after = remote.toString("utf8").split("\n").length
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

async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.command === "--version" || args.command === "-v" || args.command === "version") {
    console.log(await readVersion())
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
      return
    default:
      fail(`Unknown command "${args.command}". Try ${bold("flint-ui help")}.`)
  }
}

main().catch((error: unknown) => {
  fail(error instanceof Error ? error.message : String(error))
})
