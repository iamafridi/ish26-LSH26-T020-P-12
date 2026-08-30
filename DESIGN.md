# DESIGN.md — Personal Ledger Manager

The visual system, written down so it can be checked rather than felt.

---

## 1. The decision

**Swiss typographic structure on paper stock, with editorial figures.**

A ledger is a document before it is an app. The reference objects are the printed
account book and the financial broadsheet — ruled lines, decimal-aligned columns,
numbered sections, a single stamp colour. Not the SaaS dashboard.

This was chosen against the obvious alternative, which is what most financial
interfaces reach for: a dark ground, glass panels, a neon accent and a glow.
That style is now the default output of every design tool and every model, and it
has three concrete problems for this product:

1. **Glass and glow fight the numbers.** A blurred translucent panel behind a
   column of digits lowers contrast exactly where legibility matters most.
2. **It reads as a crypto dashboard**, which is the wrong promise for an
   application about household salary and grocery receipts.
3. **It is everywhere.** In a room of submissions it is invisible.

Paper is the opposite bet: high contrast, no depth effects, typography doing the
work. It also happens to be the correct choice on the merits — this interface is
read, not operated, for most of its surface area.

## 2. Anti-patterns — banned outright

Not preferences. If a change introduces one of these, it is wrong.

| Banned | Why |
|---|---|
| Purple/blue or any decorative gradient | The single strongest tell of a generated interface. |
| Glassmorphism, `backdrop-filter` panels | Lowers contrast on numeric content. |
| Coloured glow / `box-shadow` used as decoration | Depth theatre; nothing here is floating. |
| Inter, Roboto, Arial, system-ui as the brand face | Anonymous. The type *is* the identity. |
| Cards nested inside cards | Two borders describing one region. Use a rule. |
| Bounce or elastic easing | Dated, and it makes financial data look playful. |
| Pure `#000` / `#fff` / untinted greys | Flat and cold. Every neutral here is warm-tinted. |
| Rounded-square pastel icon tiles | The template signature. |
| A number rendered without tabular figures | Columns that do not align are a correctness signal. |

## 3. Colour

Every neutral carries a warm tint. There is no pure grey in the system.

```
Light (default)              Dark
--paper      #FAF8F3         #12110E
--paper-sunk #F2EFE7         #1A1815
--ink        #17150F         #F5F2EA
--ink-muted  #5C5648         #A8A08C
--ink-faint  #8B8474         #6E6757
--rule       #DDD8CA         #2E2B24
--rule-firm  #C4BDA9         #423E33
```

One accent, used as a stamp — never as a fill for large areas:

```
--vermillion #C1440E    marks, the active indicator, shortfall
--forest     #1F6B4A    surplus, on-track, positive delta
```

`--vermillion` doubles as the shortfall colour deliberately. The brand mark and
the warning are the same red because in a ledger they mean the same thing: look
here. A third hue would be decoration.

Category colours are a separate, muted, ordered ramp — earth tones, not a
rainbow. They appear only in the breakdown chart, and every segment is also
labelled, so colour is never the sole carrier of meaning.

## 4. Type

| Role | Face | Notes |
|---|---|---|
| Display, figures | **Instrument Serif** | Editorial high-contrast serif. Hero amounts, page titles, pull figures. |
| Text, UI | **Instrument Sans** | Its companion grotesk. Labels, body, controls. |
| Money, data | **JetBrains Mono** | `font-variant-numeric: tabular-nums`. Every amount in every table. |

Scale, on a 1.25 ratio from a 16px base:

```
--t-xs   12px   labels, meta, table headers (uppercase, +0.08em tracking)
--t-sm   14px   secondary text
--t-base 16px   body — never smaller for input, to stop iOS zoom
--t-lg   20px
--t-xl   25px   section headings
--t-2xl  31px
--t-3xl  44px   page titles
--t-4xl  64px   the one hero figure per screen
```

**The paisa rule.** Money renders as taka at full size with the paisa at 0.62em
and reduced weight, always decimal-aligned in tabular figures. It is the
signature detail of the interface and it is also functional: it puts the digit
that matters at full size and keeps a column of amounts scannable.

## 5. Structure

- A 12-column grid, 24px gutters, `--measure: 68ch` cap on any block of prose.
- **Hairline rules carry the structure.** Regions are separated by a 1px
  `--rule`, not by a card with a shadow. Where a card is genuinely needed it is a
  1px border on `--paper`, with no shadow and a 2px radius.
- Sections are numbered `01 / 02 / 03` in `--t-xs` uppercase mono. Swiss habit,
  and it gives a judge a spoken index for the page.
- Spacing is a 4px scale. Padding is generous: 24px minimum inside a region,
  32–48px between sections.
- Touch targets are 44×44px minimum. Line length stays inside 45–75 characters at
  every breakpoint.

## 6. Motion

Purposeful only, and cheap.

```
--ease: cubic-bezier(0.2, 0, 0, 1)
--fast: 140ms      hover, focus, press
--base: 220ms      panel and row entrance, tab change
```

No bounce, no elastic, no scroll-jacking, no parallax. The one indulgence is a
staggered fade-and-rise on first paint of a list, capped at 6 rows so a long
ledger does not shimmer. All of it collapses to nothing under
`prefers-reduced-motion: reduce`.

## 7. Dark mode

Both a `prefers-color-scheme` default and an explicit `[data-theme]` override, so
the toggle wins in both directions. Dark is not an inversion: the paper warmth is
kept, the ink drops to `#F5F2EA` rather than white, and rules get *lighter*
relative to the ground rather than darker.

## 8. Accessibility, as a design constraint

- Body and label text meets WCAG AA against its own ground; the muted ink is
  checked against `--paper`, not against white.
- Colour is never the only signal. A shortfall is red **and** carries a minus
  sign **and** is labelled "short".
- Every figure on the dashboard has a text equivalent; charts carry
  `role="img"` with a full `aria-label` naming the values.
- Visible focus rings, 2px `--vermillion`, never removed.
