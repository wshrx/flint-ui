/**
 * Verifies the registry before it is published.
 *
 * The CLI trusts registry.json. If a path is wrong, a user finds out after the
 * copy failed halfway through their project, so this runs in CI and before a
 * release build.
 *
 * Usage: bun scripts/check-registry.ts [repo-root]
 *
 * The optional root makes the checker testable against a throwaway registry.
 */

import { existsSync } from "node:fs"
import { readFile, readdir } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

interface Item {
  name: string
  type: string
  registryDependencies?: string[]
  files: { path: string; type: string }[]
}

const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("..", import.meta.url))
const registry = join(root, "registry")
let data: { name?: string; items?: Item[] }
try {
  data = JSON.parse(await readFile(join(registry, "registry.json"), "utf8")) as {
    name?: string
    items?: Item[]
  }
} catch (error) {
  console.error(`registry.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
}
const errors: string[] = []

if (!Array.isArray(data.items) || data.items.length === 0) {
  console.error("  ✗ registry.json needs a non-empty items array")
  process.exit(1)
}

const items = new Map<string, Item>()
const listed = new Set<string>()
const allowed = /\.(tsx?|ttf|otf|txt|json)$/

/** True when `target` is a child of `base`, not `base` itself. */
function inside(base: string, target: string): boolean {
  const rel = relative(base, target)
  return rel.length > 0 && !rel.startsWith("..") && !isAbsolute(rel)
}

function escapes(path: string): boolean {
  if (isAbsolute(path)) return true
  if (/^[A-Za-z]:[\\/]/.test(path)) return true
  return path.split(/[\\/]+/).includes("..")
}

// Pass one: names, files and paths. Dependencies are checked after every item
// is known, so an item may depend on one that is declared later in the file.
for (const raw of data.items) {
  if (typeof raw !== "object" || raw === null) {
    errors.push("an item is not an object")
    continue
  }
  const item = raw as Item
  if (typeof item.name !== "string" || item.name.length === 0) {
    errors.push("an item has no name")
    continue
  }
  if (items.has(item.name)) errors.push(`duplicate item "${item.name}"`)
  items.set(item.name, item)

  if (!/^[a-z0-9-]+$/.test(item.name)) errors.push(`item "${item.name}": name must be kebab-case`)
  if (typeof item.type !== "string" || item.type.length === 0) {
    errors.push(`item "${item.name}": type must be a string`)
  }
  if (!Array.isArray(item.files) || item.files.length === 0) {
    errors.push(`item "${item.name}": files must be a non-empty array`)
    continue
  }

  for (const file of item.files) {
    if (typeof file !== "object" || file === null) {
      errors.push(`item "${item.name}": a file entry is not an object`)
      continue
    }
    if (typeof file.path !== "string" || file.path.length === 0) {
      errors.push(`item "${item.name}": a file has no path`)
      continue
    }
    if (escapes(file.path)) {
      errors.push(`item "${item.name}": path escapes the registry: ${file.path}`)
      continue
    }

    const full = resolve(registry, file.path)
    if (!inside(registry, full)) {
      errors.push(`item "${item.name}": path escapes the registry: ${file.path}`)
      continue
    }
    if (!existsSync(full)) errors.push(`item "${item.name}": missing file ${file.path}`)
    if (!allowed.test(file.path)) {
      errors.push(`item "${item.name}": unexpected file type ${file.path}`)
    }
    if (listed.has(file.path)) errors.push(`file ${file.path} is listed by more than one item`)
    listed.add(file.path)
    if (item.type === "registry:ui" && !file.path.startsWith("components/ui/")) {
      errors.push(`item "${item.name}": a UI file must live under components/ui/, not ${file.path}`)
    }
  }
}

// Pass two: dependencies. A missing dependency is an error, and a cycle is
// reported once with the path that closes it.
for (const item of items.values()) {
  if (item.registryDependencies === undefined) continue
  if (!Array.isArray(item.registryDependencies)) {
    errors.push(`item "${item.name}": registryDependencies must be an array`)
    continue
  }
  for (const dependency of item.registryDependencies) {
    if (typeof dependency !== "string") {
      errors.push(`item "${item.name}": a dependency is not a string`)
      continue
    }
    if (dependency === item.name) errors.push(`item "${item.name}" depends on itself`)
    else if (!items.has(dependency)) errors.push(`item "${item.name}": unknown dependency "${dependency}"`)
  }
}

const state = new Map<string, "visiting" | "done">()
const stack: string[] = []

function visit(name: string) {
  const seen = state.get(name)
  if (seen === "done") return
  if (seen === "visiting") {
    const start = stack.indexOf(name)
    errors.push(`dependency cycle: ${[...stack.slice(start), name].join(" -> ")}`)
    return
  }

  state.set(name, "visiting")
  stack.push(name)
  for (const dependency of items.get(name)?.registryDependencies ?? []) {
    if (dependency !== name && items.has(dependency)) visit(dependency)
  }
  stack.pop()
  state.set(name, "done")
}

for (const name of items.keys()) visit(name)

const uiDir = join(registry, "components/ui")

async function walkUi(dir: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      // components/ui/v0.1 is an archived docs snapshot, not a live item.
      if (!/^v\d/.test(entry.name)) files.push(...(await walkUi(full)))
    } else if (entry.isFile() && entry.name.endsWith(".tsx")) {
      files.push(relative(registry, full).split(sep).join("/"))
    }
  }
  return files
}

if (existsSync(uiDir)) {
  for (const file of await walkUi(uiDir)) {
    if (!listed.has(file)) errors.push(`${file} is not in registry.json`)
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `  ✗ ${error}`).join("\n"))
  process.exit(1)
}

console.log(`registry ok: ${data.items.length} items, ${listed.size} files`)
