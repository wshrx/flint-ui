/**
 * One reader for the hand-written CHANGELOG sections.
 *
 * Both the version gate and the release-notes printer use it, so the "has a
 * section", "long enough" and "has prose" rules cannot drift.
 */
import { readFileSync } from "node:fs"

export function changelogSection(version: string, file = "CHANGELOG.md"): string | null {
  const lines = readFileSync(file, "utf8").split("\n")
  const start = lines.findIndex((line) => line.trim() === `## ${version}`)
  if (start === -1) return null

  let end = lines.length
  for (let index = start + 1; index < lines.length; index++) {
    if (/^## /.test(lines[index]!)) {
      end = index
      break
    }
  }

  return lines.slice(start + 1, end).join("\n").trim()
}

/** A section needs a sentence, not only bullets and headings. */
export function hasProse(body: string): boolean {
  return body
    .split(/\n\s*\n/)
    .some((block) => {
      const text = block.trim()
      if (text.length === 0) return false
      return !/^(?:[-*+]\s|\d+[.)]\s|#{1,6}\s)/.test(text)
    })
}
