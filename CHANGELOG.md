# flint

## 0.1.1

Six more components, and the fixes that came out of actually shipping 0.1.0.

- New: Separator, Skeleton, Progress, Alert, Avatar, Accordion.
- Fix: the input selection colour was passed in the native theme, where GPUIX has no
  such field; it now lives in the `<input>` / `<textarea>` style.
- Fix: Windows is a supported target again — the release ships
  `flint-ui-windows-x64.exe` and `install.ps1`.
- Fix: the mobile header no longer collides with Starlight's fixed menu button; theme and
  language live in the drawer, and splash pages get navigation in the footer.
- Fix: `/v0.1/` and `/ru/v0.1/` redirect to their installation page instead of 404.
- Fix: `flint.json` and `registry.json` point at schema files the site actually serves.
- Fix: build scripts resolve their own path with `fileURLToPath`, so they work on Windows.

## 0.1.0

First public shape of the kit.

- 12 components: Button, Input, Textarea, Label, Checkbox, Switch, Select, Dialog,
  Tabs, Card, Badge, Tooltip.
- Theme tokens in TypeScript (light and dark), `mergeStyle`, `Text`, `Icon`,
  `useControllableState`, `registerFlintFonts`.
- `@flint-ui/react` built from the same registry the CLI copies.
- `flint-ui init | add | list`, shipped as a standalone binary for Linux and macOS.
- No npm: the CLI and the tarballs live on GitHub Releases.
- Docs versioned from v0.1, with native-first component pages.
