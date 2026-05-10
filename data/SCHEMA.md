# Data Schema — robots.json

The dataset is a JSON array. Each entry has the following fields. **All fields may be `null` or `[]`** — the design must handle missing data gracefully.

| Field | Type | Description | Coverage |
|---|---|---|---|
| `company` | string | Manufacturer / lab name | 174/174 |
| `robot_name` | string | Platform name (e.g., "Optimus (Gen 2 / Gen 3)") | 174/174 |
| `country` | string | "USA", "China", "Japan", etc. — 17 distinct values | 174/174 |
| `hq_city` | string | "Palo Alto, CA", etc. | ~95% |
| `year_founded` | number | Company founded year | ~80% |
| `year_revealed` | number | Year robot was first publicly shown | ~95% |
| `height_cm` | number | Robot height in cm | ~75% |
| `weight_kg` | number | Robot weight in kg | ~65% |
| `payload_kg` | number | Carry capacity in kg | ~40% |
| `dof` | number | Degrees of freedom | ~60% |
| `battery_hours` | number | Battery life in hours | ~25% |
| `walking_speed_ms` | number | Top walking speed in m/s | ~35% |
| `status` | enum | Legacy status field — derived from `availability_status` | 174/174 |
| `funding_usd_m` | number | Total funding raised in $M | ~15% |
| `key_customers_or_pilots` | string[] | List of customer/pilot names from press | ~50% |
| `website` | url | Manufacturer's website | ~98% |
| `image_url` | url | Direct URL to a press photo | 173/174 (one missing) |
| `image_source` | string | Where the image was sourced (for licensing audit) | 173/174 |
| `short_description` | string | One-sentence pitch | 174/174 |
| **`price_usd`** | number | Best-known unit price in USD | 32/174 |
| **`price_note`** | string | Caveat ("Starting from $X for base config", "Contact for pricing") | matches price |
| **`availability_status`** | enum | `shipping_now` \| `preorder` \| `pilot_only` \| `research_only` \| `retired` | 174/174 |
| **`lead_time_weeks`** | number | Order-to-ship time in weeks | ~10% |
| **`support_regions`** | string[] | Where the company sells + supports (e.g., ["USA", "EU", "China"]) | 100% (defaults to country) |
| **`use_cases`** | string[] | Multi-tag from canonical list (see below) | 118/174 |
| **`verified_deployments`** | object[] | Named customer case studies with `{ customer, year, details, source }` | 30/174 |

Fields in **bold** were added for the buyer-features build.

## Canonical use_cases

```
warehouse_logistics      (10 robots)
industrial_manufacturing (30)
home_consumer            (12)
research_education       (63)
customer_service         (13)
security_inspection      (6)
healthcare_eldercare     (9)
defense_eod              (7)
entertainment_events     (11)
agriculture_outdoor      (2)
```

A robot can have multiple use_cases. Counts above are robots tagged with that use case.

## Canonical availability_status (in priority order)

| Status | UI label | Meaning | Count |
|---|---|---|---|
| `shipping_now` | "Shipping now" | Available for purchase, in stock or short lead | 56 |
| `preorder` | "Pre-order" | Accepting orders, ships at a future date | 3 |
| `pilot_only` | "In customer trials" | Deployed at named customers but not generally for sale | 22 |
| `research_only` | "Lab / research" | Lab/research platform, not commercially sold | 83 |
| `retired` | "Retired" | No longer made | 10 |

## Country distribution

| Country | Count |
|---|---|
| China | 82 |
| USA | 28 |
| Japan | 12 |
| South Korea | 10 |
| France | 9 |
| Germany | 9 |
| Italy | 8 |
| Spain | 4 |
| United Kingdom | 3 |
| India, Israel, Canada, Saudi Arabia, Sweden, Poland, Turkey, Taiwan | 1–2 each |

## Verified deployment object shape

```json
{
  "customer": "BMW Spartanburg plant",
  "year": 2024,
  "details": "2-week pilot, 6-second cycle time on chassis sheet metal",
  "source": "https://..."
}
```

`details` is short narrative text; `source` is a URL to the announcement / case study. Use this in the design to surface social proof.

## Image URL caveats

- **Hosts vary.** Wikimedia Commons (most stable), company CDNs (Webflow, Squarespace, Contentful), news CDNs (The Robot Report, New Atlas, IEEE Spectrum), aggregators (humanoid.guide). Some news-CDN URLs may break over time.
- **No size guarantees.** Some images are 200px; others are 4000px. The card layout should handle both.
- **Image_source field** has the licensing context — design doesn't need to surface it, but it's there for audit.

## Status sort order (used in current implementation)

```
1. shipping_now
2. preorder
3. pilot_only
4. research_only
5. retired (concept maps here too)
```

Default sort is "Most available first" — which uses this order, then company A→Z within each tier.
