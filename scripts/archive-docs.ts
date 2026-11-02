#!/usr/bin/env bun
/**
 * Freeze the current docs as a versioned snapshot.
 *
 *   bun scripts/archive-docs.ts v0.1.3
 *   bun scripts/archive-docs.ts v0.1.1 --from v0.1.1
 *   bun scripts/archive-docs.ts v0.1.1 --from=v0.1.1
 *
 * Copies `apps/www/src/content/docs/docs` into `<slug>/` and writes the sidebar
 * snapshot the version plugin reads from `src/content/versions/<slug>.json`.
 * With `--from <ref>`, the docs are taken from that git ref instead of the
 * working tree, which is how a past release is archived after the fact.
 *
 * The archive is staged before it replaces anything: a bad ref or a failed copy
 * leaves the previous archive intact.
 */
import { execFileSync } from "node:child_process"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, sep } from "node:path"

const slug = process.argv[2]
if (!slug || !/^v\d+\.\d+(\.\d+)?$/.test(slug)) {
  console.error("usage: bun scripts/archive-docs.ts <vX.Y[.Z]> [--from <ref>]")
  process.exit(2)
}

let from: string | null = null
for (let index = 3; index < process.argv.length; index++) {
  const arg = process.argv[index]!
  if (arg === "--from") {
    from = process.argv[++index] ?? null
    if (!from) {
      console.error("--from needs a git ref")
      process.exit(2)
    }
  } else if (arg.startsWith("--from=")) {
    from = arg.slice("--from=".length)
    if (!from) {
      console.error("--from needs a git ref")
      process.exit(2)
    }
  } else {
    console.error(`unknown argument: ${arg}`)
    process.exit(2)
  }
}

const root = process.cwd()
const docs = join(root, "apps/www/src/content/docs")
const target = join(docs, slug, "docs")
const versions = join(root, "apps/www/src/content/versions")
const staging = mkdtempSync(join(tmpdir(), "flint-docs-"))
const tempSlug = join(docs, `.${slug}.tmp-${process.pid}`)

const readTitle = (file: string) => {
  const front = readFileSync(file, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/)
  const title = front?.[1]?.match(/^title:\s*(.+)$/m)?.[1]?.trim().replace(/^["']|["']$/g, "")
  return title ?? file
}

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry)
    return statSync(full).isDirectory() ? pages(full) : /[.](md|mdx)$/.test(entry) ? [full] : []
  })
}

try {
  const stagedDocs = join(staging, "docs")
  if (from) {
    const tar = execFileSync("git", ["archive", from, "apps/www/src/content/docs/docs"], {
      cwd: root,
      stdio: "pipe",
    })
    execFileSync("tar", ["-x", "-C", staging], { input: tar })
    cpSync(join(staging, "apps/www/src/content/docs/docs"), stagedDocs, { recursive: true })
  } else {
    cpSync(join(docs, "docs"), stagedDocs, { recursive: true })
  }

  const start: { label: string; slug: string }[] = []
  for (const [file, label] of [
    ["installation.mdx", "Installation"],
    ["theming.mdx", "Theming"],
    ["cli.mdx", "CLI"],
    ["registry.mdx", "Registry"],
    ["license.mdx", "License"],
  ] as const) {
    if (existsSync(join(stagedDocs, file))) start.push({ label, slug: `docs/${file.replace(/\.mdx$/, "")}` })
  }

  const componentsDir = join(stagedDocs, "components")
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
  // current one would be a lie. Normalize CRLF first so the frontmatter and
  // Source regexes work on Windows-authored pages.
  for (const file of pages(stagedDocs)) {
    const relativePath = relative(stagedDocs, file).split(sep).join("/").replace(/[.](md|mdx)$/, "")
    let text = readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    if (!/^slug:/m.test(text)) {
      text = text.replace(/^---\n([\s\S]*?)\n---/, (_match, front: string) => `---\n${front}\nslug: ${slug}/docs/${relativePath}\n---`)
    }
    text = text.replace(/^import \{ Code \} from "@astrojs\/starlight\/components"\n/m, "")
    text = text.replace(/^import source from .*\?raw"\n/m, "")
    text = text.replace(/^import Preview from "@docs\/Preview\.astro"\n/m, "")
    text = text.replace(/^<Preview [^>]*\/>\n?/gm, "")
    text = text.replace(/\n## Source\n[\s\S]*$/, "\n")
    writeFileSync(file, text)
  }

  const sidebar = {
    sidebar: [
      { label: "Start here", items: start },
      { label: "Components", items: [{ label: "All components", slug: "docs/components" }, ...components] },
    ],
    excluded: ["", "docs/versioning"],
  }

  // Copy into a sibling first, then swap. A failure above never touches the
  // existing archive; the rename is the only destructive step.
  rmSync(tempSlug, { recursive: true, force: true })
  mkdirSync(tempSlug, { recursive: true })
  cpSync(stagedDocs, join(tempSlug, "docs"), { recursive: true })

  rmSync(join(docs, slug), { recursive: true, force: true })
  renameSync(tempSlug, join(docs, slug))

  mkdirSync(versions, { recursive: true })
  writeFileSync(join(versions, `${slug}.json`), `${JSON.stringify(sidebar, null, 2)}\n`)

  console.log(`${slug}: ${start.length} start pages, ${components.length} components -> ${target}`)
} catch (error) {
  console.error(`archive-docs: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
} finally {
  rmSync(staging, { recursive: true, force: true })
  rmSync(tempSlug, { recursive: true, force: true })
}
