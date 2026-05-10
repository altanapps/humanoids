# Prompt for Claude Design — Humanoid Robot Directory

You're redesigning the website that's about to become the canonical reference for the humanoid robotics market — the **EV-Database**, the **Capterra**, the **Bloomberg Terminal** of a category Morgan Stanley puts at $5 trillion by 2050. Today, no such reference exists. There's `humanoid.guide` (a sparse spec aggregator), there's TheRobotReport (news), there's a paywalled Morgan Stanley list. That's it. The space is wide open.

We've built the data. **174 humanoid platforms across 17 countries**, with verified pricing on 32, deployment case studies on 30, side-by-side comparison, country-level approach signatures, and a "Coming Soon" waitlist that captures buyer intent today. The technical site works. The schema is right. The interactions are wired.

What it lacks is **gravity** — the visual confidence that says *"you've reached the authoritative source."*

Your job: redesign it to feel like the thing newsrooms cite, procurement teams bookmark, and VCs send to their LPs.

## The vibe in three words

**Authoritative. Quiet. Inevitable.**

If Linear and Bloomberg Terminal co-designed a buyer directory and asked The Pudding to art-direct it, that's the target. Editorial confidence over startup polish. Data density over whitespace-as-vibe. Monochrome with one sharp accent over rainbow gradients. Robots are the subject, not the decoration.

**NOT:** dark/neon "AI startup" futurism. NOT: marketing-y. NOT: sci-fi clip-art. NOT: another generic SaaS landing page with a hero gradient and three feature cards.

## What I want you to obsess over

1. **The hero.** Right now it's one line of gradient text and four stat boxes. It should be a *statement*. Something that makes a robotics buyer arriving from Google immediately feel: *"Oh — this is THE site."* Maybe a live counter. Maybe a row of 30 robots scrolling. Maybe a visualization of "every humanoid by country and price." Make it the screenshot people share.

2. **Visual hierarchy across cards.** Tesla Optimus and unknown Chinese prototype #137 currently look identical. Buyers care about availability, price, and credibility — the design should reflect that without making it a leaderboard. Featured rail? Editor's picks? Status-tier visual weight? Surprise me.

3. **The Map view's emotional payload.** It tells a story (China is a bubble that dwarfs everyone; Japan is research-heavy; the US is enterprise-tier) but right now the side panel is a list of stats. Find a way to make the *insight* land instantly — maybe a sentence in the map itself, maybe a single contrast chart per country, maybe a one-line "approach DNA" that reads like editorial copy.

4. **The Order → Coming Soon flow.** Today: pill, headline, email field, button. Functional. Could it be more emotionally resonant? "You're #847 in the queue for Atlas." A countdown. A promise. Something that makes the waitlist feel like joining something.

5. **Mobile.** Don't just shrink the desktop — rethink the IA for thumb-scrolling. The Map view especially.

## References to study (in order)

1. **ev-database.org** — read the IA. This is the gold standard for buyer directories. Note how status, price, availability, and specs all live in the card without crowding.
2. **bloomberg.com/markets** — data density without panic. Tabular elegance.
3. **linear.app** — micro-typography, elastic spacing, the discipline of restraint.
4. **stripe.com/atlas** and **stripe.press** — premium reference content. The site as artifact.
5. **thepudding.cool** — editorial data journalism with opinions. We have opinions to express (China is cheap; Japan is research; the US is funded). Help us express them.
6. **are.na** — curatorial confidence. Less, but trusted.

## Hard constraints

- Stays a **single static HTML file**. `index.html` + `data/robots.js` + `data/world-110m.json`. No build step. No framework. Vanilla JS only. We need to keep editing the markup directly.
- All interactions in the current `index.html` must continue to work: search, country/availability/use-case/budget filters, sort, click-to-detail, compare-up-to-4, Order → waitlist modal, Map view with side panel.
- Performance: <3s LCP on cable connection. Lazy-load all images.
- Accessible: keyboard navigation, focus rings, ARIA on modals, contrast ≥ AA.
- Image-source URLs in the dataset are unstable third-party CDNs — design must degrade gracefully when an image 404s.
- Single accent color. No animations that can't justify themselves. No gratuitous gradients.

## Pages / views to design

| View | Purpose | Today's state |
|---|---|---|
| Hero | First impression, market positioning | One line + 4 stat boxes |
| Grid view | Browse 174 robots | Generic cards, no hierarchy |
| Map view | Show regional patterns | Bubble map + dense side panel |
| Robot detail (modal) | Deep dive on one robot | Two-column hero + spec list + deployments |
| Compare view (modal) | 2–4 robots side by side | Functional spec table |
| Order modal | Email waitlist capture | "Coming soon" pill + email field |
| Filters/controls | Multi-axis filtering | Pills + dropdowns, works but generic |

## Stretch ideas worth exploring

- A "Today" rail showing recent funding rounds, deployments, launches (the site as a *living* thing)
- Compare-mode "winner" annotations: "tallest," "lightest," "cheapest" badges next to each spec
- Approach-DNA radar chart per country (China vs USA vs Japan on actuator type, control philosophy, target buyer)
- Per-robot mini scatterplot: price vs payload vs height with this robot highlighted in context
- Editorial section: "What changed this week" (one-paragraph weekly note)
- The hero could be a real-time map of where humanoids were *deployed* this month

## Success criteria

- A buyer landing from Google immediately understands what this is and that it's authoritative
- The site can plausibly be the headline of a Show HN post
- Waitlist conversion ≥ 8% of detail-modal opens
- VCs include the URL in their pitch decks (yes, this is the bar)

## Files

- `BRIEF.md` — the longer brief (read this for full context)
- `index.html` — current implementation (look here for what works)
- `data/robots.json` — full dataset, 174 entries with the schema you'll be designing around
- `data/world-110m.json` — TopoJSON for the Map view
- `data/SCHEMA.md` — field-by-field guide to what's in robots.json

Make it the thing that exists in this category in five years.
