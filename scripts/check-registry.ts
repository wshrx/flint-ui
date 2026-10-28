/**
 * Verifies the registry before it is published.
 *
 * The CLI trusts registry.json. If a path is wrong, a user finds out after the
 * copy failed halfway through their project, so this runs in CI and before a
 * release build.
 */

import { existsSync } from "node:fs"
import { readFile } from "node:fs/promises"
import { join, normalize, sep } from "node:path"

interface Item {
  name: string
  type: string
  registryDependencies?: string[]
  files: { path: string; type: string }[]
}

const root = new URL("..", import.meta.url).pathname
const registry = join(root, "registry")
const data = JSON.parse(await readFile(join(registry, "registry.json"), "utf8")) as { items: Item[] }
const items = new Map<string, Item>()
const errors: string[] = []

for (const item of data.items) {
  if (items.has(item.name)) errors.push(`duplicate item "${item.name}"`)
  items.set(item.name, item)

  if (!/^[a-z0-9-]+$/.test(item.name)) errors.push(`item "${item.name}": name must be kebab-case`)

  for (const file of item.files) {
    const clean = normalize(file.path)
    if (clean.startsWith("..") || clean.includes(`..${sep}`)) {
      errors.push(`item "${item.name}": path escapes the registry: ${file.path}`)
      continue
    }
    if (!existsSync(join(registry, clean))) errors.push(`item "${item.name}": missing file ${file.path}`)
    if (!/\.(tsx?|ttf|otf|txt|json)$/.test(file.path)) {
      errors.push(`item "${item.name}": unexpected file type ${file.path}`)
    }
  }

  for (const dependency of item.registryDependencies ?? []) {
    if (dependency === item.name) errors.push(`item "${item.name}" depends on itself`)
    else if (!items.has(dependency)) errors.push(`item "${item.name}": unknown dependency "${dependency}"`)
  }
}

const listed = new Set(data.items.flatMap((item) => item.files.map((file) => file.path)))
const uiDir = join(registry, "components/ui")
if (existsSync(uiDir)) {
  const { readdir } = await import("node:fs/promises")
  for (const file of await readdir(uiDir)) {
    if (file.endsWith(".tsx") && !listed.has(`components/ui/${file}`)) {
      errors.push(`components/ui/${file} is not in registry.json`)
    }
  }
}

if (errors.length > 0) {
  console.error(errors.map((error) => `  ✗ ${error}`).join("\n"))
  process.exit(1)
}

console.log(`registry ok: ${data.items.length} items, ${listed.size} files`)
