# CLAUDE.md — pierrez-blueprint

A standalone, publishable **Zola theme** (`blueprint × terminal`). This repo is *itself*
a runnable Zola site — its `content/`, `config.toml`, `templates/`, `static/` are both
the theme and its demo. `reference.html` is the design source of truth; `BRIEF.md` is
the original spec.

## Commands (always via the Nix dev shell — Zola is not global)

```bash
nix develop -c zola serve --interface 127.0.0.1 --port 1111   # NOT 0.0.0.0 (see below)
nix develop -c zola build
nix develop -c zola check
```

`zola build` **and** `zola check` must both pass with zero errors/warnings before
committing (the "dirty Git tree" line is from Nix, not Zola — ignore it).

## Layout

- `templates/base.html` — head, `.sheet` wrapper, includes all partials, defines blocks
  `title` / `description` / `content` / `extra_head` / `extra_body`. Computes
  `post_count` from `get_section(path="posts/_index.md")`.
- `templates/macros.html` — `seed(slug)`, `lineno(n)`, `bom_row(page, n)`.
- `templates/partials/` — cluster (SVG, drawn inside the console), nav (terminal
  command history), console (page-aware: build line vs. distributed `render` read on
  posts), chaos (disk-failure bar), search, statusbar, footer. No title block.
- `templates/{index,section,page,taxonomy_list,taxonomy_single}.html`.
- `templates/shortcodes/{quote,note}.html`.
- `static/{css,js,fonts}/`. JS is plain vanilla, no build step.

## Tera / Zola gotchas (all learned the hard way here — don't reintroduce)

- **No string hash function** in Zola. The per-post seed is a pure-Tera djb2 hash in the
  `seed` macro (`split(pat="")` over chars → `set_global` polynomial → 7 hex digits via
  an array literal `hx[d]`). `split(pat="")` emits empty boundary elements — the `if ch`
  guard skips them. Don't "simplify" this away; same slug must give the same seed.
- **Can't access `.attr` on a function-call result.** `get_section(...).pages` fails to
  parse. Assign to a variable first: `{% set s = get_section(...) %}{{ s.pages }}`.
- **Can't call a macro inside an expression.** `x ~ self::m(...)` fails. Use values
  (array indexing, filters) in expressions; call macros only in `{{ }}`/`{% %}`.
- **Macros are flaky through `{% include %}`.** Importing `macros.html` inside an
  included partial (e.g. footer) did not resolve. Rule: only `m::...` in templates that
  `{% import %}` it directly in their own block; inline trivial logic into partials.
- **Body shortcodes use `{% quote(...) %} … {% end %}`**, not `{{ }}`. The `{{ }}` form
  is for inline (bodyless) shortcodes only.
- **Zola 0.22 highlighting config** lives under `[markdown.highlighting]`
  (`style="class"`, `light_theme`, `dark_theme`) — NOT the old `highlight_code` /
  `highlight_theme` / `highlight_themes_css` keys. Class style emits fixed filenames
  `giallo-light.css` / `giallo-dark.css` (regardless of theme names) into `static/` —
  these are generated, so they're git-ignored. The theme links both and the JS toggle
  switches the active one (we deliberately avoid `@media prefers-color-scheme` on them so
  the manual toggle can win).
- **`zola serve --interface 0.0.0.0`** bakes `http://0.0.0.0:1111/...` into asset URLs,
  which browsers can't load → unstyled page. Use `127.0.0.1` (the default).
- **`zola check`** validates external links; demo social domains are listed under
  `[link_checker] skip_prefixes` so it stays green offline. Add new external demo links
  there or use real reachable URLs.

## Conventions

- 100% monospace, `1px` borders (no shadows), single cyan accent, red only for failure
  states. Only the cursor blinks; the disk-failure corruption is rolled once per load
  (static while reading) and honors
  `prefers-reduced-motion`.
- Every new tunable goes through `config.extra.*` with a `| default(...)` in the
  template, and must be documented in `README.md` (the full `[extra]` table) and listed
  in `theme.toml`.
- Keep long-form articles readable: line width ~68–70ch, nothing moving during reading.
