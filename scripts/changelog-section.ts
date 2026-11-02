#!/usr/bin/env bun
/**
 * Print the CHANGELOG section for a version, for the GitHub release notes.
 *
 * The release workflow uses this instead of `--generate-notes`: a release body
 * is written by hand and has to read like one. The checks below reject an empty
 * section, a list with no prose, and the kind of one-liner that says nothing.
 */
import { changelogSection, hasProse } from "./lib/changelog.js"

const version = process.argv[2]?.replace(/^v/, "")
if (!version) {
  console.error("usage: bun scripts/changelog-section.ts <version>")
  process.exit(2)
}

const body = changelogSection(version)
if (body === null) {
  console.error(`CHANGELOG.md has no "## ${version}" section`)
  process.exit(1)
}

if (body.length < 160) {
  console.error(`the ${version} section is too thin for release notes (${body.length} chars)`)
  process.exit(1)
}

if (!hasProse(body)) {
  console.error(`the ${version} section is a list with no prose: say what changed and why`)
  process.exit(1)
}

process.stdout.write(body + "\n")
