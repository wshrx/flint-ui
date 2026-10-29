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
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const registry = join(root, "registry")
const build = join(root, "packages/flint/.build")

await rm(build, { recursive: true, force: true })
await mkdir(build, { recursive: true })

await cp(join(registry, "components"), join(build, "components"), { recursive: true })
// Archived component sources exist for the docs, not for the package.
await rm(join(build, "components/ui/v0.1"), { recursive: true, force: true })
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
  const depth = file.slice(build.length + 1).split("/").length - 1
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

console.log(`prepared ${build.replace(root, "")} (${rewritten} files rewritten)`)
