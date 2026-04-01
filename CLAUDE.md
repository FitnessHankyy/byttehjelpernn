# Byttehjelpern — Claude Context File
> Auto-generated. Update at end of each session by saying "Oppdater CLAUDE.md".
> Last updated: 2026-04-01 — Session 6

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
- `byttSeksjon(navn)` — section navigation, triggers API calls for økonomi/sparerådgiver
- `renteCacheData` — global array caching bank-deposits for filter buttons (no repeat API calls)
- `laanCacheData` — global array caching mortgages for filter buttons
- `filtrerLaan(type, btn)` — mortgage filter: 'alle' / 'standard' / 'gronn' / 'ramme'
- `filtrerRente(type, btn)` — savings filter: 'alle' / 'hoyrentekonto' / 'fastrente' / 'bsu'
- Subscription data currently in localStorage — TODO: migrate to Supabase

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
- Fixed bank-deposits 500 error — rate was in `intervalAccountData[0].nominalInterestRate`
- Live high-yield savings accounts in Sparerådgiver section
- Filter buttons for savings: Alle / Høyrentekonto / Fastrente / BSU
- `renteCacheData` global cache for filters
- BSU/youth/children filter on savings accounts

### Session 5
- Filter buttons for mortgages: Alle / Standard / Grønt lån / Rammelån
- `laanCacheData` global cache for mortgage filters
- Various syntax errors fixed (double `}`, duplicate code)
- `.slice(0, 20)` — increased mortgage fetch from 4 to 20 products

### Session 6
- Standard mortgage filter now excludes `isMembershipRequired` loans (LOFavør etc.)
- Added membership keyword blocklist to standard filter: lofavør, favør, fagforbund, nito, akademiker, forsvars, politi, spesial
- LAAN_FALLBACK updated — removed Landkreditt (membership) and Sparebanken Vest ung 34 (age req), replaced with Sparebanken Sør + Nordea
- `dash-main` layout fixed: added `margin: 0 auto; width: 100%` — content now centered on wide screens

---

## Current Status per Component
| Component                     | Status | Notes                                    |
|-------------------------------|--------|------------------------------------------|
| Mortgage rates — Økonomi      | ✅ Live | Standard filter excludes membership loans |
| High-yield savings — Sparerådgiver | ✅ Live | Filter working                      |
| Electricity price             | ✅     |                                          |
| Supabase Auth                 | ✅     |                                          |
| RLS on profiler table         | ❌     | Not confirmed — do before real users     |
| Chart.js graphs               | ⚠️     | CSP eval-blocking                        |
| Subscription data             | ⚠️     | In localStorage — should move to Supabase |

---

## Remaining Tasks — prioritized

### 🔴 Critical (before real users)
1. **RLS in Supabase** — confirm Row Level Security on `profiler` table
   (handles fødselsnummer + sensitive financial data)

### 🟡 Important
2. **CSP eval fix** — Chart.js blocked. Fix in `netlify.toml`:
   ```toml
   Content-Security-Policy = "script-src 'self' 'unsafe-eval' https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://fonts.googleapis.com"
   ```
3. **Migrate subscriptions** from localStorage to Supabase
4. **Harmonize layout** — Sparerådgiver and Økonomi should share same card layout
5. **Delete** `forbrukerradet-auth.js` (unused)

### 🟢 Later / MVP v2
6. Public comparison page (no login required)
7. Automatic switching of electricity/mobile (core product)
8. Notifications when a better deal is found
9. Add favicon.ico
10. 60 form fields missing labels (accessibility)
11. Global CSS for om-oss, personvern, vilkår pages

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
