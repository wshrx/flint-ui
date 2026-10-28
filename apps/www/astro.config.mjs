import { defineConfig } from "astro/config"
import starlight from "@astrojs/starlight"
import starlightVersions from "starlight-versions"

const base = "/flint-ui"

export default defineConfig({
  site: "https://wshrx.github.io",
  base,
  devToolbar: { enabled: false },
  // A version root has no page of its own: the plugin only versions the docs
  // subtree, so /v0.1/ and /ru/v0.1/ go straight to their installation page.
  redirects: {
    "/v0.1": `${base}/v0.1/docs/installation`,
    "/ru/v0.1": `${base}/ru/v0.1/docs/installation`,
  },
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
        starlightVersions({
          current: { label: "Next" },
          versions: [{ slug: "v0.1", label: "v0.1" }],
          exclude: ["index.mdx", "docs/versioning.mdx"],
        }),
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
            { label: "Checkbox", slug: "docs/components/checkbox" },
            { label: "Switch", slug: "docs/components/switch" },
            { label: "Select", slug: "docs/components/select" },
            { label: "Dialog", slug: "docs/components/dialog" },
            { label: "Tabs", slug: "docs/components/tabs" },
            { label: "Card", slug: "docs/components/card" },
            { label: "Badge", slug: "docs/components/badge" },
            { label: "Tooltip", slug: "docs/components/tooltip" },
            { label: "Separator", slug: "docs/components/separator" },
            { label: "Skeleton", slug: "docs/components/skeleton" },
            { label: "Progress", slug: "docs/components/progress" },
            { label: "Alert", slug: "docs/components/alert" },
            { label: "Avatar", slug: "docs/components/avatar" },
            { label: "Accordion", slug: "docs/components/accordion" },
          ],
        },
      ],
    }),
  ],
})
