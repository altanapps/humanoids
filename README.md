# Humanoid Robot Directory

A directory of humanoid robot platforms — companies, locations, specs, and images.

## Scope

**Included:** bipedal, two-armed humanoid platforms with public images and demos. Both commercial efforts and notable research/lab platforms.

**Excluded:** quadrupeds, wheeled-base manipulators (unless explicitly humanoid form), single-arm cobots, exoskeletons, animatronic puppets without real autonomy.

Edge cases (telepresence robots, retired platforms, musculoskeletal research humanoids) are included with status flags.

## Files

- `index.html` — the directory site. Open directly in a browser. No build step.
- `data/robots.json` — canonical dataset.
- `data/robots.js` — same data as a JS module so `index.html` can be opened from `file://`.

## Schema

```json
{
  "company": "string",
  "robot_name": "string",
  "country": "string",
  "hq_city": "string",
  "year_founded": "number | null",
  "year_revealed": "number | null",
  "height_cm": "number | null",
  "weight_kg": "number | null",
  "payload_kg": "number | null",
  "dof": "number | null",
  "battery_hours": "number | null",
  "walking_speed_ms": "number | null",
  "status": "concept | prototype | pilot | commercial | retired",
  "funding_usd_m": "number | null",
  "key_customers_or_pilots": ["string"],
  "website": "url",
  "image_url": "url",
  "image_source": "string (license / source note)",
  "short_description": "string"
}
```

## Image licensing — important before going live

Image URLs are sourced from:
1. **Wikimedia Commons** — licensed (usually CC-BY-SA), attribution required.
2. **Company press kits** — usually OK for editorial use; check each company's media policy before commercial use.
3. **Press photos** (Reuters, IEEE Spectrum, etc.) — NOT redistributable; use only as a placeholder until you secure replacements.

Before publishing this directory publicly, audit `image_source` for every entry and either:
- Confirm Wikimedia/Commons license and add attribution, OR
- Email each company's press contact for permission, OR
- Replace with your own renderings / sketches.

## Update cadence

Plan: monthly refresh. New entries added as they're announced. Track changes via git.

## Methodology

Initial research: 2026-05 across three regional sweeps (US/NA, China, Europe/JP/KR/Other) using public sources (company sites, IEEE Spectrum, The Robot Report, Morgan Stanley Humanoid 100 tracker, Wikipedia).
