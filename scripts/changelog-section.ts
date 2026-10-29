#!/usr/bin/env bun
/**
 * Print the CHANGELOG section for a version, for the GitHub release notes.
 *
 * The release workflow uses this instead of `--generate-notes`: a release body
 * is written by hand and has to read like one. The checks below reject an empty
 * section, a list with no prose, and the kind of one-liner that says nothing.
 */
import { readFileSync } from "node:fs"

const version = process.argv[2]?.replace(/^v/, "")
if (!version) {
  console.error("usage: bun scripts/changelog-section.ts <version>")
  process.exit(2)
}

const lines = readFileSync("CHANGELOG.md", "utf8").split("\n")
const start = lines.findIndex((line) => line.trim() === `## ${version}`)

if (start === -1) {
  console.error(`CHANGELOG.md has no "## ${version}" section`)
  process.exit(1)
}

let end = lines.length
for (let i = start + 1; i < lines.length; i++) {
  if (/^## /.test(lines[i]!)) {
    end = i
    break
  }
}

const body = lines.slice(start + 1, end).join("\n").trim()

if (body.length < 160) {
  console.error(`the ${version} section is too thin for release notes (${body.length} chars)`)
  process.exit(1)
}

const prose = body
  .split(/\n\s*\n/)
  .filter((block) => block.trim().length > 0 && !block.trimStart().startsWith("- "))

if (prose.length === 0) {
  console.error(`the ${version} section is a list with no prose: say what changed and why`)
  process.exit(1)
}

process.stdout.write(body + "\n")
