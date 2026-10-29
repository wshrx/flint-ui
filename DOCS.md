# Documentation rules

The docs are reference material, not marketing. A reader arrives with a task, scans for the command
or the prop, and leaves. Every page is judged by how fast that happens.

## Page shape

Component pages, in this order:

1. One sentence under the title saying what the component is for.
2. `flint-ui add <name>` — the command that puts the file in the project. Copy-pasteable, no prose
   around it.
3. **Usage** — a short TSX example with every import it needs. If the example does not compile as
   written, it is broken.
4. **Props** — a table per exported part, not just the root.
5. **Keyboard and accessibility** — keys, roles, focus behaviour, and what a screen reader says.
   State it per component; never in a global footnote.
6. **When not to use it** — the honest alternative.
7. **Source** — the whole file.

CLI and concept pages follow the same logic: the command or the shape first, the explanation after,
tables for flags and fields, exit codes where a script would care.

## Voice

- Second person, present tense, active voice. "Run `flint-ui init`", not "the CLI will initialize".
- One job per page. A component page documents the component; the reasoning behind the design goes
  in a paragraph, not a section.
- Sentence case for headings. Specific subheadings: "Controlled value", not "Overview" or "Notes".
- Start every section with a sentence that says what the section contains.
- Sentences under 20 words. Paragraphs of two to four sentences.
- Say what the thing does not do. A limitations paragraph saves more support than a features list.

## Code

- TypeScript first, always tagged, always with imports.
- Twenty-five lines maximum per block. Longer means the example is doing too much.
- Real values, never `<TOKEN>` or `xxx`. If a path is needed, use a path that exists in the guide.
- Defaults appear in the props table, not in every example.

## Words to avoid

`simple`, `easy`, `quick`, `just`, `very`, `powerful`, `seamless`, `simply`, `really`. They carry no
information and read as a sales page.

No em dashes. No rhetorical questions. No "Now that we have seen…" transitions. No bold for
emphasis; bold is for a UI element or a fact the reader must not miss.

## Accuracy

- Every claim is checked against `packages/cli/src/index.ts`, `registry/registry.json` or the
  component source before it ships.
- Versions, counts, registry URLs and file lists are copied from code, never from memory.
- A page that mentions a colour uses the token name, not a mood word: "primary", not "ember".
- Dead links and "coming soon" are bugs. If something is not shipped, it does not get a page.

## Review checklist

- [ ] The add command is present and correct.
- [ ] Every example compiles, with its imports.
- [ ] Props tables cover every exported part, including `children` and `style`.
- [ ] Keyboard and accessibility is stated, not implied.
- [ ] Counts and versions match the tree.
- [ ] No forbidden words, no em dashes, no duplicated sentences.
