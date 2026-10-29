#!/usr/bin/env bun
/**
 * Every release must have the previous version archived before the root starts
 * describing the next one.
 *
 *   bun scripts/check-docs.ts 0.1.3
 */
import { existsSync } from "node:fs"
import { join } from "node:path"

const version = process.argv[2]?.replace(/^v/, "")
if (!version) {
  console.error("usage: bun scripts/check-docs.ts <major.minor.patch>")
  process.exit(2)
}

const tags = (Bun.spawnSync({ cmd: ["git", "tag", "--list", "v*"], stdout: "pipe" }).stdout.toString())
  .split("\n")
  .map((line) => line.trim().replace(/^v/, ""))
  .filter((tag) => /^\d+\.\d+\.\d+$/.test(tag))
  .sort((a, b) => {
    const [am, an, ap] = a.split(".").map(Number)
    const [bm, bn, bp] = b.split(".").map(Number)
    return am! - bm! || an! - bn! || ap! - bp!
  })

const previous = tags.filter((tag) => {
  const [m, n, p] = tag.split(".").map(Number)
  const [vm, vn, vp] = version.split(".").map(Number)
  return m! < vm! || (m === vm && (n! < vn! || (n === vn && p! < vp!)))
}).at(-1)

if (!previous) {
  console.log(`docs: ${version} is the first release with an archive requirement`)
  process.exit(0)
}

const docs = join("apps/www/src/content/docs", `v${previous}`)
const config = join("apps/www/src/content/versions", `v${previous}.json`)

if (!existsSync(docs) || !existsSync(config)) {
  console.error(`docs for the previous release ${previous} are missing:`)
  console.error(`  bun scripts/archive-docs.ts v${previous}`)
  process.exit(1)
}

console.log(`docs: ${previous} archived`)
