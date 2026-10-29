#!/usr/bin/env bun
/**
 * Build the release assets: one self-contained CLI binary per platform, the
 * browser-less bundle and the two tarballs.
 *
 *   bun scripts/build-release.ts
 *
 * Output: dist/release/. No bash, no tar of the tree, no platform-specific
 * tools: the same command runs on Linux, macOS and Windows.
 */
import { $ } from "bun"
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const root = fileURLToPath(new URL("..", import.meta.url))
const out = join(root, "dist/release")
const version = JSON.parse(readFileSync(join(root, "packages/cli/package.json"), "utf8")).version as string

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

const targets = [
  ["bun-linux-x64", "linux", "x64"],
  ["bun-linux-arm64", "linux", "arm64"],
  ["bun-darwin-x64", "darwin", "x64"],
  ["bun-darwin-arm64", "darwin", "arm64"],
  ["bun-windows-x64", "windows", "x64"],
] as const

await $`bun run --cwd packages/flint build`.cwd(root).quiet()
await $`bun run --cwd packages/cli build`.cwd(root).quiet()

for (const [target, os, arch] of targets) {
  const file = `flint-ui-${os}-${arch}${os === "windows" ? ".exe" : ""}`
  await $`bun build --compile --minify --target=${target} --define process.env.FLINT_VERSION="\"${version}\"" packages/cli/src/index.ts --outfile ${join(out, file)}`
    .cwd(root)
    .quiet()
  console.log(`built ${file}`)
}

await $`bun build --target=bun --minify --define process.env.FLINT_VERSION="\"${version}\"" packages/cli/src/index.ts --outfile ${join(out, "flint-ui.mjs")}`
  .cwd(root)
  .quiet()
console.log("built flint-ui.mjs")

// The tarballs must carry the licence, and it lives at the repository root.
const copies = [
  [join(root, "LICENSE"), join(root, "packages/flint/LICENSE")],
  [join(root, "NOTICE"), join(root, "packages/flint/NOTICE")],
  [join(root, "LICENSE"), join(root, "packages/cli/LICENSE")],
] as const

for (const [from, to] of copies) cpSync(from, to)
try {
  await $`bun pm pack --destination ${out}`.cwd(join(root, "packages/flint")).quiet()
  await $`bun pm pack --destination ${out}`.cwd(join(root, "packages/cli")).quiet()
} finally {
  for (const [, to] of copies) rmSync(to, { force: true })
}

const sums: string[] = []
for (const name of readdirSync(out).sort()) {
  const path = join(out, name)
  if (!statSync(path).isFile() || name === "SHA256SUMS") continue
  const hash = new Bun.CryptoHasher("sha256").update(readFileSync(path)).digest("hex")
  sums.push(`${hash}  ./${name}`)
}
writeFileSync(join(out, "SHA256SUMS"), sums.join("\n") + "\n")

console.log(`\n${readdirSync(out).length} files in dist/release (${version})`)
