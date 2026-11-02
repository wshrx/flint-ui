# flint

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
