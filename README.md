# flint

Components for [GPUIX](https://gpuix.dev) that you copy into your app and then own.

GPUIX gives you a renderer, layout and headless primitives. It stops before the visual layer:
there is no CSS in a native window and no Tailwind to compile. flint is that layer: twenty-four
components with variants, sizes, states and keyboard behaviour, written as React trees and styled
with `StyleDesc` objects and one token set.

The default install is not a dependency. `flint-ui` copies the source into your repository, so the
files are yours. Rename a prop, change a radius, delete a variant. There is no runtime to keep in
sync and no upstream upgrade that rewrites your UI. An importable package also ships as
`@flint-ui/react` for apps that prefer one.

> **Status: pre-release.** Version `0.1.0`. A minor bump may change the API. Everything ships from
> GitHub Releases. There is no npm registry package to install.

## Requirements

| | |
| --- | --- |
| App runtime | Bun 1.4.4 or newer |
| GPUIX | `@gpuix/react` and `@gpuix/native` 0.11.0, pinned to the same version |
| TypeScript | 5.5 or newer; flint is typechecked with 7.0.2 |
| Platforms | macOS, Windows, Linux. The CLI is a static binary for Linux, macOS and Windows |

## Install the CLI

```bash
curl -fsSL https://wshrx.github.io/flint-ui/install.sh | sh
```

```powershell
irm https://wshrx.github.io/flint-ui/install.ps1 | iex
```

The binary lands in `~/.local/bin` on Unix and `%LOCALAPPDATA%\flint` on Windows.
`FLINT_VERSION=0.1.0` pins a release, and `FLINT_BIN_DIR` changes the target directory. Pass
`FLINT_VERSION` inline with the install command. Do not export it in a shell profile: the CLI reads
it at runtime too.

If Bun is already installed, the release also carries `flint-ui.mjs`, the same CLI in about 7 KB:

```bash
curl -fsSL https://github.com/wshrx/flint-ui/releases/latest/download/flint-ui.mjs -o flint-ui.mjs
bun flint-ui.mjs init
```

## Get started

### 1. Copy the shared layer

Run this in the app you want to change:

```bash
flint-ui init
```

It writes `flint.json` and the shared files under `src/`:

```text
src/lib/flint/theme.ts             light and dark tokens
src/lib/flint/theme-provider.tsx   ThemeProvider, useTheme
src/lib/flint/utils.ts             mergeStyle, the object equivalent of cn()
src/lib/flint/text.tsx             Text, with a guaranteed colour
src/lib/flint/icon.tsx             Icon over an SVG string
src/lib/flint/icons/index.ts       the paths components need
src/lib/flint/use-controllable.ts  controlled and uncontrolled state
src/lib/flint/index.ts             the barrel: @/lib/flint
src/lib/flint/fonts.ts             registerFlintFonts
src/lib/fonts/*.ttf                Medeo Sans and Medeo Mono (OFL 1.1)
src/lib/fonts/OFL.txt              the font license
```

`flint.json` records the source root and the registry tag that matches the CLI:

```json title="flint.json"
{
  "$schema": "https://wshrx.github.io/flint-ui/schema/flint.json",
  "root": "src",
  "registry": "https://raw.githubusercontent.com/wshrx/flint-ui/v0.1.0/registry"
}
```

Use `--root app` if your source is not in `src`. Use `--dry-run` to print the plan without writing.

### 2. Teach TypeScript about GPUIX

```json title="tsconfig.json"
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gpuix/react",
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

`jsxImportSource` is required. Without it TypeScript uses DOM types, and every GPUIX prop,
including `hover` and `<text>`, fails to typecheck.

### 3. Add the provider and the fonts

```tsx title="app.tsx"
import { useEffect } from "react"
import { render, useGpuixRequired } from "@gpuix/react"
import { ThemeProvider, flintDark, registerFlintFonts } from "@/lib/flint"

function Fonts() {
  const renderer = useGpuixRequired()
  useEffect(() => {
    registerFlintFonts(renderer, { dir: "./src/lib/fonts" })
  }, [renderer])
  return null
}

export function App() {
  return (
    <ThemeProvider theme={flintDark}>
      <Fonts />
      {/* your tree */}
    </ThemeProvider>
  )
}

render(<App />, { title: "My app", width: 1100, height: 720 })
```

Change the directory if you used `--root`. The fonts are copied to `<root>/lib/fonts`.

### 4. Add a component

```bash
flint-ui add button dialog select
```

The command copies the component and anything it imports. Existing files are left alone unless you
pass `--overwrite`. Use `--dry-run` to see the exact file list first.

```tsx
import { Button } from "@/components/ui/button"

<Button>Save changes</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="destructive">Delete</Button>
```

There is no provider for a component, no CSS import and no build step. The file is part of your
source now.

## Components

Twenty-four components, nine shared primitives, one file per component.

| Component | What it is for |
| --- | --- |
| [Accordion](apps/www/src/content/docs/docs/components/accordion.mdx) | One panel open at a time, keyboard included |
| [Alert](apps/www/src/content/docs/docs/components/alert.mdx) | Inline message with a tone and an optional action |
| [Avatar](apps/www/src/content/docs/docs/components/avatar.mdx) | Image or initials in a circle |
| [Badge](apps/www/src/content/docs/docs/components/badge.mdx) | Status and metadata, five tones |
| [Button](apps/www/src/content/docs/docs/components/button.mdx) | Six variants, four sizes, loading and disabled states |
| [Card](apps/www/src/content/docs/docs/components/card.mdx) | Surface with header, content and footer |
| [Checkbox](apps/www/src/content/docs/docs/components/checkbox.mdx) | Controlled or uncontrolled box with a label |
| [Combobox](apps/www/src/content/docs/docs/components/combobox.mdx) | Searchable list over the headless primitive |
| [ContextMenu](apps/www/src/content/docs/docs/components/context-menu.mdx) | Right-click menu in a window-level layer |
| [Dialog](apps/www/src/content/docs/docs/components/dialog.mdx) | Portal, backdrop, focus trap and close control |
| [Dropzone](apps/www/src/content/docs/docs/components/dropzone.mdx) | OS file drop reported as absolute paths |
| [Field](apps/www/src/content/docs/docs/components/field.mdx) | Label, control, hint and error as one unit |
| [Input](apps/www/src/content/docs/docs/components/input.mdx) | Native editor with focus and invalid states |
| [Kbd](apps/www/src/content/docs/docs/components/kbd.mdx) | Keyboard hint on a hairline pill |
| [Label](apps/www/src/content/docs/docs/components/label.mdx) | Text label with a required mark |
| [Progress](apps/www/src/content/docs/docs/components/progress.mdx) | Determinate bar with a label and percentage |
| [Select](apps/www/src/content/docs/docs/components/select.mdx) | Keyboard list with named values |
| [Separator](apps/www/src/content/docs/docs/components/separator.mdx) | Hairline with an optional label |
| [Skeleton](apps/www/src/content/docs/docs/components/skeleton.mdx) | Quiet loading block |
| [Switch](apps/www/src/content/docs/docs/components/switch.mdx) | Immediate on/off setting |
| [Tabs](apps/www/src/content/docs/docs/components/tabs.mdx) | Segmented or line tabs |
| [Textarea](apps/www/src/content/docs/docs/components/textarea.mdx) | Native multi-line editor |
| [Tooltip](apps/www/src/content/docs/docs/components/tooltip.mdx) | Inverted hint on hover or focus |
| [WindowHeader](apps/www/src/content/docs/docs/components/window-header.mdx) | Safe-area aware strip under the native titlebar |

Browse the catalogue with `flint-ui list`, or read the [component docs](https://wshrx.github.io/flint-ui/docs/components/).

## Theming

The theme is a plain object. Every component reads it through `useTheme()`, so switching themes is
one render and no CSS reset.

```tsx
import { ThemeProvider, flintLight, useTheme } from "@/lib/flint"

function Panel() {
  const theme = useTheme()
  return <div style={{ backgroundColor: theme.colors.card, borderRadius: theme.radius.md }} />
}

<ThemeProvider theme={flintLight}>…</ThemeProvider>
```

`flintDark` is the default. The palette has light and dark variants, a type scale, radii and shadow
arrays. `destructiveText` is separate from `destructive`: the filled token is for a surface, the
text token is for small red text on a dark background.

Run the contrast check after changing a token:

```bash
bun run contrast
```

It checks the pairs listed in `scripts/contrast.ts`, 4.5:1 for text and 3:1 for control edges and
focus rings.

## CLI

```bash
flint-ui init                 # write flint.json and the shared layer
flint-ui add <component...>   # copy components and their dependencies
flint-ui list                 # list the registry
flint-ui diff <component...>  # compare local files with the pinned registry
flint-ui --version
```

| Flag | Effect |
| --- | --- |
| `--root <dir>` | destination root, default `src` |
| `--registry <path\|url>` | registry location; overrides `flint.json` and `FLINT_REGISTRY` |
| `--overwrite` | replace files that already exist |
| `--dry-run` | print the plan, write nothing |

`diff` exits `0` when every file matches and `1` when something changed or is missing. A registry
is validated before anything is copied: structure, names, paths, dependencies and cycles. A path
that leaves the registry is rejected before the first write.

## Registry and package

`registry/registry.json` is the source of truth. Every item declares its files and its
`registryDependencies`; `registry/index.ts` is the package barrel.

```bash
bun run registry:check   # files exist, paths stay inside, dependencies resolve, no cycles
bun run typecheck
bun test
bun run build
bun run verify           # all of the above, plus link check
```

`@flint-ui/react` is built from the same directory at release time. The package exposes one entry
point plus `./theme`, `./text` and `./fonts`. There is no npm publish step.

## Documentation site

The site is Astro 7 and Starlight. English is at `/`, Russian under `/ru/`, and the current release
is at the root. An archive for an older release lives under `/vX.Y.Z/` when one exists.

```bash
bun run dev    # http://localhost:4321/flint-ui/
bun run build
bun run verify
```

Component pages show an interactive specimen, usage, props, keyboard notes and the full source. The landing
page shows all twenty-four specimens, not a second native renderer: the components are native, and
a browser preview would be a separate implementation to keep in sync.

## Test app

`examples/kitchen-sink` is a real GPUIX window that uses all 24 components in one
workspace settings screen. It is the manual render check and the screenshot
reference:

```bash
cd examples/kitchen-sink
bun app.tsx
```

Set `THEME=light`, `FLINT_TAB=members`, `HEIGHT=800` or `GPUIX_BACKGROUND=1` to
change the start state. The app registers Medeo Sans and Medeo Mono from its own
`fonts/` directory.

## Repository

```text
registry/            files users receive; registry.json is the manifest
packages/cli/        flint-ui: init | add | list | diff
packages/flint/      @flint-ui/react, built from registry/
apps/www/            Astro 7 + Starlight docs, EN and RU
examples/kitchen-sink/  a real GPUI window
scripts/             registry, contrast, package, release, docs archive, link check
tools/               anvil runner, local smoke and generator (working repository only)
test/                unit, CLI, registry, package, release, docs and native tests
```

The public repository is a release mirror: one squashed commit per release, no planning files.
Development history and the `WORKLOG.md` live in the working repository.

## License

MIT for flint. GPUIX stays Apache-2.0 as a peer dependency. The Medeo fonts ship under SIL OFL 1.1;
the license text travels with the font files. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
