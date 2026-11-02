/**
 * Builds @flint-ui/react from `registry/`.
 *
 * Registry files import through the project alias (`@/lib/flint/theme.js`)
 * because that is what a user's app looks like after `flint-ui add`. A package
 * cannot ship aliases, so this script copies the registry into `.build/`,
 * rewrites those specifiers to relative paths, and lets tsc emit from there.
 *
 * One source, two outputs, no copying by hand.
 */

import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const registry = join(root, "registry")
const build = join(root, "packages/flint/.build")

await rm(build, { recursive: true, force: true })
await mkdir(build, { recursive: true })

// Copy only the live UI sources. Archived snapshots live under
// components/ui/v0.1 and the docs read them through `?raw`; they must never
// enter the package.
const components = join(registry, "components/ui")
await mkdir(join(build, "components/ui"), { recursive: true })
for (const entry of await readdir(components, { withFileTypes: true })) {
  if (entry.isFile() && entry.name.endsWith(".tsx")) {
    await cp(join(components, entry.name), join(build, "components/ui", entry.name))
  }
}
await cp(join(registry, "lib"), join(build, "lib"), { recursive: true })
await writeFile(join(build, "index.ts"), await readFile(join(registry, "index.ts"), "utf8"))

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const files: string[] = []
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(full)))
    else if (/\.tsx?$/.test(entry.name)) files.push(full)
  }
  return files
}

function relativePrefix(file: string): string {
  // `relative` returns backslashes on Windows; count path segments on both
  // platforms instead of splitting on "/".
  const depth = relative(build, dirname(file)).split(sep).filter(Boolean).length
  return depth === 0 ? "./" : "../".repeat(depth)
}

let rewritten = 0
for (const file of await walk(build)) {
  const source = await readFile(file, "utf8")
  const prefix = relativePrefix(file)
  const next = source
    .replace(/(["'])@\/components\//g, `$1${prefix}components/`)
    .replace(/(["'])@\/lib\/flint\//g, `$1${prefix}lib/flint/`)
  if (next !== source) {
    await writeFile(file, next)
    rewritten++
  }
}

// A new alias prefix must fail loudly instead of leaking `@/...` into the
// published package, where no consumer resolves it.
const leftovers: string[] = []
for (const file of await walk(build)) {
  const source = await readFile(file, "utf8")
  // Ignore comments that mention the alias in prose.
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "")
  if (/(["'])@\//.test(code)) leftovers.push(file.slice(build.length + 1))
}
if (leftovers.length > 0) {
  console.error("package build left unresolved alias imports:")
  for (const file of leftovers) console.error(`  ${file}`)
  process.exit(1)
}

// The barrel is hand-maintained, so a new component can be added to
// registry.json and forgotten here. The package would build and ship without
// it, and `import { Progress } from "@flint-ui/react"` would fail at runtime.
const manifest = JSON.parse(await readFile(join(registry, "registry.json"), "utf8")) as {
  items: { name: string; type: string }[]
}
const barrel = await readFile(join(registry, "index.ts"), "utf8")
const missing = manifest.items
  .filter((item) => item.type === "registry:ui")
  .map((item) => `@/components/ui/${item.name}.js`)
  .filter((specifier) => !barrel.includes(specifier))
if (missing.length > 0) {
  console.error(`registry/index.ts is missing ${missing.length} UI export(s):`)
  for (const specifier of missing) console.error(`  ${specifier}`)
  process.exit(1)
}

console.log(`prepared ${build.replace(root, "")} (${rewritten} files rewritten)`)
