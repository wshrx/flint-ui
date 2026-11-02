# Upstream: window drag and close

Do not open a new issue. https://github.com/remorses/gpuix/issues/117 covers native window dragging
for custom title bars, and the thread already discusses the declarative `window_control_area` route
with Close/Min/Max. Add the comment below there.

Related: #77 (closed, native Windows title bars restored in the examples), #49 and #27 (Linux
decorations).

## Comment for #117

### Window drag and close for custom title bars

[flint](https://github.com/wshrx/flint-ui) is a component registry for GPUIX
([docs](https://wshrx.github.io/flint-ui/), pinned API in
[`docs/gpuix-contract.md`](https://github.com/wshrx/flint-ui/blob/main/docs/gpuix-contract.md)).
We ship a `WindowHeader` with safe-area insets and leading/trailing slots, and it stops at a header
because two calls are missing.

| Renderer today | Missing |
| --- | --- |
| `activateWindow()` | `startWindowDrag()` or a drag control area |
| `minimizeWindow()` | `closeWindow()` or a close control area |
| `zoomWindow()` | |
| `toggleFullscreen()` | |
| `setWindowTitle()` | |

Without them, an app that hides the native title bar has three options, and none ships:

1. keep the native title bar and lose the app's own palette and control placement;
2. draw chrome and leave the window unmovable;
3. draw chrome and call `process.exit()` from the close button, which kills every window.

### What we would use

```tsx
function TitleBar() {
  const renderer = useGpuixRequired()

  return (
    <div
      onMouseDown={() => renderer.startWindowDrag()}
      style={{ display: "flex", alignItems: "center", height: 38, paddingLeft: 12 }}
    >
      <Text>Alpenglow</Text>
      <div style={{ flexGrow: 1 }} />
      <IconButton aria-label="Minimize" onClick={() => renderer.minimizeWindow()} />
      <IconButton aria-label="Zoom" onClick={() => renderer.zoomWindow()} />
      <IconButton aria-label="Close" onClick={() => renderer.closeWindow()} />
    </div>
  )
}
```

### Platform expectations

| Platform | Drag | Close |
| --- | --- | --- |
| macOS | `start_window_move()` or a drag area | `performClose:` |
| Windows | `window_control_area(Drag)` via `WM_NCHITTEST` | `window_control_area(Close)` via `WM_CLOSE` |
| Wayland | `xdg_toplevel.move` with the press serial | `xdg_toplevel.close` |
| X11 | `_NET_WM_MOVERESIZE` | `WM_DELETE_WINDOW` |

### Questions

1. Does the declarative area include Close, or is a separate `closeWindow()` method planned?
2. Should unsupported platforms no-op rather than throw? Our render tests run headless on macOS and
   Windows, where the test window has no real move, so a no-op keeps them usable.

<details>
<summary>Acceptance criteria we would test</summary>

- Drag works on macOS, Windows and X11, and on Wayland where the compositor supports
  `xdg_toplevel.move`.
- Unsupported platforms do nothing instead of throwing.
- `closeWindow()` closes one window and leaves the process alive while other windows remain.
- Both methods are documented in the renderer API.

</details>

Happy to run a branch against the flint kitchen sink on macOS and Windows and report what breaks.
