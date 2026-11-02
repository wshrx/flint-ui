"use client"

import { createContext, useContext } from "react"
import type { ReactNode } from "react"
import { flintDark, flintTheme, type FlintTheme } from "./theme.js"

export interface ThemeProviderProps {
  theme?: FlintTheme
  children?: ReactNode
}

const FlintThemeContext = createContext<FlintTheme>(flintDark)

/**
 * Put this around the app (or around one window) to switch themes.
 *
 * shadcn toggles a `.dark` class on `<html>`; there is no `<html>` here, so the
 * theme is a value and a re-render. Everything below reads the same object, so
 * a switch cannot leave half the tree on the old palette.
 */
export function ThemeProvider({ theme = flintTheme, children }: ThemeProviderProps) {
  return <FlintThemeContext.Provider value={theme}>{children}</FlintThemeContext.Provider>
}

export function useTheme(): FlintTheme {
  return useContext(FlintThemeContext)
}

export { FlintThemeContext }
export type { FlintTheme }
