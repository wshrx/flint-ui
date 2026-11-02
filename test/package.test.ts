import { describe, expect, test } from "bun:test"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

const root = join(import.meta.dir, "..")
const flintRoot = join(root, "packages/flint")
const read = (path: string) => readFileSync(join(root, path), "utf8")

const flint = JSON.parse(read("packages/flint/package.json")) as {
  version: string
  license: string
  sideEffects: boolean
  files: string[]
  exports: Record<string, { types: string; default: string }>
  peerDependencies: Record<string, string>
}
const cli = JSON.parse(read("packages/cli/package.json")) as {
  version: string
  bin: Record<string, string>
  files: string[]
}
const workspace = JSON.parse(read("package.json")) as { workspaces: string[] }

describe("package contract", () => {
  test("the CLI and the package ship the same version", () => {
    expect(flint.version).toBe(cli.version)
    expect(flint.version).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test("the package keeps the MIT surface", () => {
    expect(flint.license).toBe("MIT")
    expect(flint.sideEffects).toBe(false)
    expect(flint.files).toContain("dist")
    expect(flint.files).toContain("LICENSE")
    expect(flint.files).toContain("NOTICE")
  })

  test("the entry point points at the built barrel", () => {
    expect(flint.exports["."]).toEqual({
      types: "./dist/index.d.ts",
      default: "./dist/index.js",
    })
  })

  test.skipIf(!existsSync(join(flintRoot, "dist/index.js")))(
    "the build emits every declared export (needs bun run build)",
    () => {
      for (const [subpath, entry] of Object.entries(flint.exports)) {
        expect(existsSync(join(flintRoot, entry.default)), `${subpath} default`).toBe(true)
        expect(existsSync(join(flintRoot, entry.types)), `${subpath} types`).toBe(true)
      }
    }
  )

  test("the subpath exports map to registry sources", () => {
    const sources: Record<string, string> = {
      "./theme": "registry/lib/flint/theme.ts",
      "./text": "registry/lib/flint/text.tsx",
      "./fonts": "registry/lib/flint/fonts.ts",
    }

    for (const [subpath, source] of Object.entries(sources)) {
      const entry = flint.exports[subpath]
      expect(entry, subpath).toBeDefined()
      expect(entry!.default).toBe(`./dist/${source.replace("registry/", "")}`.replace(/\.tsx?$/, ".js"))
      expect(existsSync(join(root, source)), source).toBe(true)
    }
  })

  test("the peer dependencies stay on the pinned GPUIX line", () => {
    expect(flint.peerDependencies["@gpuix/react"]).toBe("^0.11.0")
    expect(flint.peerDependencies.react).toMatch(/^\^19\./)
  })

  test("the CLI exposes one bin and nothing else", () => {
    expect(cli.bin).toEqual({ "flint-ui": "./dist/index.js" })
    expect(cli.files).toContain("dist")
  })

  test("the workspace covers packages, apps and examples", () => {
    expect(workspace.workspaces).toEqual(["packages/*", "apps/*", "examples/*"])
  })
})
