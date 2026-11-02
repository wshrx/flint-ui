/**
 * flint — the barrel the package builds from.
 *
 * Components are imported by path in the registry (`@/components/ui/button`),
 * but the npm package exposes one entry point. Keeping this file flat means a
 * new component is one line here and one entry in registry.json.
 */

export * from "@/lib/flint/theme.js"
export * from "@/lib/flint/theme-provider.js"
export * from "@/lib/flint/utils.js"
export * from "@/lib/flint/pressable.js"
export * from "@/lib/flint/text.js"
export * from "@/lib/flint/icon.js"
export * from "@/lib/flint/fonts.js"
export * from "@/lib/flint/use-controllable.js"
export * from "@/lib/flint/icons/index.js"

export * from "@/components/ui/accordion.js"
export * from "@/components/ui/alert.js"
export * from "@/components/ui/avatar.js"
export * from "@/components/ui/badge.js"
export * from "@/components/ui/button.js"
export * from "@/components/ui/card.js"
export * from "@/components/ui/checkbox.js"
export * from "@/components/ui/combobox.js"
export * from "@/components/ui/context-menu.js"
export * from "@/components/ui/dialog.js"
export * from "@/components/ui/dropzone.js"
export * from "@/components/ui/field.js"
export * from "@/components/ui/input.js"
export * from "@/components/ui/kbd.js"
export * from "@/components/ui/label.js"
export * from "@/components/ui/progress.js"
export * from "@/components/ui/select.js"
export * from "@/components/ui/separator.js"
export * from "@/components/ui/skeleton.js"
export * from "@/components/ui/switch.js"
export * from "@/components/ui/tabs.js"
export * from "@/components/ui/textarea.js"
export * from "@/components/ui/tooltip.js"
export * from "@/components/ui/window-header.js"
