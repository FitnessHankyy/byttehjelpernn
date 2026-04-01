# Byttehjelpern — Claude Context File
> Auto-generated. Update at end of each session by saying "Oppdater CLAUDE.md".
> Last updated: 2026-04-01 — Session 7

---

## What is this project?
Norwegian one-click comparison and switching service for electricity, mobile, broadband,
insurance, and bank loans/refinancing. Users register their contracts, see better deals,
and switch with one click — we handle the process via affiliate links or direct agreements.

**MVP goal:** 100 test users before hardcoding/scaling.
**Live URL:** https://grand-mooncake-0a9c5b.netlify.app

---

## Tech Stack
| Component       | Technology                              |
|-----------------|-----------------------------------------|
| Frontend        | Plain HTML + CSS + Vanilla JS           |
| Backend/DB      | Supabase (auth + database)              |
| Hosting         | Netlify (auto-deploy from GitHub)       |
| Serverless      | Netlify Functions                       |
| Version control | GitHub (repo: byttehjelpernn, public)   |

---

## File Structure
```
byttehjelpernn/
├── netlify/functions/
│   ├── fp-proxy.js              ← Finansportalen API proxy (token-cached)
│   └── forbrukerradet-auth.js   ← NOT in use — can be deleted
├── app.js                       ← All JS for minside (dashboard SPA)
├── minside.html                 ← Dashboard SPA
├── styles.css                   ← All CSS for minside
├── netlify.toml                 ← Node 18, esbuild, security headers
├── supabase_migration.sql       ← SQL to run in Supabase dashboard
├── CLAUDE.md                    ← This file (Claude context)
└── [other HTML pages: index, om-oss, personvern, vilkar, pro, sammenlign, admin]
```

---

## Netlify Environment Variables (secrets — never hardcode)
| Name                            | Purpose                  |
|---------------------------------|--------------------------|
| `FORBRUKERRADET_CLIENT_ID`      | Finansportalen API auth  |
| `FORBRUKERRADET_CLIENT_SECRET`  | Finansportalen API auth  |

---

## Supabase Tables
| Table              | Key columns                                              |
|--------------------|----------------------------------------------------------|
| `profiler`         | user_id, fornavn, etternavn, fodselsnummer, laan (JSON), abonnementer (JSONB), trekk_extra (JSONB) |
| `strom_avtaler`    | user_id, leverandor, maalere (JSON), samtykke            |
| `forsikring_avtaler` | user_id, selskap, pris, sist_sjekket                   |
| `bredband_avtaler` | user_id, leverandor, hastighet, pris                     |
| `mobil_avtaler`    | user_id, operator, pris                                  |

**⚠️ Pending SQL migration:** Run `supabase_migration.sql` in Supabase dashboard to add
`abonnementer` and `trekk_extra` columns to `profiler` table.

---

## Finansportalen API — confirmed data structures

### Mortgages (`/feed/mortgages/all`)
```js
p.product?.interestOnLoanData?.[0]?.nominalInterestRate  // interest rate
p.companyName                                             // bank name
p.product?.name                                          // product name
p.isMembershipRequired                                   // boolean — membership needed
```

### Bank deposits (`/feed/bank-deposits/all`)
```js
p.product?.intervalAccountData?.[0]?.nominalInterestRate  // interest rate
p.companyName                                              // bank name
p.product?.accountType                                     // 6 = BSU
```

---

## Design System
```css
--lime: #b6f060  --dark: #0d1f14  --text: #e8f5ee
--muted: #7aac8e  --card: #152a1e  --radius: 16px
```
Fonts: DM Serif Display + DM Sans

---

## Key Code Patterns
- `FP_CONFIG = { clientId: 'live-aktiv-finansportalen' }` — top of app.js
- `byttSeksjon(navn)` — section navigation, triggers API calls
- `renteCacheData` — global array caching bank-deposits for filter buttons
- `laanCacheData` — global array caching mortgages for filter buttons
- `filtrerLaan(type, btn)` — mortgage filter: 'alle' / 'standard' / 'gronn' / 'ramme'
- `filtrerRente(type, btn)` — savings filter: 'alle' / 'hoyrentekonto' / 'fastrente' / 'bsu'
- `hentAlleBetaling()` — unified list of ALL payable items (strøm + forsikring + bredband + lån + abonnementer)
- `window._trekkExtraCache` — in-memory cache for trekk_extra loaded from Supabase
- `window._stromNavn / _forsikringNavn / _bredbandNavn` — set on data load for calendar display

---

## Trekkdato System
Payment calendar in Økonomi section + mini widget on dashboard.
- **Abonnementer**: trekkdag stored on each object in `profiler.abonnementer`
- **Faste utgifter + lån**: trekkdag stored in `profiler.trekk_extra` (JSONB)
- `velgTrekkDag(dag)` — opens inline editor grouped by: Faste utgifter / Lån / Abonnementer
- `settTrekkDag(id, dag)` — async, routes save to correct Supabase field
- Dashboard widget shows upcoming payments with "I dag / I morgen / Om X dager" badges

---

## Completed Work (all sessions)

### Sessions 1–2
- Project setup: HTML/CSS/JS + Supabase + Netlify
- Auth (login/register) with Supabase
- Dashboard sections: Strøm, Mobil, Forsikring, Bredbånd, Økonomi, Abonnementer, Sparerådgiver, Prishistorikk
- Finansportalen proxy (fp-proxy.js) with token cache
- Live mortgage rates in Økonomi section
- API credentials moved to Netlify env vars
- Onboarding wizard (4 steps)
- Subscription catalog with filter buttons
- Monthly cost overview with graphs (Chart.js)
- Savings tips and bundle tips
- Excel budget download
- Payment date calendar for subscriptions
- 50/30/20 savings rule with personal analysis

### Sessions 3–4
- Fixed bank-deposits 500 error
- Live high-yield savings in Sparerådgiver
- Filter buttons for savings: Alle / Høyrentekonto / Fastrente / BSU
- `renteCacheData` global cache

### Session 5
- Filter buttons for mortgages: Alle / Standard / Grønt lån / Rammelån
- `laanCacheData` global cache
- Various syntax fixes

### Session 6
- Standard mortgage filter excludes `isMembershipRequired` loans
- Membership keyword blocklist for standard filter
- LAAN_FALLBACK updated (only "Åpen for alle" loans)
- `dash-main` layout: `margin: 0 auto` — centered on wide screens

### Session 7
- Trekkdato calendar: days now clickable with inline editor
- `hentAlleBetaling()` — unified payment items across all categories
- Trekkdato supports: strøm, forsikring, bredbånd, lån, abonnementer
- Dashboard mini-widget: upcoming payments with urgency badges
- `abonnementer` and `trekk_extra` migrated from localStorage → Supabase (profiler table)
- `saveAbonnement()` and `setTrekkExtra()` now save to Supabase with localStorage fallback
- KATALOG prices updated: Netflix (99/129/189 kr), Max/HBO (new Basic 89kr, Premium 189kr)

---

## Current Status per Component
| Component                      | Status | Notes                                              |
|--------------------------------|--------|----------------------------------------------------|
| Mortgage rates — Økonomi       | ✅ Live | Standard filter excludes membership loans          |
| High-yield savings — Sparerådgiver | ✅ Live | Filter working                                 |
| Electricity price              | ✅     |                                                    |
| Supabase Auth                  | ✅     |                                                    |
| Abonnementer → Supabase        | ⚠️     | Code ready, needs SQL migration in Supabase        |
| trekk_extra → Supabase         | ⚠️     | Code ready, needs SQL migration in Supabase        |
| RLS on profiler table          | ❌     | Not confirmed — do before real users               |
| Chart.js graphs                | ⚠️     | CSP eval-blocking                                  |

---

## Remaining Tasks — prioritized

### 🔴 Critical (before real users)
1. **Run SQL migration** — open Supabase dashboard → SQL Editor → run `supabase_migration.sql`
   Adds `abonnementer` and `trekk_extra` JSONB columns to `profiler`
2. **RLS in Supabase** — confirm Row Level Security on `profiler` table
   (fødselsnummer + sensitive financial data)

### 🟡 Important
3. **CSP eval fix** — Chart.js blocked. Fix in `netlify.toml`:
   ```toml
   Content-Security-Policy = "script-src 'self' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com"
   ```
4. **Harmonize layout** — Sparerådgiver and Økonomi should share same card layout
5. **Delete** `forbrukerradet-auth.js` (unused)

### 🟢 Later / MVP v2
6. Public comparison page (no login required)
7. Automatic switching of electricity/mobile (core product)
8. Notifications when a better deal is found
9. Add favicon.ico
10. 60 form fields missing labels (accessibility)
11. Global CSS for om-oss, personvern, vilkår pages
12. Subscription price updates: verify Viaplay, TV2 Play, SATS, Evo, VG+, DN prices annually

---

## Business Model
- **Short term:** Affiliate/CPA per completed switch
- **Long term:** Subscription for premium features (auto-switch, alerts)

## Product Vision — Phases
- **Phase 1 (now):** 100 test users, manual monitoring
- **Phase 2:** Auto-switching with pre-approval, email/SMS alerts, partner integrations
- **Phase 3:** Mobile app, open comparison page, insurance automation, B2B

---

## How to resume in a new session
Paste this file at the start of the conversation, then describe what you want to do:
> "Vi fortsetter med Byttehjelpern. Se CLAUDE.md for kontekst. I dag skal vi [BESKRIV]."

For debugging:
> "Feil i app.js. Konsollen viser: [ERROR]. Koden rundt: [5-10 LINJER]. Hva er galt?"

For new feature:
> "Vil legge til [FEATURE]. Er dette riktig MVP-prioritet?"
