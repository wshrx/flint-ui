import { readFileSync, readdirSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import starlightVersions from "starlight-versions"

const base = "/flint-ui"
const version = JSON.parse(readFileSync(new URL("../../packages/flint/package.json", import.meta.url), "utf8")).version

// The archive directory is the source of truth for the version switcher and
// the redirects. Adding a `vX.Y.Z` archive is enough; no second list to edit.
const docsRoot = fileURLToPath(new URL("./src/content/docs", import.meta.url))
const parseVersion = (slug) => {
  const [major = 0, minor = 0, patch = 0] = slug.replace(/^v/, "").split(".").map(Number)
  return [major, minor, patch]
}
const archives = readdirSync(docsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && /^v\d/.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => {
    const [am, an, ap] = parseVersion(a)
    const [bm, bn, bp] = parseVersion(b)
    return bm - am || bn - an || bp - ap
  })
const label = (slug) => (slug === "v0.1" ? "0.1.0" : slug.slice(1))
const redirects = Object.fromEntries(
  archives.flatMap((slug) => [
    [`/${slug}`, `${base}/${slug}/docs/installation`],
    [`/ru/${slug}`, `${base}/ru/${slug}/docs/installation`],
  ])
)

export default defineConfig({
  site: "https://wshrx.github.io",
  base,
  devToolbar: { enabled: false },
  vite: {
    resolve: {
      alias: {
        // Read registry files in MDX with `@/registry/...?raw` instead of a
        // stack of `../`.
        "@": fileURLToPath(new URL("../../", import.meta.url)),
        // Docs-local components stay resolvable after a page is archived under
        // src/content/docs/vX.Y.Z/docs.
        "@docs": fileURLToPath(new URL("./src/components", import.meta.url)),
      },
    },
  },
  // A version root has no page of its own: the plugin only versions the docs
  // subtree, so /vX.Y.Z/ and /ru/vX.Y.Z/ go straight to their installation page.
  redirects,
  integrations: [
    starlight({
      title: "flint",
      description:
        "A component registry for GPUIX. Copy the source into your app, style it with tokens, keep it.",
      logo: { src: "./src/assets/logo.svg", alt: "flint" },
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
        ru: { label: "Русский", lang: "ru" },
      },
      favicon: "/favicon.svg",
      customCss: ["./src/styles/theme.css", "./src/styles/landing.css"],
      components: {
        ThemeProvider: "./src/components/ThemeProvider.astro",
        PageTitle: "./src/components/PageTitle.astro",
        Head: "./src/components/Head.astro",
        Header: "./src/components/Header.astro",
      },
      expressiveCode: {
        themes: ["github-dark-default", "github-light"],
        styleOverrides: { borderRadius: "6px", codeFontSize: "12.5px" },
      },
      social: [{ icon: "github", label: "GitHub", href: "https://github.com/wshrx/flint-ui" }],
      plugins: [
        // The plugin requires at least one version. On the first release there
        // is nothing to switch to, so it is not mounted at all.
        ...(archives.length
          ? [
              starlightVersions({
                // The root always documents the current release: the public
                // repository only ever ships release snapshots, so a separate
                // "Next" would be the same pages under another name.
                current: { label: version },
                versions: archives.map((slug) => ({ slug, label: label(slug) })),
                exclude: ["index.mdx", "docs/versioning.mdx"],
              }),
            ]
          : []),
      ],
      sidebar: [
        {
          label: "Start here",
          translations: { ru: "С чего начать" },
          items: [
            { label: "Installation", slug: "docs/installation", translations: { ru: "Установка" } },
            { label: "Theming", slug: "docs/theming", translations: { ru: "Темы" } },
            { label: "CLI", slug: "docs/cli", translations: { ru: "CLI" } },
            { label: "Registry", slug: "docs/registry", translations: { ru: "Реестр" } },
            { label: "Versioning", slug: "docs/versioning", translations: { ru: "Версии" } },
            { label: "Example app", slug: "docs/example", translations: { ru: "Пример" } },
            { label: "License", slug: "docs/license", translations: { ru: "Лицензия" } },
          ],
        },
        {
          label: "Components",
          translations: { ru: "Компоненты" },
          items: [
            { label: "All components", slug: "docs/components", translations: { ru: "Все компоненты" } },
            { label: "Button", slug: "docs/components/button" },
            { label: "Input", slug: "docs/components/input" },
            { label: "Textarea", slug: "docs/components/textarea" },
            { label: "Label", slug: "docs/components/label" },
            { label: "Field", slug: "docs/components/field" },
            { label: "Checkbox", slug: "docs/components/checkbox" },
            { label: "Switch", slug: "docs/components/switch" },
            { label: "Select", slug: "docs/components/select" },
            { label: "Combobox", slug: "docs/components/combobox" },
            { label: "Dialog", slug: "docs/components/dialog" },
            { label: "Tabs", slug: "docs/components/tabs" },
            { label: "Card", slug: "docs/components/card" },
            { label: "Badge", slug: "docs/components/badge" },
            { label: "Tooltip", slug: "docs/components/tooltip" },
            { label: "Kbd", slug: "docs/components/kbd" },
            { label: "ContextMenu", slug: "docs/components/context-menu" },
            { label: "Dropzone", slug: "docs/components/dropzone" },
            { label: "Separator", slug: "docs/components/separator" },
            { label: "Skeleton", slug: "docs/components/skeleton" },
            { label: "Progress", slug: "docs/components/progress" },
            { label: "Alert", slug: "docs/components/alert" },
            { label: "Avatar", slug: "docs/components/avatar" },
            { label: "Accordion", slug: "docs/components/accordion" },
            { label: "WindowHeader", slug: "docs/components/window-header" },
          ],
        },
      ],
    }),
  ],
})
