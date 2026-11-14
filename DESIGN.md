# Bizbaan design book

Taken from bizbaan.nl on 11.11.2026. The calculator and the offer follow this. If the site changes, change the tokens in `style.css` and this page together.

## What the brand is

A thin, geometric wordmark, one heavy blue rule under it, and a wide-spaced caps line. Dark navy pages, white cards, lots of air. Calm, exact, personal. Urban speaks in the first person ("Mijn naam is Urban") and promises clarity, so the tool and the offer do the same.

## Three moves that carry the look

1. **The blue rule.** The 3 to 4 px bar from the logo sits under every section title and under the big price. It is the only decoration.
2. **Thin big numbers.** Prices are set large and light (weight 300), like the wordmark. Labels are tiny, caps, wide-spaced.
3. **Navy for what matters.** The price panel and every selected choice are navy. Blue fill is kept for the one main button on a screen.

## Colour

| Token | Light | Dark | Used for |
|---|---|---|---|
| `--brand` | `#173bb5` | `#5b93ff` | the rule, links, the quick number |
| `--brand-2` | `#1262f5` | `#1262f5` | the one filled button, switches, focus |
| `--navy` | `#08131f` | `#0b1826` | price panel, selected chips |
| `--bg` | `#f7f7f7` | `#060d14` | page |
| `--card` | `#ffffff` | `#0b1826` | cards |
| `--ink` | `#171717` | `#f5f5f5` | text |
| `--mute` | `#737373` | `#a3a3a3` | labels, hints |
| `--line` | `#e5e5e5` | white 15% | borders |
| `--soft` | `#edf4fd` | `#10263d` | hover, open panels |

The site's own names: accent 950 (navy), brand secondary `#1262f5`, favicon blues `#173bb5` and `#09247d`, neutral greys with no tint. No other colours. Orange-brown `--warn` appears only for "out of stock" and delete.

## Type

Inter, the same as the site, loaded from rsms.me with the system font as fallback. Tabular figures everywhere so columns of money line up.

| Role | Size | Weight | Notes |
|---|---|---|---|
| Price | 46 px (30 on phone) | 300 | tight tracking |
| Offer title | 34 px | 300 | blue rule under it |
| Typed numbers | 18 px | 500 | |
| Body | 16 px | 400 | 15 px on paper |
| Section title | 13 px | 600 | caps, tracking 0.16em |
| Label | 12 px | 400 | muted |

## Shape and touch

- Radius 12 px for cards, 8 px for fields, full pill for buttons and chips. The site uses the same three.
- Every touch target is at least 44 px high, fields 48 px.
- One filled button per screen. On the calculator that is "Turn into offer".
- Light or dark follows the device. Paper (offer and private sheet) is always white.

## The offer

White page, logo top left, company block top right, title with the blue rule, four facts in a row, a short personal opening, the price table, three "good to know" lines, a personal closing signed by Urban, and a one-line footer. No boxes, no colour fills, nothing that looks like software. Every text block can be clicked and rewritten.

## Skins

Picked in settings under Look. Auto, Light and Dark are the Bizbaan look above. Three more are for fun, in the spirit of underground record sleeves. They change tokens only: colour, corner radius, rule weight, figure weight and typeface. Layout and paper never change.

| Skin | Idea | Ground | Ink | Accent | Type | Corners |
|---|---|---|---|---|---|---|
| Press | white-label test pressing | cream `#e4e0d6` | black `#121212` | stamp red `#d2311f` | system mono | square |
| Acid | black room, one strobe | `#080808` | `#ececec` | `#d4ff2a` | system mono | 2 px |
| Riso | two-colour sleeve print | `#efe5d0` | blue `#17256b` | pink `#ff4a78` | Inter, heavy figures | 4 px |

To add one: copy a `:root[data-skin="…"]` block in `style.css` and add a line to `SKINS` in `app.js`.

## Voice

First person, warm, short. Explains instead of impressing: his clients have never renovated before. Formal "u" in Dutch, as on the site. Money is always exact and never joked about.

## Assets

`assets/logo-dark.png` (on white), `assets/logo-light.png` (on navy), `assets/favicon.svg`. All from bizbaan.nl/brand.
