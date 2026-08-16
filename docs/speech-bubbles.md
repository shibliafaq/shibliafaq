# The speech bubbles

> **This file is a reference, not the source.**
>
> These seven lines are the `says` field in **`docs/timeline-copy.md`**, and
> `tools/sync-copy.mjs` is what writes them into `index.html`. Two documents
> once described the same strings and drifted apart without anyone noticing —
> the table here still said "architectural internship" and "leading projects in
> Architecture" long after the markup had said something else, because whichever
> tool ran last silently won.
>
> **Edit `docs/timeline-copy.md`.** The table below is regenerated from the
> markup and is here so the seven lines can be read together, in the order he
> reaches them, which the six-field document cannot show.


The line the character says when he arrives at each of the seven focal points.

## Where they live

**Edit the table below.** Then run:

```bash
node tools/sync-bubbles.mjs           # show what would change
node tools/sync-bubbles.mjs --write   # apply it
```

That pushes the lines into `index.html`, where they are served from — one hidden
`<p>` inside each `<li class="tli" data-stop="…">`:

```html
<p class="tli__says" data-i18n="bg.says.chadda" hidden>My first real office.</p>
```

The copy has to live in the markup to be crawlable and to be translated by the
i18n engine, but that is a bad place to *write*: the seven lines are scattered
across a thousand-line file, in the reverse of the order they are spoken. So the
table is where you write and `index.html` is where it is served. One direction
only — the sync never reads back. Editing the markup by hand still works, but the
next sync overwrites it.

The sync **refuses to write** unless the table and the markup name exactly the
same seven stops. A renamed id or a dropped row would otherwise leave one stop
saying something nobody chose.

## The seven, and where to find them

The map is walked top to bottom, but the timeline list is newest-first, so the
line numbers run in the opposite order to the journey. Listed here in the order
he actually reaches them.

| # | `data-stop` | what he says |
|---|---|---|
| 1 | `barch` | My first college, I spent five years here and learned how to think like an Architect. |
| 2 | `chadda` | My first real office; it was hard learning the professional dynamics. |
| 3 | `metarch1` | The second summer internship in my favorite office. |
| 4 | `jaiswal` | I went to Delhi for a five-month internship, and I learned a lot there. |
| 5 | `medicfibers` | I joined this office for a detour into graphic design because of the job scarcity during the pandemic. |
| 6 | `metarch2` | I rejoined the Metarch Studios office and this time leading the projects. |
| 7 | `kfupm` | I decided to pursue an M.Sc in Smart and Sustainable Cities at KFUPM to learn more about cities. |

The `line` column is where each one currently sits in `index.html` — it is only
a signpost and the sync ignores it, because line numbers go stale the moment
anything above them changes. The `data-stop` id is what matches.

One rule for the table itself: **no `|` in the text**, it would split the row.

## Rules worth knowing before you rewrite them

**Keep them short.** One or two sentences. The bubble is `max-width: 19rem` and
sits beside his head — a paragraph makes it a wall that covers the map he is
standing on. Everything long belongs in the card below, which already carries
the dates, role, employer and full description.

**Keep `hidden` on the element.** Without it the line also renders inside the
timeline list, which is the formal CV and should stay formal.

**Do not change the `data-i18n` key.** `bg.says.<stop-id>` is how translations
attach. Changing the English text alone is always safe; changing the key orphans
any translation of it.

**HTML is allowed.** The bubble uses `innerHTML`, so `<em>` and `<strong>` work
if you want emphasis.

**Deleting a line removes the bubble** for that stop rather than showing an empty
one — the renderer returns nothing when there is no text. That is the way to
turn one off.

## Translations

The other six languages live in **`src/i18n/strings.js`**, keyed the same way:

```js
'bg.says.chadda': 'Mon premier vrai bureau. Un été de plans de permis.',
```

**They are optional.** A key with no entry falls back to whatever English is in
`index.html`, so the bubbles work in every language today and translations can be
added one at a time whenever. Right now none of the seven are translated.

## What the bubble is not

It is not the card. The card is the record — period, role, organisation,
description — and appears at the bottom of the stage at the same time. Its copy
comes from `.tli__period` / `.tli__role` / `.tli__org` / `.tli__note` in the same
`<li>`, and editing those is a separate job from editing these.

See `docs/valley.md` for how the bubble is positioned and why it is a separate
element from the card.
