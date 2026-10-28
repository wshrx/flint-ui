# flint

Components for [GPUIX](https://gpuix.dev) that you copy into your app and then own.

GPUIX gives you a renderer, layout and headless primitives. It deliberately stops before the
visual layer, because there is no CSS in a native window and no Tailwind to compile. flint is
that layer: eighteen components with variants, sizes, states and keyboard behaviour, written as
React trees and styled with `StyleDesc` objects and one token set.

They are not installed as a dependency. `flint-ui` copies the source into your repository, so
the files are yours: rename a prop, change a radius, delete a variant. There is no runtime to
keep in sync and no upstream upgrade that rewrites your UI.

> **Status: pre-release.** Version `0.1.1`. A minor bump may change the API. Everything ships
> from GitHub Releases; there is no npm package to install.

## Requirements

| | |
| --- | --- |
| Bun | 1.4.4 or newer |
| TypeScript | 7.0.2 (flint is typechecked with it; 5.5+ is enough for consumers) |
| GPUIX | `@gpuix/react` and `@gpuix/native` pinned to the **same exact** version, currently `0.11.0` |

GPUIX is pre-1.0: the adapter and the native addon ship together, so mismatched versions fail at
runtime, not at build time. Pin both.

## Quick start

### 1. Install the CLI

```bash
# Linux, macOS
curl -fsSL https://wshrx.github.io/flint-ui/install.sh | sh
```

```powershell
# Windows
irm https://wshrx.github.io/flint-ui/install.ps1 | iex
```

A single self-contained binary. No npm, no Node, nothing added to your `package.json`.
`FLINT_VERSION=0.1.1` pins a release; `FLINT_BIN_DIR` changes the target from `~/.local/bin`
(`%LOCALAPPDATA%\flint` on Windows).

Bun already installed? The release also carries `flint-ui.mjs`, the same CLI in 5 KB:

```bash
curl -fsSL https://github.com/wshrx/flint-ui/releases/latest/download/flint-ui.mjs -o flint-ui.mjs
bun flint-ui.mjs init
```

Working on flint itself, or on a platform without a build? Compile from a checkout:

```bash
git clone https://github.com/wshrx/flint-ui flint-ui && cd flint-ui
bun install && bun run build
bun packages/cli/dist/index.js --version
```

### 2. Initialise

```bash
cd /path/to/your-app
flint-ui init
```

`init` writes `flint.json` and copies the shared layer:

```text
src/lib/flint/theme.ts             light and dark tokens
src/lib/flint/theme-provider.tsx   ThemeProvider, useTheme
src/lib/flint/utils.ts             mergeStyle, the object cn()
src/lib/flint/text.tsx             Text, with a guaranteed colour
src/lib/flint/icon.tsx             Icon over an SVG string
src/lib/flint/icons/index.ts       the paths components need
src/lib/flint/use-controllable.ts  controlled/uncontrolled state
src/lib/flint/fonts.ts             registerFlintFonts
src/lib/fonts/*.ttf                Medeo Sans, Medeo Mono (OFL 1.1)
```

Different source root:

```bash
flint-ui init --root app
```

### 3. Teach TypeScript about GPUIX

```json title="tsconfig.json"
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gpuix/react",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`jsxImportSource` is not optional. Without it every GPUIX prop fails to typecheck, because
TypeScript falls back to DOM JSX types.

### 4. Mount the provider and the fonts

```tsx title="app.tsx"
import { useEffect, useState } from "react"
import { render, useGpuixRequired } from "@gpuix/react"
import { ThemeProvider, flintDark, flintLight, registerFlintFonts } from "@/lib/flint"

function Fonts() {
  const renderer = useGpuixRequired()
  useEffect(() => {
    registerFlintFonts(renderer, { dir: "./fonts" })
  }, [renderer])
  return null
}

export function App() {
  const [dark, setDark] = useState(true)
  return (
    <ThemeProvider theme={dark ? flintDark : flintLight}>
      <Fonts />
      {/* your tree */}
    </ThemeProvider>
  )
}

render(<App />, { title: "My app", width: 960, height: 640 })
```

`registerFont` needs a live window, so it runs in an effect. Calling it before `render()` throws
`GPUI application is not initialized`. The browser build has no `registerFont`; load the same
files with `FontFace`.

### 5. Add components

```bash
bun /path/to/flint-ui/packages/cli/dist/index.js add button dialog select --registry ./registry
```

```tsx
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function Save() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      <Input placeholder="Name" style={{ width: 220 }} />
      <Button>Save</Button>
    </div>
  )
}
```

Dependencies resolve automatically: `add dialog` also brings `theme`, `utils`, `icon` and `text`
if they are missing. Existing files are never replaced unless you pass `--overwrite`.

## Components

| Component | What it covers |
| --- | --- |
| [Button](apps/www/src/content/docs/docs/components/button.mdx) | Six variants, four sizes, loading and disabled states, Enter/Space from the headless primitive |
| [Input](apps/www/src/content/docs/docs/components/input.mdx) | Field surface around the native input, focus and invalid states, leading/trailing adornments |
| [Textarea](apps/www/src/content/docs/docs/components/textarea.mdx) | Same surface, grows from `minRows` to `maxRows`, then scrolls |
| [Label](apps/www/src/content/docs/docs/components/label.mdx) | Field names with an optional required mark |
| [Checkbox](apps/www/src/content/docs/docs/components/checkbox.mdx) | Controlled or uncontrolled, label inside the hit target |
| [Switch](apps/www/src/content/docs/docs/components/switch.mdx) | 34 × 20 immediate-setting toggle, no animation |
| [Select](apps/www/src/content/docs/docs/components/select.mdx) | Keyboard-first menu that flips inside the window |
| [Dialog](apps/www/src/content/docs/docs/components/dialog.mdx) | Portal, backdrop, focus trap, close control |
| [Tabs](apps/www/src/content/docs/docs/components/tabs.mdx) | Segmented or line, one controlled value, inactive panels unmounted |
| [Card](apps/www/src/content/docs/docs/components/card.mdx) | Six parts, three surfaces |
| [Badge](apps/www/src/content/docs/docs/components/badge.mdx) | Five tones, optional status dot |
| [Tooltip](apps/www/src/content/docs/docs/components/tooltip.mdx) | One line on an inverted surface |
| [Separator](apps/www/src/content/docs/docs/components/separator.mdx) | Hairline, horizontal or vertical, with an optional label |
| [Skeleton](apps/www/src/content/docs/docs/components/skeleton.mdx) | Placeholder block sized like the content it replaces |
| [Progress](apps/www/src/content/docs/docs/components/progress.mdx) | Determinate bar with an optional label and percentage |
| [Alert](apps/www/src/content/docs/docs/components/alert.mdx) | Inline message in four tones |
| [Avatar](apps/www/src/content/docs/docs/components/avatar.mdx) | Photo or initials in a circle |
| [Accordion](apps/www/src/content/docs/docs/components/accordion.mdx) | One panel open at a time |

Plus the shared layer — `theme`, `theme-provider`, `utils`, `text`, `icon`, `icons`,
`use-controllable`, `fonts` — which `init` copies once.

### Rules the components follow

- **Tokens or nothing.** No literal colours in component styles; everything reads
  `useTheme()`. The contrast script checks every foreground/background pair against WCAG AA.
- **Headless work stays headless.** Focus, keyboard navigation, portal placement and dismissal
  come from `@gpuix/react`. flint adds the surface, not a second implementation of behaviour.
- **Text goes through `Text`.** A bare string inherits whatever colour the parent had, which is
  how invisible labels happen in native trees.
- **No animation by default.** A switch that slides is a preference, not a default; add motion
  where it carries meaning.
- **Density is a decision.** Base text is 13 px, controls 28–32 px tall, radii 4–10. It is a
  desktop app layer, not a web page.

## Theming

Two palettes ship: `flintDark` (default) and `flintLight`. Both are plain objects in
`src/lib/flint/theme.ts` — edit them, do not override them from the outside.

```tsx
import { ThemeProvider, flintLight, useTheme } from "@/lib/flint"

function Panel() {
  const theme = useTheme()
  return <div style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.md }} />
}

<ThemeProvider theme={flintLight}>…</ThemeProvider>
```

| Group | What is in it |
| --- | --- |
| `colors` | `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `success`, `border`, `input`, `ring`, `overlay`, `selection`, `caret` — each with its `*Foreground` pair |
| `radius` | `xs` 4 → `full` 999 |
| `text` | `xs` 11 → `3xl` 32, plus `leading` |
| `shadow` | `sm`, `md`, `lg` as GPUI shadow arrays |
| `font` | `Medeo Sans`, `Medeo Mono`, `Medeo Sans Display` |

The default dark palette is a night sky: near-black surfaces, `#38BDF8` primary. The light
palette keeps the same hue at `#0369A1` on `#EEF1F4` instead of pure white, so long docs pages
do not glare.

## Registry

`registry/registry.json` is the source of truth. Every item declares its files and its
`registryDependencies`; the CLI walks that graph, copies files into `flint.json`'s `root`, and
skips anything that already exists.

```json title="flint.json"
{
  "$schema": "https://wshrx.github.io/flint-ui/schema/flint.json",
  "root": "src",
  "registry": "./registry"
}
```

`registry` may be a path or a URL. The built-in default is the public registry on GitHub
(`raw.githubusercontent.com/wshrx/flint-ui/main/registry`), so a fresh `init` needs no flags;
`--registry` points at a local folder or your own copy.

`bun run registry:check` validates the manifest: every file exists, every name is unique, every
dependency resolves.

## CLI

| Command | |
| --- | --- |
| `flint-ui init` | write `flint.json` and copy the shared layer |
| `flint-ui add <names…>` | copy components with their dependencies |
| `flint-ui list` | list what the registry offers, UI and primitives |
| `flint-ui diff <names…>` | compare your copy with the registry |
| `flint-ui --version` | print the CLI version |

| Flag | |
| --- | --- |
| `--root <dir>` | where files go (default `src`, or `flint.json`) |
| `--registry <path\|url>` | registry location |
| `--overwrite` | replace files that already exist |
| `--dry-run` | print the plan, write nothing |

## Repository layout

```text
registry/               the files users receive
  registry.json         manifest: items, files, dependencies
  components/ui/        the eighteen components
  lib/flint/            shared layer: tokens, provider, text, icons
  lib/fonts/            Medeo Sans, Medeo Mono, OFL.txt
packages/cli/           flint-ui
packages/flint/         @flint-ui/react, the same source as an importable package
apps/www/               documentation site (Astro + Starlight)
examples/kitchen-sink/  a settings window built with the registry
scripts/                package build, release assets, registry and contrast checks
```

`packages/flint` is generated from `registry/` at build time by rewriting `@/` aliases, so the
two cannot drift.

## Documentation

The site is Astro 7 + Starlight: English at `/`, Russian under `/ru/`, and two doc versions —
`Next` plus an archived `v0.1` — via `starlight-versions`. There is no live browser preview on
purpose: a wasm renderer would be a second implementation to keep in sync, and the components
are native. Component pages show usage, props and the full file instead.

```bash
bun run dev    # http://localhost:4321
```

## Development

```bash
bun install
bun run contrast      # WCAG AA check for every token pair
bun run registry:check
bun run typecheck
bun run build         # packages, then the docs site
bun run dev           # docs only
```

Versions follow semver and the changelog records what each one changed. The docs keep `Next`
and the archived versions side by side, so a release never changes what an older page says.

## License

MIT — see [LICENSE](./LICENSE). The registry is copied into your app, so the license asks for
nothing beyond the notice: no NOTICE in your build, no per-file headers, no copyleft.

Third-party credits are in [NOTICE](./NOTICE). GPUIX is Apache-2.0 and remains a peer
dependency under its own license; flint imports its public API and copies none of its source.
