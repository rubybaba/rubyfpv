# RubyFPV Editorial Magazine — screenshot match

Branch: `feat/editorial-magazine`. Visual design approved on 2026-10-13; the user requested publication. Production builds now include the approved five example articles.

Run `npm ci`, then `npm run dev -- --port 4174`. Open http://127.0.0.1:4174/blog/. Restart the dev server after changing imported build scripts. Click a title for its article. Arrow controls and Left/Right keys browse columns; wheel/Up/Down scroll the focused column. Mobile shows one article and a hint of the next.

The latest user-selected screenshot replaces the earlier A–F theme selector. Every article carries a `palette` frontmatter field shared by its column and entire detail page:

| Palette | Background | Text |
| --- | --- | --- |
| sage | #C3C5BB | #000000 |
| orange | #000000 | #EC862A |
| brown | #52371E | #FFFFFF |
| yellow | #FFDB17 | #000000 |
| red | #FFFFFF | #FF0000 |

Colors were checked against the supplied screenshot after its embedded ICC profile was converted to sRGB, and against live computed styles. The screenshot yellow is #FFDB17; the live site currently uses #FFDB16. The screenshot takes precedence.

Title font: locally hosted STIX Two Text Regular, SIL Open Font License; license in `blog/fonts/stix-two-text-OFL.txt`. This is an authorized similar-style substitute for the reference's commercial Suisse Works Regular, not an exact font match. Body: Times New Roman; metadata: Courier New. Chinese falls back to Songti SC, Noto Serif CJK SC, Source Han Serif SC, SimSun. System fonts are not redistributed and fallback availability varies by OS.

Column geometry matches the live reference: 330px outer width, 15px scroll gutter, 30px side padding, 28px top padding; title 45/45px with -2px tracking; metadata 16/22px; opening paragraph 20/24px; subsequent text 16/22px. Chinese paragraph line-height is 1.5 for legibility.

`npm run build` generates the magazine, published articles, category pages, canonical URLs, social metadata and sitemap. Set `draft: true` on an article to exclude it from production; `npm run build:preview` includes drafts with noindex. The old pink `visual-check` test stays draft-only. Approved sample text and photo credits remain clearly identified as examples. The existing homepage is byte-identical to the preserved pink checkout. Build tests cover the production magazine, SEO, category pages, draft exclusion and per-article palette consistency.

Previous pink checkout: `../rubyfpv`, port 4173. Previous A–F and pink screenshots/source archives remain in task outputs. The pre-change A–F source snapshot also lives in `outputs/reference-match/before-reference-match-source.zip` at task root.

Files: `blog/editorial.css`, `blog/editorial.js`, `scripts/editorial.mjs`, `content/editorial/`, `content/editorial-media/`.

Photo credits: Markus Spiske / Pexels photo 121192; Subramaniam K V / Mount Fuji from Lake Kawaguchi / CC BY 3.0. Credits and links are rendered under images. Photos are illustrative samples. The four-second video is a silent pan of the Pexels image used to test playback.
