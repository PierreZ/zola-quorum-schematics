# pierrez-blueprint

A [Zola](https://www.getzola.org) theme that looks like an **architect's drawing
sheet** but breathes like a **terminal**: a terminal command-history nav, a build-log prompt
with a blinking cursor, a fixed status bar, an opt-in disk-failure fault-injection toggle,
and two color themes — `blueprint` (ink on warm paper, light) and `cyanotype` (the
negative: cyan on navy, dark).

100% monospace. Fine `1px` borders instead of shadows. A single accent cyan, with red
reserved for failure states. Zero CDN — the font is self-hosted.

![screenshot](screenshot.png)

## Features

- Two color themes with a JS toggle that **persists** (`localStorage`) and respects
  `prefers-color-scheme` on first load — no flash of the wrong theme.
- **Opt-in disk-failure toggle**: simulates a failing data disk. Content across the page
  is re-served from corrupted blocks — words are scrambled with **typoglycemia** (first &
  last letter kept, middle shuffled, so it stays readable), the console reports a
  `✗ … checksum mismatch`, the replica being read goes red in the cluster, and the status
  bar drops to `disk: read errors`. The corruption **re-rolls on every reload**;
  *heal disk* restores the original exactly. Independent from the color toggle.
- **Page-aware quorum-read console**: each page echoes `./read --quorum <its path>` with
  real counts; the serving replica is picked at random per load and highlighted.
- **Deterministic seed** per post, derived from its slug (stable hex like `0x4f2a91e`),
  shown in the post list and article meta.
- Footer **vector clock** `[deploy:N, edit:M, rev:X]` derived from build metadata.
- Numbered **table of contents** (`1.0 … N.0`) from `page.toc`, clickable heading
  anchors.
- Dual syntax-highlighting stylesheets (light + dark) switched with the theme.
- RSS + Atom feeds, sitemap, tag taxonomy with its own index, optional client-side
  search (self-hosted elasticlunr), self-hosted JetBrains Mono.
- Responsive: the footer cartouche folds, the nav collapses, the BOM stacks at narrow widths.

## Requirements

- Zola **0.19.0+** (developed and tested against 0.22.1).

## Install

From your site's root:

```bash
git submodule add https://github.com/PierreZ/pierrez-blueprint themes/pierrez-blueprint
# or just copy the folder into themes/
```

Then in your `config.toml`:

```toml
theme = "pierrez-blueprint"
```

The theme expects:

- A `tags` taxonomy and feeds/search enabled (copy the snippet below).
- Your posts to live in a section at `content/posts/` (used for the build-log count and
  the home/section listings).

```toml
taxonomies = [{ name = "tags", feed = true }]
generate_feeds = true
feed_filenames = ["atom.xml", "rss.xml"]
build_search_index = true

[markdown]
insert_anchor_links = "right"

[markdown.highlighting]
style = "class"            # required: emits class-based CSS so themes can switch
light_theme = "solarized-light"
dark_theme = "solarized-dark"
```

> **Note on syntax CSS:** with `style = "class"`, Zola emits `giallo-light.css` and
> `giallo-dark.css` at the site root (the filenames are fixed by Zola, regardless of the
> theme names). The theme links both and toggles the active one with the color theme.

## Configuration — every `[extra]` key

All keys are **optional**; each has a sensible default baked into the templates. Copy
what you want to override into your site's `[extra]`.

### Console strip (the terminal client)

The console is the client reading from the cluster, and the command **matches the current
page** — a quorum read against its path:

| Page | Console command | Output |
|------|-----------------|--------|
| home | `./read --quorum home` | `✓ quorum 2/3 · N documents · committed` |
| `/posts` | `./read --quorum posts` | `✓ quorum 2/3 · N documents · committed` |
| a post | `./read --quorum posts/<slug>` | `✓ quorum 2/3 · served by node-N` |
| `/tags` | `./read --quorum tags` | `✓ quorum 2/3 · N tags · committed` |
| a tag | `./read --quorum tags/<slug>` | `✓ quorum 2/3 · N documents · committed` |

On a post the serving node is chosen at random on every refresh (and highlighted in the
schematic), so the read lands on a different replica each time. The 3-node cluster
schematic (0-indexed: `node-0`–`node-2`) is drawn in this strip.

| Key | Default | Description |
|-----|---------|-------------|
| `prompt_user` | `user@host` | Text before the `:` |
| `prompt_path` | `~/blog` | Path after the `:` |
| `read_replica` | `node-0` | Server-side default node (randomized client-side per load) |
| `cluster_enabled` | `true` | Show the 3-node cluster schematic in the console |

The `N` counts are real (from the section/taxonomy being viewed). The per-post
consistency level shown in the article meta comes from `page.extra.consistency`
(falling back to `extra.default_consistency`); the post's deterministic seed is shown in
that meta row too (not in the console).

### Fault injection (disk failure)

| Key | Default | Description |
|-----|---------|-------------|
| `chaos_enabled` | `true` | Show the fault-injection bar (`inject disk failure`) |
| `chaos_hint` | _(none)_ | Optional hint text on the right of the fault bar |

The corruption (typoglycemia) is applied to content on **every page** — the hero, the
post list, and article bodies — never to the terminal chrome (nav, console, footer).

### Hero (home page)

| Key | Default | Description |
|-----|---------|-------------|
| `specs` | – | Array of `{ label, value }` cells (`domain` / `focus` / `lang` …) |
| `dimline_start` | – | Left end of the dimension line |
| `dimline_end` | – | Right end of the dimension line |

The hero `<h1>` comes from the home section's `title` (HTML is allowed — wrap a word in
`<span class="u">…</span>` for the cyan underline), and the intro paragraphs from the
section body.

```toml
specs = [
  { label = "domain", value = "distributed systems" },
  { label = "focus", value = "simulation & correctness" },
  { label = "lang", value = "rust" },
]
dimline_start = "2019"
dimline_end = "2026 · 6 yrs"
```

### Article

| Key | Default | Description |
|-----|---------|-------------|
| `default_consistency` | `linearizable` | Fallback for the consistency badge |
| `clock_rev` | `A` | The `rev:` field of the footer vector clock + breadcrumb |

Per-post, set the consistency badge in the page front-matter:

```toml
[extra]
consistency = "eventually-consistent"
```

### Status bar

| Key | Default | Description |
|-----|---------|-------------|
| `status_online` | `● online` | Left label |
| `status_uptime` | `uptime: —` | Uptime label |

`last deploy` is the real build date (`now()`).

### Footer & navigation

| Key | Default | Description |
|-----|---------|-------------|
| `copyright` | `config.title` | Revision-history line |
| `nav` | home / blog / tags | Array of `{ name, url }`; use `$BASE_URL` as a prefix |
| `social` | – | Array of `{ name, url }` social links (an `rss` link is added automatically) |

```toml
[[extra.nav]]
name = "home"
url = "$BASE_URL/"
[[extra.nav]]
name = "blog"
url = "$BASE_URL/posts/"

[[extra.social]]
name = "github"
url = "https://github.com/you"
```

### Search (optional)

| Key | Default | Description |
|-----|---------|-------------|
| `[extra.search] enabled` | `false` | Show a client-side search box in the nav bar (results drop down) |

Requires `build_search_index = true`. The theme ships a vendored
`static/js/elasticlunr.min.js` (no CDN) and a minimal `search.js`.

## Shortcodes

### `quote(author, source?)`

A framed citation with a cyan left border.

```
{%/* quote(author="Steve Klabnik", source="Steel, Rust, and truth") */%}
We said "good enough" because we wrote it, we understood it, we tried it.
AI broke all three.
{%/* end */%}
```

### `note(title?)`

A callout box (`title` defaults to `note`).

```
{%/* note(title="why determinism") */%}
If the scheduler is deterministic, every flake becomes a fixture.
{%/* end */%}
```

## How the signature bits work

- **Seed** — Zola has no string-hashing function, so the theme computes a deterministic
  djb2-style hash of `page.slug` in pure Tera (`templates/macros.html`, `seed` macro),
  rendered as `0x` + 7 hex digits. The same slug always yields the same seed.
- **Vector clock** — `deploy` = number of posts, `edit` = number of tag terms,
  `rev` = `extra.clock_rev`. Cosmetic but stable.

## Known limitations / choices

- **Heading numbers in prose**: the reference mock shows `1.0` glued to each prose
  heading. Zola renders Markdown headings without a hook to inject numbers, so the theme
  numbers the **TOC** instead and relies on clickable anchors. The TOC is the
  source of truth for section numbering.
- **Syntax CSS filenames** are fixed by Zola (`giallo-light.css` / `giallo-dark.css`).
- **Search** is opt-in and intentionally minimal (title + excerpt, top 8 results).
- The dark theme is switched via the toggle (and `prefers-color-scheme` on first load),
  not via `@media` on the syntax sheets, so JS owns the active stylesheet.

## Development

This repo is itself a runnable Zola site (it doubles as the demo). A Nix flake provides
Zola:

```bash
nix develop -c zola serve   # http://127.0.0.1:1111
nix develop -c zola build
nix develop -c zola check
```

## License

MIT — see [LICENSE](LICENSE).
