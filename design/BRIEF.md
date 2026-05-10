# Design Brief — Humanoid Robot Directory

## What this is

The first **buyer-grade** directory for the humanoid robotics market. Adjacent products exist:

- **humanoid.guide** — sparse spec aggregator, no pricing, no deployments, no comparison
- **The Robot Report** — news outlet, not a directory
- **Morgan Stanley Humanoid 100** — paywalled investor PDF
- **Wikipedia "List of humanoid robots"** — outdated, partial
- **Tracxn / Crunchbase / PitchBook** — paywalled investor tools, company-focused not robot-focused

None of them combine: structured spec data + pricing + lead times + verified deployments + comparison + waitlist capture. That's the gap.

## Audience (in order of priority)

1. **Procurement officers** at logistics, automotive, electronics, retail companies shopping their first humanoid pilot. Budget $50K–$5M. They Google "humanoid robot price warehouse" and need a definitive shortlist.
2. **Robotics researchers** evaluating which platform to license/buy for a lab.
3. **Investors** triangulating the market (looking for the funding leaderboard, regional distribution, who's commercial vs prototype).
4. **Engaged enthusiasts** who want to understand who builds what. SEO-driven traffic.

## Business model (for design context)

**Lead capture today, manufacturer-paid placement / referral fees later.** The "Order →" button captures buyer intent into a waitlist. When ordering opens (post-redesign, post-manufacturer onboarding), each qualified lead is worth $200–$1,000 to a manufacturer because humanoid sales cycles are $50K–$500K.

The redesign should make lead-capture conversion the implicit success metric without making the site feel transactional. Trust first, conversion second — but always conversion.

## Brand voice

- **Authoritative, not academic.** We have opinions; we share them.
- **Honest about uncertainty.** "Contact for pricing" is a feature, not a hole. We never invent data.
- **Editorial.** The Pudding's tone, not Wired's.
- **Clinical when listing, warm when explaining.** Specs are tabular; signatures are sentences.

## What's working today (don't break)

- Comprehensive dataset: 174 robots, 173 with images, 32 with public pricing, 30 with verified deployments
- Schema is correct — see `data/SCHEMA.md`
- Filters, compare, detail modal, waitlist all functionally wired
- Map view with country aggregations and signatures
- Single static HTML file, no build step

## What needs redesign

### Hero
Currently one gradient line + 4 stat boxes. Should be a *statement* that lands the positioning in 2 seconds:
- "The 174 humanoid robots being built right now"
- "Where every humanoid is built. What they cost. Who's deploying them."
- A scrolling row of robot photos with prices? A live country bubble map? A typographic statement?

### Grid view
174 cards, all visually equal. Buyers care about: availability (shipping vs lab) > price > company credibility. The card should communicate this hierarchy at a glance.

Current card: photo, name, company, location, year, use-case tags, 4 specs (height/weight/payload/DoF).

What's missing in feel: which is shipping, which is famous, which is cheap, which is research-only. Today these are color-coded badges; could be more.

### Map view
Bubbles work. The side panel is dense:
- Country name + count
- Generated signature (1 sentence)
- 7-row stat table
- Use-case chips
- Top builders (4 rows)
- Featured platforms (6 rows with thumbnails)

Reorganize so the **insight** lands first, the data second. Maybe: signature in big type, then a single contrast chart, then platforms.

### Robot detail modal
Two-column: image + specs. Shows price, deployments, "Order →".

Could be: more cinematic image, more editorial layout for deployments (each deployment is a story, not a row), better integration of price + availability + waitlist CTA.

### Compare modal
Functional spec table. Could call out winners ("tallest", "cheapest") and add visual diff (highlighting where two robots differ most).

### Order / Waitlist modal
"Coming soon" pill + email field. Could feel more like *joining something* — queue position, scarcity hint, light social proof.

### Filters
Pills + dropdowns. Works. The use-case pills with counts are the strongest element. Consider whether budget bands should be a slider instead of buckets.

### Mobile
Currently responsive but designed-desktop-first. Rethink card density, filter chip wrapping, map view (probably needs to be collapsible into a country list on mobile).

## Sitemap

```
/                          (Grid view — default)
/  ?view=map               (Map view)
/  ?country=USA            (Pre-filtered grid)
/  ?usecase=warehouse_logistics
/  (modal: ?robot=Tesla|Optimus_(Gen_2_/_Gen_3))
/  (modal: ?compare=Apollo,Phoenix,Optimus)
/  (modal: ?order=Apollo)
```

Future (post-redesign, separate task):
```
/country/china
/country/usa
/use-case/warehouse-logistics
/use-case/manufacturing
/blog/                      (Today rail / weekly notes)
/about
```

For now: single page, modal-based deep links via query params. URL state should sync with filters (so a filtered view is shareable).

## Schema

See `data/SCHEMA.md` for field-by-field details. Key fields the design should surface:

- `availability_status` — primary visual signal (shipping_now, preorder, pilot_only, research_only, retired)
- `price_usd` + `price_note` — second-most-important card data
- `country` + `hq_city` — geography matters in this market
- `use_cases` (array) — chips/tags
- `verified_deployments` (array of objects) — case studies, with customer + year + details + source URL
- `key_customers_or_pilots` (array of strings) — fallback when verified_deployments empty
- `image_url` — primary visual

## Constraints (engineering)

- Single HTML file, vanilla JS, no build step
- Must stay editable via straightforward `Edit` tool calls
- Performance: < 3s LCP on cable, lazy-load images, no blocking external scripts
- Image URLs in data are unstable third-party CDNs — design must degrade gracefully
- D3.js + topojson-client are loaded via CDN (Map view only)
- Accessible to WCAG AA

## Out of scope for this round

- Actual order flow (still waitlist-only)
- Backend / database (localStorage + mailto for now)
- Authentication / user accounts
- Per-robot pages (they're modals; can become routes later)
- Internationalization
- Analytics integration

## Success criteria

- A buyer landing from Google understands within 5 seconds: what this is, why it's authoritative, how to start their search.
- A robotics enthusiast on Twitter shares a screenshot; the screenshot drives clicks.
- Waitlist conversion ≥ 8% of detail-modal opens.
- Show HN post hits front page on launch.

## Inspirations to study

| Site | What to take | What to leave |
|---|---|---|
| ev-database.org | IA, card density, filter clarity | Generic SaaS chrome |
| bloomberg.com/markets | Data density, ticker rails | Density-without-direction |
| linear.app | Micro-typography, restraint | Anything monastic that hides info |
| stripe.com/atlas | Premium feel, editorial pages | Marketing-page conventions |
| thepudding.cool | Opinionated data journalism | Long-scroll narratives |
| are.na | Curatorial confidence | Sparseness that hurts buyers |
| pitchfork.com (early) | Editorial verdict on objects | Subjective ratings |

The redesign should *feel* like ev-database.org wrote a tech blog at thepudding.cool, designed by Linear.
