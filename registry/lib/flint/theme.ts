/**
 * flint tokens.
 *
 * GPUIX has no CSS variables, so the theme is a plain object. Every component
 * reads it through `useTheme()`, which means switching themes is one React
 * render and no CSS reset.
 *
 * Rules the palette follows:
 * - The background is warm near-black, not #000. Pure black crushes borders.
 * - One accent: night-sky blue. It is the only saturated colour on the screen.
 * - Text on a coloured surface is tinted from that surface, never grey.
 * - Every pair below is checked by `bun run contrast` (WCAG AA).
 */

export interface FlintShadow {
  offsetX: number
  offsetY: number
  blurRadius: number
  spreadRadius: number
  color: string
  inset?: boolean
}

export interface FlintColors {
  /** Page surface. */
  background: string
  foreground: string
  /** Raised surface: cards, panels. */
  card: string
  cardForeground: string
  /** Floating surface: popovers, menus, dialogs. */
  popover: string
  popoverForeground: string
  /** The accent. Primary action. */
  primary: string
  primaryForeground: string
  primaryHover: string
  /** Quiet action. */
  secondary: string
  secondaryForeground: string
  secondaryHover: string
  /** Recessed surface, code blocks, inputs at rest. */
  muted: string
  mutedForeground: string
  /** Hover wash for rows and ghost buttons. */
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  destructiveHover: string
  /** Reserved for status: a passing check, a live connection. */
  success: string
  successForeground: string
  successBorder: string
  /** Hairlines. Always 1px. */
  border: string
  /** Stronger hairline for inputs and dividers that need to read as a field. */
  input: string
  /** Focus ring. */
  ring: string
  /** Dialog backdrop. */
  overlay: string
  /** Text selection wash. */
  selection: string
  /** Native caret in inputs. */
  caret: string
}

export interface FlintRadius {
  xs: number
  sm: number
  md: number
  lg: number
  xl: number
  full: number
}

export interface FlintFont {
  sans: string
  mono: string
  display: string
}

export interface FlintTextSize {
  xs: number
  sm: number
  base: number
  md: number
  lg: number
  xl: number
  "2xl": number
  "3xl": number
}

export interface FlintTheme {
  name: "dark" | "light"
  appearance: "dark" | "light"
  colors: FlintColors
  radius: FlintRadius
  font: FlintFont
  text: FlintTextSize
  leading: { tight: number; normal: number; relaxed: number }
  shadow: { sm: FlintShadow[]; md: FlintShadow[]; lg: FlintShadow[] }
}

const radius: FlintRadius = { xs: 4, sm: 6, md: 8, lg: 10, xl: 14, full: 999 }
const font: FlintFont = { sans: "Medeo Sans", mono: "Medeo Mono", display: "Medeo Sans Display" }
const text: FlintTextSize = { xs: 11, sm: 12, base: 13, md: 14, lg: 16, xl: 20, "2xl": 24, "3xl": 32 }
const leading = { tight: 1.2, normal: 1.45, relaxed: 1.6 }

export const flintDark: FlintTheme = {
  name: "dark",
  appearance: "dark",
  colors: {
    background: "#0A0C10",
    foreground: "#E8EDF4",
    card: "#0F1218",
    cardForeground: "#EDEAE4",
    popover: "#12161D",
    popoverForeground: "#E8EDF4",
    primary: "#38BDF8",
    primaryForeground: "#04121C",
    primaryHover: "#5FCBFB",
    secondary: "#161B23",
    secondaryForeground: "#E8EDF4",
    secondaryHover: "#1D2430",
    muted: "#11161D",
    mutedForeground: "#98A2B3",
    accent: "#161C26",
    accentForeground: "#F1F6FB",
    destructive: "#C0323A",
    destructiveForeground: "#FFF4F4",
    destructiveHover: "#CC3A42",
    success: "#9BD8B4",
    successForeground: "#0E1F16",
    successBorder: "#2E5A43",
    border: "#1E2530",
    input: "#606B7E",
    ring: "#38BDF8",
    overlay: "#05070ACC",
    selection: "#38BDF840",
    caret: "#38BDF8",
  },
  radius,
  font,
  text,
  leading,
  shadow: {
    sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: "#00000066" }],
    md: [{ offsetX: 0, offsetY: 6, blurRadius: 18, spreadRadius: -4, color: "#00000080" }],
    lg: [{ offsetX: 0, offsetY: 20, blurRadius: 48, spreadRadius: -12, color: "#000000A6" }],
  },
}

export const flintLight: FlintTheme = {
  name: "light",
  appearance: "light",
  colors: {
    background: "#EEF1F4",
    foreground: "#0F1419",
    card: "#FAFBFC",
    cardForeground: "#161618",
    popover: "#FFFFFF",
    popoverForeground: "#0F1419",
    primary: "#0369A1",
    primaryForeground: "#F0F9FF",
    primaryHover: "#075985",
    secondary: "#E9EDF2",
    secondaryForeground: "#0F1419",
    secondaryHover: "#DEE4EB",
    muted: "#EEF1F5",
    mutedForeground: "#52606F",
    accent: "#E8EDF3",
    accentForeground: "#0F1419",
    destructive: "#BC2F36",
    destructiveForeground: "#FFF6F6",
    destructiveHover: "#A8272E",
    success: "#1D6B45",
    successForeground: "#F2FBF6",
    successBorder: "#16512F",
    border: "#DCE2EA",
    input: "#7C8B9D",
    ring: "#0369A1",
    overlay: "#0F141966",
    selection: "#0369A126",
    caret: "#0369A1",
  },
  radius,
  font,
  text,
  leading,
  shadow: {
    sm: [{ offsetX: 0, offsetY: 1, blurRadius: 2, spreadRadius: 0, color: "#1A19171A" }],
    md: [{ offsetX: 0, offsetY: 6, blurRadius: 18, spreadRadius: -4, color: "#1A191724" }],
    lg: [{ offsetX: 0, offsetY: 20, blurRadius: 48, spreadRadius: -12, color: "#1A191733" }],
  },
}

/** Default theme. Dark, because the first window a desktop app opens is dark. */
export const flintTheme = flintDark

/** Native `<input>` / `<textarea>` colours. */
export function inputTheme(theme: FlintTheme) {
  return {
    appearance: theme.appearance,
    bg: theme.colors.muted,
    text: theme.colors.foreground,
    textMuted: theme.colors.mutedForeground,
    border: theme.colors.input,
    caret: theme.colors.caret,
    accent: theme.colors.primary,
    fontSans: theme.font.sans,
    fontMono: theme.font.mono,
  }
}
