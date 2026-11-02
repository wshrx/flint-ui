/**
 * Registry over HTTP. The CLI treats a URL registry as the normal release path,
 * so the fetch branch, a trailing slash, a 404 and a remote `init` all need a
 * test that does not depend on GitHub.
 */
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const repo = join(import.meta.dir, "..")
const cli = join(repo, "packages/cli/src/index.ts")
const served = new Map<string, string>()
const projects: string[] = []
const SHARED = ["lib", "theme", "utils", "theme-provider", "text", "icon", "icons", "use-controllable", "fonts"]
let server: ReturnType<typeof Bun.serve>

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(request) {
      const path = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ""))
      const body = served.get(path)
      if (body === undefined) return new Response("not found", { status: 404 })
      return new Response(request.method === "HEAD" ? null : body, { status: 200 })
    },
  })

  const base = `http://127.0.0.1:${server.port}`
  const widget = { name: "widget", type: "registry:ui", files: [{ path: "components/ui/widget.tsx", type: "registry:ui" }] }

  served.set("ok/registry.json", JSON.stringify({ name: "remote", items: [widget] }))
  served.set("ok/components/ui/widget.tsx", "export const Widget = 1\n")

  served.set(
    "missing/registry.json",
    JSON.stringify({
      name: "remote",
      items: [
        {
          name: "widget",
          type: "registry:ui",
          files: [
            { path: "components/ui/widget.tsx", type: "registry:ui" },
            { path: "components/ui/missing.tsx", type: "registry:ui" },
          ],
        },
      ],
    })
  )
  served.set("missing/components/ui/widget.tsx", "export const Widget = 1\n")

  served.set("bad/registry.json", "{ not json")

  served.set(
    "full/registry.json",
    JSON.stringify({
      name: "full",
      items: SHARED.map((name) => ({
        name,
        type: "registry:lib",
        registryDependencies: name === "lib" ? SHARED.filter((entry) => entry !== "lib") : undefined,
        files: [{ path: `lib/${name}.ts`, type: "registry:lib" }],
      })),
    })
  )
  for (const name of SHARED) served.set(`full/lib/${name}.ts`, `export const ${name} = 1\n`)

  // Keep the base URL available to the tests through a module-level string.
  remote = base
})

let remote = ""

afterAll(() => {
  server?.stop(true)
  for (const project of projects) rmSync(project, { recursive: true, force: true })
})

function project(): string {
  const dir = mkdtempSync(join(tmpdir(), "flint-remote-"))
  projects.push(dir)
  writeFileSync(join(dir, "package.json"), '{"name":"remote","private":true}\n')
  return dir
}

async function run(cwd: string, args: string[], env?: Record<string, string>) {
  // Async spawn, not spawnSync: the registry server lives in this process, and
  // a synchronous child would block the event loop that has to answer it.
  const child = Bun.spawn(["bun", cli, ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: env ? { ...process.env, ...env } : process.env,
  })
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { code, out, err }
}

describe("remote registry", () => {
  test("add copies from an http registry", async () => {
    const cwd = project()
    const result = await run(cwd, ["add", "widget", "--registry", `${remote}/ok`])
    expect(result.code).toBe(0)
    expect(readFileSync(join(cwd, "src/components/ui/widget.tsx"), "utf8")).toContain("export const Widget")
  })

  test("a trailing slash on the registry URL is harmless", async () => {
    const cwd = project()
    const result = await run(cwd, ["add", "widget", "--registry", `${remote}/ok/`])
    expect(result.code).toBe(0)
    expect(existsSync(join(cwd, "src/components/ui/widget.tsx"))).toBe(true)
  })

  test("list reads the remote manifest", async () => {
    const cwd = project()
    const result = await run(cwd, ["list", "--registry", `${remote}/ok`])
    expect(result.code).toBe(0)
    expect(result.out).toContain("widget")
  })

  test("diff compares local files with the remote registry", async () => {
    const cwd = project()
    expect((await run(cwd, ["add", "widget", "--registry", `${remote}/ok`])).code).toBe(0)
    writeFileSync(join(cwd, "src/components/ui/widget.tsx"), "export const Widget = 2\n")
    const result = await run(cwd, ["diff", "widget", "--registry", `${remote}/ok`])
    expect(result.code).toBe(1)
    expect(result.out).toContain("changed")
  })

  test("a 404 fails before writing any file", async () => {
    const cwd = project()
    const result = await run(cwd, ["add", "widget", "--registry", `${remote}/missing`])
    expect(result.code).toBe(1)
    expect(result.err).toContain("Could not download components/ui/missing.tsx (404)")
    expect(existsSync(join(cwd, "src/components/ui/widget.tsx"))).toBe(false)
    expect(existsSync(join(cwd, "src/components/ui/missing.tsx"))).toBe(false)
  })

  test("invalid JSON fails with a clear message", async () => {
    const cwd = project()
    const result = await run(cwd, ["list", "--registry", `${remote}/bad`])
    expect(result.code).toBe(1)
    expect(result.err).toContain("registry.json is not JSON")
  })

  test("init copies the shared files from a remote registry", async () => {
    const cwd = project()
    const result = await run(cwd, ["init", "--registry", `${remote}/full`])
    expect(result.code).toBe(0)
    expect(existsSync(join(cwd, "flint.json"))).toBe(true)
    for (const name of SHARED) {
      expect(existsSync(join(cwd, `src/lib/${name}.ts`)), name).toBe(true)
    }
  })

  test("FLINT_REGISTRY is used when no flag or config is present", async () => {
    const cwd = project()
    const result = await run(cwd, ["add", "widget"], { FLINT_REGISTRY: `${remote}/ok` })
    expect(result.code).toBe(0)
    expect(existsSync(join(cwd, "src/components/ui/widget.tsx"))).toBe(true)
  })

  test("flint.json can pin a remote registry", async () => {
    const cwd = project()
    writeFileSync(join(cwd, "flint.json"), JSON.stringify({ root: "src", registry: `${remote}/ok` }, null, 2))
    const result = await run(cwd, ["add", "widget"])
    expect(result.code).toBe(0)
    expect(existsSync(join(cwd, "src/components/ui/widget.tsx"))).toBe(true)
  })
})
