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
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("usage: bun scripts/check-docs.ts <major.minor.patch>")
  process.exit(2)
}

const tagList = Bun.spawnSync({ cmd: ["git", "tag", "--list", "v*"], stdout: "pipe", stderr: "pipe" })
if (tagList.exitCode !== 0) {
  const detail = tagList.stderr.toString().trim()
  console.error(`cannot list git tags: ${detail || `git exited ${tagList.exitCode}`}`)
  process.exit(1)
}

const tags = tagList.stdout
  .toString()
  .split("\n")
  .map((line) => line.trim().replace(/^v/, ""))
  .filter((tag) => /^\d+\.\d+\.\d+$/.test(tag))
  // The workflow runs with its own tag present; it is not the previous release.
  .filter((tag) => tag !== version)
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

// 0.1.0 shipped under the short slug `v0.1`; every later release uses the
// full `vX.Y.Z`. Accept either for 0.1.0 so the existing archive stays valid.
const slugs = previous === "0.1.0" ? ["v0.1.0", "v0.1"] : [`v${previous}`]
const found = slugs.find(
  (slug) =>
    existsSync(join("apps/www/src/content/docs", slug)) &&
    existsSync(join("apps/www/src/content/versions", `${slug}.json`))
)

if (!found) {
  console.error(`docs for the previous release ${previous} are missing:`)
  console.error(`  bun scripts/archive-docs.ts v${previous}`)
  process.exit(1)
}

console.log(`docs: ${previous} archived`)
