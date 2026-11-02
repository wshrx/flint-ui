/**
 * Static link check for the built docs.
 *
 * Every href/src in dist must resolve to a file in dist. Absolute internal
 * links must carry the /flint-ui base; a bare /docs/... is the failure mode
 * GitHub Pages produces.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const dist = join(root, "apps/www/dist")
const base = "/flint-ui"

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? walk(full) : full.endsWith(".html") ? [full] : []
  })
}

function resolve(pathname: string): boolean {
  const clean = pathname.split("#")[0]!.split("?")[0]!
  if (!clean) return true
  const rel = clean.startsWith(base) ? clean.slice(base.length) : clean
  const target = join(dist, rel)
  if (existsSync(target) && statSync(target).isDirectory()) return existsSync(join(target, "index.html"))
  if (existsSync(target)) return true
  return existsSync(join(target, "index.html"))
}

const pages = walk(dist)
if (pages.length === 0) {
  console.error(`linkcheck: no HTML pages in ${dist}`)
  process.exit(1)
}

const missing: string[] = []
let checked = 0

for (const page of pages) {
  const html = readFileSync(page, "utf8")
  for (const match of html.matchAll(/(?:href|src)=(["'])(.*?)\1/g)) {
    const url = match[2]!
    if (!url || url.startsWith("http") || url.startsWith("mailto:") || url.startsWith("data:")) continue
    if (url.startsWith("#")) continue
    if (!url.startsWith("/") && !url.startsWith(".")) continue
    checked++
    if (url.startsWith("/") && !url.startsWith(base)) {
      missing.push(`${page.slice(dist.length)} → ${url} (no ${base} prefix)`)
      continue
    }
    if (!resolve(url.startsWith(".") ? new URL(url, `https://x${base}${"/" + page.slice(dist.length + 1)}`).pathname : url)) {
      missing.push(`${page.slice(dist.length)} → ${url}`)
    }
  }
}

console.log(`linkcheck: ${pages.length} pages, ${checked} internal links`)

if (checked === 0) {
  console.error("linkcheck: no internal links found; the build or the parser is wrong")
  process.exit(1)
}

if (missing.length > 0) {
  console.error(`\n${missing.length} broken:`)
  for (const item of missing.slice(0, 30)) console.error("  " + item)
  process.exit(1)
}

console.log("linkcheck ok")
