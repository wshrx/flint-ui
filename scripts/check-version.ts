#!/usr/bin/env bun
/**
 * Reject skipped or out-of-order versions.
 *
 * The public history is one commit per release, so the version number is the
 * only thing that tells a reader how many releases there were. 0.1.1 → 0.1.3
 * makes it look like a release vanished.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const requested = process.argv[2]?.replace(/^v/, "")
if (!requested || !/^\d+\.\d+\.\d+$/.test(requested)) {
  console.error("usage: bun scripts/check-version.ts <major.minor.patch>")
  process.exit(2)
}

const tags = execFileSync("git", ["tag", "--list", "v*"], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim().replace(/^v/, ""))
  .filter((tag) => /^\d+\.\d+\.\d+$/.test(tag))
  .sort((a, b) => {
    const [am, an, ap] = a.split(".").map(Number)
    const [bm, bn, bp] = b.split(".").map(Number)
    return am! - bm! || an! - bn! || ap! - bp!
  })

const [major, minor, patch] = requested.split(".").map(Number) as [number, number, number]
const latest = tags.at(-1)
const [lm, ln, lp] = (latest ?? "0.0.0").split(".").map(Number) as [number, number, number]

let ok = false
if (!latest) ok = true
else if (major === lm && minor === ln) ok = patch === lp + 1
else if (major === lm && minor === ln + 1) ok = patch === 0
else if (major === lm + 1) ok = minor === 0 && patch === 0

if (!ok) {
  console.error(
    `version ${requested} does not follow ${latest ?? "none"}: ` +
      `expected ${lm}.${ln}.${lp + 1}, ${lm}.${ln + 1}.0 or ${lm + 1}.0.0`
  )
  process.exit(1)
}

for (const file of ["packages/cli/package.json", "packages/flint/package.json"]) {
  const version = JSON.parse(readFileSync(file, "utf8")).version
  if (version !== requested) {
    console.error(`${file} is at ${version}, expected ${requested}`)
    process.exit(1)
  }
}

const changelog = readFileSync("CHANGELOG.md", "utf8")
if (!changelog.includes(`## ${requested}`)) {
  console.error(`CHANGELOG.md has no "## ${requested}" section`)
  process.exit(1)
}

console.log(`version ${requested} follows ${latest ?? "nothing"}`)
