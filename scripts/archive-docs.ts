#!/usr/bin/env bun
/**
 * Freeze the current docs as a versioned snapshot.
 *
 *   bun scripts/archive-docs.ts v0.1.3
 *   bun scripts/archive-docs.ts v0.1.1 --from v0.1.1
 *
 * Copies `apps/www/src/content/docs/docs` into `<slug>/` and writes the sidebar
 * snapshot the version plugin reads from `src/content/versions/<slug>.json`.
 * With `--from <ref>`, the docs are taken from that git ref instead of the
 * working tree, which is how a past release is archived after the fact.
 */
import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const slug = process.argv[2]
if (!slug || !/^v\d+\.\d+(\.\d+)?$/.test(slug)) {
  console.error("usage: bun scripts/archive-docs.ts <vX.Y[.Z]> [--from <ref>]")
  process.exit(2)
}

const fromIndex = process.argv.indexOf("--from")
const from = fromIndex === -1 ? null : process.argv[fromIndex + 1]
if (fromIndex !== -1 && !from) {
  console.error("--from needs a git ref")
  process.exit(2)
}

const root = process.cwd()
const docs = join(root, "apps/www/src/content/docs")
const target = join(docs, slug, "docs")
const versions = join(root, "apps/www/src/content/versions")

if (existsSync(join(docs, slug))) rmSync(join(docs, slug), { recursive: true, force: true })

if (from) {
  const tmp = mkdtempSync(join(tmpdir(), "flint-docs-"))
  try {
    execFileSync("git", ["archive", from, "apps/www/src/content/docs/docs"], { cwd: root, stdio: "pipe" })
    const tar = execFileSync("git", ["archive", from, "apps/www/src/content/docs/docs"], { cwd: root })
    execFileSync("tar", ["-x", "-C", tmp], { input: tar })
    cpSync(join(tmp, "apps/www/src/content/docs/docs"), target, { recursive: true })
  } finally {
    rmSync(tmp, { recursive: true, force: true })
  }
} else {
  cpSync(join(docs, "docs"), target, { recursive: true })
}

const readTitle = (file: string) => {
  const front = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/)
  const title = front?.[1].match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "")
  return title ?? file
}

const start: { label: string; slug: string }[] = []
for (const [file, label] of [
  ["installation.mdx", "Installation"],
  ["theming.mdx", "Theming"],
  ["cli.mdx", "CLI"],
  ["registry.mdx", "Registry"],
  ["license.mdx", "License"],
] as const) {
  if (existsSync(join(target, file))) start.push({ label, slug: `docs/${file.replace(/\.mdx$/, "")}` })
}

const componentsDir = join(target, "components")
const components = existsSync(componentsDir)
  ? readdirSync(componentsDir)
      .filter((file) => file.endsWith(".mdx"))
      .sort()
      .map((file) => ({
        label: readTitle(join(componentsDir, file)),
        slug: `docs/components/${file.replace(/\.mdx$/, "")}`,
      }))
  : []

// Archived pages get their version in the slug and lose the Source block: the
// component file at that release is not in the working tree, and showing the
// current one would be a lie.
function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? pages(full) : /[.](md|mdx)$/.test(entry) ? [full] : []
  })
}

for (const file of pages(target)) {
  const relative = file.slice(target.length + 1).replace(/[.](md|mdx)$/, "")
  let text = readFileSync(file, "utf8")
  if (!/^slug:/m.test(text)) {
    text = text.replace(/^---\n([\s\S]*?)\n---/, (_match, front: string) => `---\n${front}\nslug: ${slug}/docs/${relative}\n---`)
  }
  text = text.replace(/^import \{ Code \} from "@astrojs\/starlight\/components"\n/m, "")
  text = text.replace(/^import source from .*\?raw"\n/m, "")
  text = text.replace(/\n## Source\n[\s\S]*$/, "\n")
  writeFileSync(file, text)
}

mkdirSync(versions, { recursive: true })
writeFileSync(
  join(versions, `${slug}.json`),
  JSON.stringify(
    {
      sidebar: [
        { label: "Start here", items: start },
        { label: "Components", items: [{ label: "All components", slug: "docs/components" }, ...components] },
      ],
      excluded: ["", "docs/versioning"],
    },
    null,
    2
  ) + "\n"
)

console.log(`${slug}: ${start.length} start pages, ${components.length} components -> ${target}`)
