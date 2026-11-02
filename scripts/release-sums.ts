#!/usr/bin/env bun
/**
 * Recompute dist/release/SHA256SUMS after the platform binaries are downloaded
 * into the folder. The workflow runs this between the download and the upload.
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const out = join(fileURLToPath(new URL("..", import.meta.url)), "dist/release")
const sums: string[] = []
for (const name of readdirSync(out).sort()) {
  const path = join(out, name)
  if (!statSync(path).isFile() || name === "SHA256SUMS") continue
  const hash = new Bun.CryptoHasher("sha256").update(readFileSync(path)).digest("hex")
  sums.push(`${hash}  ./${name}`)
}
writeFileSync(join(out, "SHA256SUMS"), sums.join("\n") + "\n")
console.log(`release-sums: ${sums.length} assets`)
