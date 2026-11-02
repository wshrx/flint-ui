# GPUIX contract

What flint relies on, pinned to `@gpuix/react` 0.11.0. If GPUIX changes, this file is the first place
to update. Read it before reviewing a component or writing one by hand.

## Version

The workspace pins `@gpuix/react` and `@gpuix/native` to `0.11.0`. `packages/flint` declares
`@gpuix/react` as a peer with `^0.11.0` for consumers and pins `0.11.0` for development. They are
pre-1.0 and move together; a review that suggests bumping one without the other is wrong.

## Imports flint is allowed to use

| Area | Exports |
| --- | --- |
| Headless behaviour | `Button`, `buttonProps`, `Dialog`, `DialogBackdrop`, `DialogClose`, `DialogDescription`, `DialogPopup`, `DialogPortal`, `DialogTitle`, `DialogTrigger`, `Select*`, `Combobox*`, `Tooltip`, `TooltipContent`, `TooltipTrigger`, `DismissableLayer` |
| Host | `Props`, `InputProps`, `TextareaProps`, `ImgProps`, `SvgProps`, `StyleDesc`, `PublicInstance` |
| Window | `useWindowSize`, `useWindowInsets`, `createPortal` |
| Testing | `@gpuix/react/testing`: `createTestRoot`, `hasNativeTestRenderer`, `TestRenderer` |

Anything else means a new dependency decision, not a component detail.

## Styling

- `StyleDesc` is a closed interface. There is no index signature: an unknown key is a type error.
  Keys that do **not** exist and have bitten before: `inset`, `paddingBlock`, `paddingInline`,
  `borderLeftColor`, `gap` on text.
- State styles live in `hover`, `active`, `focusVisible` and `keyboardFocusDim`. They are nested
  `StyleDesc` values, not separate props.
- Colours come from `theme.colors`; no `#hex`, `rgb()` or named colours outside `registry/lib/flint/theme.ts`.
- `width`/`height` accept numbers or strings (`"100%"`). Percentages resolve against the parent.
- `boxShadow` is a list of GPUI shadows. Put it on surfaces that float (menu, popover, dialog), never
  on a panel that can sit in a transparent window: the corners go black outside the rounded rect.
- There is no CSS `fixed`. Position with `absolute` inside a positioned parent. A window-level layer
  needs `createPortal(children, target)` with a mounted target element, as `Dialog` does.
- `pointerEvents: "none"` lets the wheel through; `"auto"` blocks hits and the wheel. An overlay that
  must be dismissed needs a region with `"auto"`; an empty decorative layer should use `"none"`.

## Text

GPUI does not inherit `color`. A bare string or `<div>` with text paints black on a dark surface.
Every user-visible string goes through `<Text>`, and the tone comes from a token.

One line of text is one template string. Adjacent text nodes (`{label} {value}`, `{a}{b}`) are laid
out independently and can wrap one word per line; the Progress bug in 0.1.1 was exactly this.
Interpolate into a single string instead: `{`${label}: ${value}`}`.

## Events

| Prop | Payload | Notes |
| --- | --- | --- |
| `onClick` | `EventPayload` | Primary button only, like the DOM |
| `onAuxClick` | `EventPayload` | `isRightClick`, `button === 2`; context menus |
| `onMouseDown` / `onMouseUp` | `EventPayload` | `x`, `y` are window coordinates |
| `onFileDrop` | `EventPayload` | `paths: string[]`, absolute filesystem paths |
| `onKeyDown` / `onKeyUp` | `KeyEvent` | `buttonProps` already handles Enter and Space |

`EventPayload` carries `elementId`, `eventType`, `x`, `y`, `button`, `clickCount`, `isRightClick`,
`paths`, modifiers. `EventPayload` has no `preventDefault()`; key handlers receive `KeyEvent`, which
does. Behaviour that must be cancelled in a primitive stays in the primitive (`buttonProps` does it
for Space).

`pressable({ disabled, focusableWhenDisabled, onClick, onKeyDown, onKeyUp, tabIndex })` returns
`role`, an explicit `tabIndex`, and the Enter/Space handlers. It wraps `buttonProps`, which leaves
`tabIndex` unset for enabled controls. Use it for anything that behaves like a button; do not
reimplement the key handling.

## Elements

| Element | Rule |
| --- | --- |
| `<text>` | colour from `Text`; accepts `style`, `aria-*` |
| `<input>` / `<textarea>` | native editor; `theme` takes `GpuixTheme` (`bg`, `text`, `border`, `caret`, `accent`, `font*`); selection colour is a **style** (`selectionColor`), not a theme field |
| `<img>` | `src` (path, data URL, http), `objectFit`, `alt` |
| `<svg>` | `source` for markup, `src` for a desktop path; monochrome, tinted by `color` |

## What GPUIX does not give you

- **Focus from an instance.** `PublicInstance` has no `focus()`, but the renderer exposes
  `focusElement(id)`, `focusNext()`, `focusPrevious()`, `focusNextWithin()` and
  `focusPreviousWithin()`. Select and Combobox use `focusElement` to return focus. RadioGroup is
  deferred for a different reason.
- **Anchored positioning.** Select and Combobox position internally. There is no public
  `FloatingContent` for a custom popover; a context menu uses the pointer coordinates instead.
- **Window drag and close.** 0.11 exposes `activateWindow`, `minimizeWindow`, `zoomWindow`,
  `toggleFullscreen` and `setWindowTitle`, but no `startWindowMove` or `closeWindow`. The Windows
  backend needs a `window_control_area` / `WM_NCHITTEST` region instead of `start_window_move`, and
  GPUIX exposes neither. GNOME/Mutter also has no server-side decorations, so an app that draws its
  own bar cannot drag the window there. Track upstream [#117](https://github.com/remorses/gpuix/issues/117);
  Linux decoration context is [#49](https://github.com/remorses/gpuix/issues/49), and Windows native
  chrome was restored in [#77](https://github.com/remorses/gpuix/issues/77).
- **Frame readback on Linux.** `TestGpuixRenderer` exists on macOS and Windows only. Visual tests
  skip on Linux; that is a platform limit, not a missing test.
- **CSS.** No `fixed`, no `transform` animation on layout, no inherited colour, no `for=`.
- **Checked state in the a11y tree.** `HostProps` has no `aria-checked`; the native `Switch` and
  `Checkbox` set `role` and report state through `aria-valuetext` (`on`/`off`,
  `checked`/`unchecked`) until GPUIX adds the attribute.
- **IME control.** Composition is handled by the platform; there is no API to drive it in a test.

## Testing hooks

- `createTestRoot({ width, height })` mounts offscreen; `flush()` runs the real build and layout.
- `findByText`, `findByTestId`, `getAllText`, `getA11yTree`, `toJSON` inspect the tree.
- `nativeSimulateClick(x, y, button)`: `button = 2` for a right click.
- `nativeSimulateFileDrop(x, y, paths)` for `onFileDrop`.
- `captureScreenshot(path)` writes a PNG (macOS and Windows).
- `getWindowSize()` makes `useWindowSize()` work under test.

## Review checklist

- API used exists in the pinned version and is imported from `@gpuix/react`.
- No style key outside `StyleDesc`; no colour outside the theme.
- Text goes through `Text`; one string per line.
- Buttons use `pressable`; overlays have a dismissable layer with `pointerEvents`.
- The component still typechecks with `jsxImportSource: "@gpuix/react"`.

## Requests

Window drag and close are missing from 0.11; `docs/upstream/gpuix-window-api.md` is the prepared
upstream issue. Until they exist, `WindowHeader` is chrome-aware layout, not a title bar.
