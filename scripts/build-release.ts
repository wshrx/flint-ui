#!/usr/bin/env bun
/**
 * Build the release assets: the host Rust CLI and the package tarball.
 *
 *   bun scripts/build-release.ts
 *
 * The five platform binaries are built natively by the release workflow, one
 * runner per platform, and downloaded into dist/release after this script.
 * Locally this script builds the host binary so a release can be tested end to
 * end; set FLINT_NO_RUST=1 to skip it.
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
const version = JSON.parse(readFileSync(join(root, "packages/flint/package.json"), "utf8")).version as string
const cargo = readFileSync(join(root, "crates/flint-cli/Cargo.toml"), "utf8")
const cargoVersion = /^\[package\][\s\S]*?^version = "([^"]+)"/m.exec(cargo)?.[1]

if (cargoVersion !== version) {
  console.error(`crates/flint-cli/Cargo.toml is at ${cargoVersion ?? "an unknown version"}, packages/flint is at ${version}`)
  process.exit(1)
}

rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })

await $`bun run --cwd packages/flint build`.cwd(root).quiet()

if (!process.env.FLINT_NO_RUST) {
  const platform = process.platform === "win32" ? "windows" : process.platform === "darwin" ? "darwin" : "linux"
  const arch = process.arch === "arm64" ? "arm64" : "x64"
  const exe = process.platform === "win32" ? ".exe" : ""
  await $`cargo build --release --manifest-path crates/flint-cli/Cargo.toml`.cwd(root).quiet()
  const built = join(root, "crates/flint-cli/target/release", `flint-ui${exe}`)
  if (!existsSync(built)) throw new Error(`cargo did not write ${built}`)
  cpSync(built, join(out, `flint-ui-${platform}-${arch}${exe}`))
  console.log(`built flint-ui-${platform}-${arch}${exe}`)
}

// The tarball must carry the licence, and it lives at the repository root.
const copies = [
  [join(root, "LICENSE"), join(root, "packages/flint/LICENSE")],
  [join(root, "NOTICE"), join(root, "packages/flint/NOTICE")],
] as const

try {
  for (const [from, to] of copies) cpSync(from, to)
  await $`bun pm pack --destination ${out}`.cwd(join(root, "packages/flint")).quiet()
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
