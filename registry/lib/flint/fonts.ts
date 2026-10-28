/**
 * Medeo Sans and Medeo Mono.
 *
 * GPUI only knows fonts that are installed or registered in the process, and
 * `registerFont()` takes the bytes of a TTF/OTF. Webfonts are not an option:
 * WOFF/WOFF2 have to be converted first.
 *
 * Copy `registry/fonts/*.ttf` next to your app and call this once, before the
 * first window paints:
 *
 *   const renderer = createRenderer()
 *   await registerFlintFonts(renderer, "./fonts")
 *   render(<App />, { renderer })
 *
 * In the browser build, load the same files with `FontFace` instead.
 */

const SANS = ["MedeoSans-Regular.ttf", "MedeoSans-Medium.ttf", "MedeoSans-SemiBold.ttf", "MedeoSans-Bold.ttf"]
const MONO = ["MedeoMono-Regular.ttf", "MedeoMono-Medium.ttf"]

export const FLINT_FONT_FILES = [...SANS, ...MONO]

export interface RegisterFontsOptions {
  /** Directory that holds the TTF files. Defaults to `./fonts`. */
  dir?: string
  /** Register only these files. Defaults to every Medeo file flint ships. */
  files?: string[]
}

import type { Buffer } from "node:buffer"

type FontRenderer = {
  registerFont?: (bytes: Buffer) => void
}

export async function registerFlintFonts(
  renderer: FontRenderer,
  options: RegisterFontsOptions = {}
): Promise<string[]> {
  if (!renderer.registerFont) {
    throw new Error("flint: renderer.registerFont is not available (browser build? use FontFace instead)")
  }

  const { readFile } = await import("node:fs/promises")
  const { join } = await import("node:path")

  const dir = options.dir ?? "./fonts"
  const files = options.files ?? FLINT_FONT_FILES
  const registered: string[] = []

  for (const file of files) {
    const bytes = await readFile(join(dir, file))
    renderer.registerFont(bytes)
    registered.push(file)
  }

  return registered
}
