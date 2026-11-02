# flint

## 0.1.1

The CLI is now a Rust binary. `flint-ui` is one native executable per platform, about 2.4 MB
stripped, with no Bun or Node runtime. It keeps the same `init`, `add`, `list` and `diff` commands
and the same local or HTTP registry contract. The TypeScript CLI and the `flint-ui.mjs` fallback are
retired, so there is one implementation to test and ship.

- Rust CLI for Linux x64/arm64, macOS x64/arm64 and Windows x64.
- Registry validation now rejects dependency cycles and duplicate file entries before writing.
- `FLINT_VERSION` changes `--version` at runtime, and a closed pipe exits quietly.
- The docs shell is rebuilt around a wider hero, card-like content panels and an example-app page.
- Buttons no longer inherit the browser button face, faint text has a real AA token, and the search
  and code surfaces are keyboard and screen-reader accessible.
- `Switch` and `Checkbox` report state through `aria-valuetext`, the attribute GPUIX 0.11 supports.

The kitchen sink now sets an `appId` for Wayland and X11 window rules and has an opt-in macOS
transparent titlebar. Windows and Wayland keep native chrome; a custom titlebar with drag and close
is still blocked on GPUIX window APIs.

## 0.1.0

The first public release of flint as one self-contained component registry for GPUIX. It ships
twenty-four components, a CLI that copies them into an app, a token-driven theme, and a docs site
with a visual component showcase.

- Twenty-four components: Accordion, Alert, Avatar, Badge, Button, Card, Checkbox, Combobox,
  ContextMenu, Dialog, Dropzone, Field, Input, Kbd, Label, Progress, Select, Separator, Skeleton,
  Switch, Tabs, Textarea, Tooltip and WindowHeader.
- `flint-ui init | add | list | diff` copies the source and its shared layer into a project. The CLI
  validates the registry, refuses paths outside it, and reads every file before writing the first.
- `@flint-ui/react` ships the same source as an importable package for apps that prefer one entry
  point.
- The theme is a plain object with light and dark palettes, checked pairs at WCAG AA, and a separate
  `destructiveText` token for small red text on dark surfaces.
- Docs cover installation, the CLI, the registry, theming, versioning and every component. The
  landing page shows the components as static specimens, not a second native renderer.
- MIT for flint. GPUIX stays Apache-2.0 as a peer dependency.
