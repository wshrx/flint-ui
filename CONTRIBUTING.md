# Contributing

The registry is the product. A component is finished when the file, its manifest entry, its page and
its checks all exist; anything less is a draft. Read `docs/gpuix-contract.md` before touching a
component: it is the pinned GPUIX surface and the reason some components are deferred.

## Before you start

```bash
bun install
bun tools/anvil.ts verify     # registry, contrast, types, tests, build, links, kitchen sink
bun run dev                   # docs at http://localhost:4321/flint-ui/
cd examples/kitchen-sink && bun app.tsx   # the real GPUI window
```

Bun 1.4.4 or newer, TypeScript 7.0.2. GPUIX is pinned to one exact version in both packages; do not
bump it alone.

## Add a component

Scaffold the six files first:

```bash
bun tools/new-component.ts toast
bun tools/new-component.ts toast --meta "3 tones · auto dismiss" --dry-run
```

It writes the component, the manifest entry, the docs page, the sidebar item and the catalogue entry.
It does not invent the body, the props table, the kitchen-sink usage or the counts; it prints that
list at the end.

1. **The file** — `registry/components/ui/name.tsx`. Import shared code through `@/lib/flint/...`.
   Tokens only: no `#hex`, no `rgb()`, no colour outside `theme.ts`. Every string goes through
   `<Text>`; one line of text is one template string, never two adjacent text nodes.
2. **The manifest** — add an item to `registry/registry.json` with `registry:ui`, a one-sentence
   description, `registryDependencies` and the file path. Run `bun run registry:check`.
3. **The page** — `apps/www/src/content/docs/docs/components/name.mdx`: the add command, usage with
   every import, a props table per exported part, keyboard and accessibility, when not to use it,
   and the source via `import source from "@/registry/components/ui/name.tsx?raw"`.
4. **The navigation** — `apps/www/astro.config.mjs` sidebar, the catalogue in
   `docs/components.mdx`, the arrays in `Landing.astro` and `LandingRu.astro`, and the counts in
   both READMEs and the landing lede. A component that is not in those four places does not exist
   for a reader.
5. **The example** — use it in `examples/kitchen-sink` so the real renderer touches it.
6. **The checks** — `bun tools/anvil.ts verify`, then the manual rows in `QA.md` for anything
   pointer, focus or window related.

## Rules the review will hold you to

- Tokens, not colours. `theme.colors.*` and `theme.radius.*` only.
- `Text` for every string; a bare string paints black on a dark surface.
- Unique `value` keys. Two items with the same value select the wrong one.
- `buttonProps` for anything that behaves like a button; do not reimplement Enter and Space.
- No `boxShadow` on a surface that can live in a transparent window.
- Overlays get `pointerEvents: "auto"`; a layer with `none` cannot be dismissed.
- A new prop gets a row in the table; `children` and `style` are rows too.

## Docs

`DOCS.md` is the writing contract: page shape, voice, code rules, forbidden words. `QA.md` is the
testing contract: what CI proves and what a person must look at before a tag.

Read registry sources in MDX with the alias, never a stack of `../`:

```mdx
import source from "@/registry/components/ui/button.tsx?raw"
```

## Releases

Changes are batched: three to seven user-visible items, or two weeks. A regression or a security
fix ships alone.

1. Freeze the outgoing docs: `bun scripts/archive-docs.ts v<current>` and commit the result.
2. Bump `packages/cli` and `packages/flint`, write the `CHANGELOG.md` section as prose. The root
   docs label follows the package version.
3. `bun scripts/check-version.ts X.Y.Z` and `bun scripts/check-docs.ts X.Y.Z` must pass. Versions
   are sequential; skipping a patch is rejected.
4. `bun tools/anvil.ts release X.Y.Z`. It verifies, builds the assets, publishes the snapshot and
   pushes the tag. Never publish by hand.

## Editor

The JSON schemas are served from the site and referenced by `$schema` in `flint.json` and
`registry.json`, so VS Code validates both out of the box. There is no extension to install: the
registry is plain TypeScript, and the docs are Markdown.

## Trail

Work on a branch, not on `main`. A release branch gets an AI review in the pre-push hook and can be
linked to a Trail; the three agents review the change, a person approves, then the release is cut.
