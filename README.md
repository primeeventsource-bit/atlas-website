# atlas-dominion.com

Marketing site for **Atlas Dominion Holdings LLC** — advisory, merchant services
(ISO), and business capital (MCA).

Hand-written static HTML and CSS. **No build step, no dependencies, no
framework.** Edit a file, commit, deploy.

The inquiry form and visitor analytics are served by the backend at
`admin.atlas-dominion.com` (repo: `primeeventsource-bit/atlas-dominion-backend`).

---

## Structure

```
index.html               Home
services.html            Services overview (hub)
merchant-services.html   ISO / statement audit
business-capital.html    MCA / working capital
advisory.html            Strategy, brand, growth
about.html               The firm
contact.html             Inquiry form
privacy.html             Privacy & cookie notice
404.html                 Not found

assets/css/atlas.css     The entire design system
assets/js/site.js        Mobile nav, footer year
assets/js/contact.js     Contact form → backend

robots.txt
sitemap.xml
```

Header and footer markup is duplicated per page. That is the deliberate cost of
having no build step on an eight-page site: if you change the nav, change it in
all nine files (`404.html` included). Grep for `masthead__inner`.

---

## Running it locally

Any static server works. Use **port 5500**, because that is the origin the
backend's local CORS config allows:

```bash
npx serve -l 5500
# or: python -m http.server 5500
# or: VS Code "Live Server" (defaults to 5500)
```

Then open <http://localhost:5500>.

### Testing the form against a local backend

`contact.html` carries two endpoints:

| Attribute | Used when |
| --------- | --------- |
| `data-endpoint` | Normally — points at `admin.atlas-dominion.com` |
| `data-endpoint-local` | Automatically, when the page is served from `localhost`/`127.0.0.1` |

So with the backend running (`php artisan serve` in the backend repo) the form
posts to `http://localhost:8000` with no edits required. Nothing to remember to
revert before committing.

The tracker script always loads from production. To point it at a local backend
while developing, add `data-atlas-endpoint`:

```html
<script defer
        src="http://localhost:8000/tracker.js"
        data-atlas-endpoint="http://localhost:8000"></script>
```

---

## How the form talks to the backend

`POST` JSON to `/api/public/leads`. The backend replies in one of three shapes:

| Status | Body | What the page does |
| ------ | ---- | ------------------ |
| `201` | `{ok: true, ref: "ATLAS-XXXXXX", message: "…"}` | Resets the form, shows the message and reference |
| `422` | `{ok: false, errors: {field: ["…"]}}` | Renders errors inline against each field |
| `429` | `{ok: false, message: "…"}` | Shows the rate-limit message |

`contact.js` also attaches, automatically:

- `intent` — from the dropdown, preselected by `?intent=` in the URL
- `utm_source` / `utm_medium` / `utm_campaign` / `utm_content` / `utm_term`
- `source_page` and `referrer`
- `visitor_cookie` — the `atlas_vid` cookie set by `tracker.js`, which links the
  inquiry to the visitor's browsing history in the admin
- `form_elapsed_seconds` and a hidden `website` honeypot — both spam signals

Intake is rate-limited to 6 submissions per minute per IP.

### Campaign URLs

`?intent=` sets the dropdown and, for the first two, reveals the optional
pre-qualifier fields (monthly volume, months in business, industry):

| URL | Routes to | Pre-qualifiers |
| --- | --------- | -------------- |
| `/contact.html?intent=statement-audit` | Merchant Services | Yes |
| `/contact.html?intent=capital-preapproval` | Business Capital | Yes |
| `/contact.html?intent=advisory-strategy` | Advisory | No |
| `/contact.html?intent=advisory-brand` | Advisory | No |
| `/contact.html?intent=advisory-growth` | Advisory | No |
| `/contact.html` | General | No |

An unrecognized intent is recorded as `general` rather than rejected — a
mistyped campaign URL costs a tidy label, never the lead.

UTM tags pass straight through, so
`/contact.html?intent=statement-audit&utm_source=google&utm_medium=cpc&utm_campaign=merchant-services-q1`
arrives fully attributed.

---

## Analytics

`tracker.js` is loaded on every page from the backend. It sets one first-party
cookie (`atlas_vid`, random UUID, two years, `SameSite=Lax`) and records page
views, scroll depth, outbound clicks, and form starts/submissions. There are no
third-party advertising trackers.

Tag any call-to-action to get a named `cta_click` event:

```html
<a href="/contact.html" data-atlas-cta="hero-primary">Start a conversation</a>
```

`privacy.html` describes all of this accurately — **if you change what is
tracked, update that page too.**

---

## Before launch — things only Christian can supply

I deliberately did not invent any of the following. Every one is marked in the
source with a `TODO(Christian)` comment.

| Where | What's needed |
| ----- | ------------- |
| **Everywhere** | **Name mismatch:** the logo reads `DOMINION HOLDING LLC` (singular), the site text and your incorporation documents read `Atlas Dominion Holdings LLC` (plural). One of them is wrong. The site currently follows the legal documents. Worth settling before print. |
| `contact.html` | A business email on the atlas-dominion.com domain, a phone number, and a city/state if you want one shown. Your personal Gmail is **not** published anywhere on the site. |
| `about.html` | Your actual bio — years in payments/advisory, prior roles, notable work, any licenses or certifications. The current text describes the firm's approach and says nothing about your background. A headshot (~800×1000) in `assets/img/` would sit well beside it. |
| `business-capital.html` | Real funder criteria if you want concrete minimums shown ("6+ months in business, $15k+/mo deposits"). I wrote around this with general language rather than inventing thresholds. |
| `advisory.html` | Engagement fee ranges, if you want them published. |
| `privacy.html` | A dedicated privacy contact address and your registered business address. |
| Every page footer | The regulatory disclosure — accurate as written, but **have counsel review it**. |

**Not on the site anywhere, on purpose:** testimonials, client names or logos,
funded-volume or savings statistics, years-in-business claims, approval rates,
or specific pricing. Fabricating any of those on a financial-services site is a
real liability, not a copy problem. Send me the genuine versions and I will add
them.

## Logo assets

All derived from the supplied lockup. The source is a white-background raster;
the white has been knocked out to alpha, which is safe here because every
placement sits on a near-white ground (`--paper` / `--bone`).

| File | Size | Used for |
| ---- | ---- | -------- |
| `assets/img/logo-mark.png` | 134×114 | Header. Rendered at 38px tall, so 3× for retina |
| `assets/img/logo-full.png` | 737×600 | Full lockup — decks, email signatures, off-site |
| `assets/img/favicon-32.png` | 32×32 | Browser tab |
| `assets/img/apple-touch-icon.png` | 180×180 | iOS home screen |
| `assets/img/icon-512.png` | 512×512 | Spare, for a PWA manifest if ever needed |
| `assets/img/og-image.png` | 1200×630 | Social share card |

The three square tiles put the mark on a **bone** field rather than transparent
or navy, because the mark's "A" is navy and would disappear against a dark tab
or dark home screen.

**The footer stays type-only, deliberately.** The footer is navy and the "A" is
navy; a raster logo cannot recolor itself the way the old inline SVG could. If
you want the mark down there, send a reversed (light) version of the logo and
it drops straight in.

### Regenerating

`logo-mark.png` is a raster. If you get a **vector** original (`.svg`, `.ai`,
`.eps`), that is strictly better — swap `assets/img/logo-mark.png` for
`logo-mark.svg`, update the `src` and drop the `width`/`height` attributes in
the nine HTML files (grep `wordmark__mark`).

---

## Deploying

Hosted on **Netlify**. `netlify.toml` in the repo root carries the whole
configuration — publish directory, cache headers and security headers — so
connecting the repo needs no settings in the Netlify UI.

1. Netlify → **Add new site → Import an existing project** → GitHub →
   `primeeventsource-bit/atlas-website`.
2. Leave the build command **empty** and publish directory `/`. Netlify reads
   `netlify.toml` and will fill these in itself.
3. Deploy. You get a `*.netlify.app` URL immediately.
4. **Domain management → Add custom domain →** `atlas-dominion.com`. Netlify
   then shows the exact apex `A` record and `www` CNAME to create at GoDaddy.

DNS stays at GoDaddy (`ns29/ns30.domaincontrol.com`) — Netlify supports an apex
`A` record, so no nameserver migration is needed. Use whatever values Netlify
displays rather than any IP written down here; they change.

The `admin.atlas-dominion.com` A record for the backend is already live and
must be left alone.

### Caching caveat

Asset filenames are not content-hashed, because there is no bundler. The cache
headers in `netlify.toml` are deliberately short for that reason — an hour on
CSS/JS, a week on images. If you ever add a build step with hashed filenames,
raise them.

### Content Security Policy

`netlify.toml` contains a CSP that is commented out. It is believed correct,
but a wrong CSP breaks the contact form *silently*, so switch it on only after
submitting a real test inquiry with the browser console open.

### Launch checklist

- [ ] Backend live at `admin.atlas-dominion.com` with `MARKETING_ORIGIN` set to `https://atlas-dominion.com`
- [ ] Submit the real form and confirm the lead appears at `/admin/leads`
- [ ] Confirm the notification email arrives
- [ ] Visit two pages before submitting, then check the lead's **Visitor journey** panel is populated
- [ ] Placeholders above filled in
- [ ] Disclosure and privacy notice reviewed by counsel
- [ ] Favicon and `og:image` added
- [ ] `sitemap.xml` submitted to Google Search Console

---

## Design system

Everything lives in `assets/css/atlas.css`. Tokens mirror the admin app so the
two read as one brand.

```
--navy #0c1a3a   --navy-deep #070f24   --navy-soft #15244a
--gold #c9a24a   --gold-light #e2c987  --gold-deep #9a7a2e
--bone #f6f1e7   --paper #fbf8f1
--ink  #101728   --muted #5b6478
```

Cormorant Garamond for display, Manrope for body, JetBrains Mono for the
small-caps eyebrows.

Useful classes: `.shell` / `.shell--narrow` (width), `.section` +
`--bone` / `--navy` / `--tight` (bands), `.eyebrow`, `.lede`, `.grid--2` /
`--3`, `.card` (+ `.card--link` with a `.stretch` anchor for whole-card
clicks), `.steps`, `.checks`, `.callout`, `.split` (sticky heading beside
flowing content), `.btn--gold` / `--navy` / `--ghost`, `.arrow-link`.

Reduced-motion and print styles are handled. Focus rings are gold and visible —
please don't remove them.
