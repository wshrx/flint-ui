# Kitchen sink

A real GPUIX window that uses every flint component in one settings screen. It
is the manual render check and the screenshot reference, not a web gallery.

## Run

From this directory:

```bash
bun app.tsx
# or, with hot reload:
bun run dev
```

From the repository root:

```bash
cd examples/kitchen-sink && bun app.tsx
```

The window is 960 × 640 by default. It needs the GPUIX system libraries and a
display; on Linux that means X11 or Wayland.

## Controls

| Environment | Effect |
| --- | --- |
| `THEME=light` | start in the light palette |
| `FLINT_TAB=members` | open the Members tab |
| `HEIGHT=800` | change the window height |
| `GPUIX_BACKGROUND=1` | open without taking focus |
| `MARKER=#FF00FF` | colour of the one-pixel edge marker used by screenshot tools |

## What it covers

All 24 components: Accordion, Alert, Avatar, Badge, Button, Card, Checkbox,
Combobox, ContextMenu, Dialog, Dropzone, Field, Input, Kbd, Label, Progress,
Select, Separator, Skeleton, Switch, Tabs, Textarea, Tooltip and WindowHeader.

The screen is a workspace settings page with General, Members and Billing tabs.
The Members tab has the searchable Combobox, the member rows, the invite Dialog
and a ContextMenu. The General tab has the form controls, the Accordion, the
Dropzone and the progress surfaces. The status bar shows the active theme and a
connection dot.

## Fonts

The app registers Medeo Sans and Medeo Mono from `./fonts` at startup. The TTFs
and the OFL text live in this directory so the example runs from a checkout
without copying anything. The registry copies the same files during
`flint-ui init`.
