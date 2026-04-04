# FindMeThis — Web App Plan

Upload a photo of a dress (or any fashion/beauty item), and the app finds it across India's top shopping platforms with live prices and links.

**Deployment:** AWS Amplify (frontend) + AWS Lambda (backend API)

---

## Core Capabilities

1. **Image Upload** — drag-and-drop or file picker in browser
2. **AI Product Identification** — what is this item? what category?
3. **Attribute Extraction** — color, pattern, style, type
4. **Cross-Platform Search** — query 5–6 Indian e-commerce platforms
5. **Unified Results** — sorted by price, with platform, image, and buy link
6. **IP-based Rate Limiting** — 10 free searches/day per IP without login
7. **User Auth + Profiles** — login/logout, bookmarks, favourites, search history

---

## Target Platforms (Top 6 Indian E-Commerce)

| Platform | Category Strength | Integration Method |
|---|---|---|
| **Myntra** | Fashion & Apparel | Web scraping / visual search endpoint |
| **Amazon India** | All categories | Product Advertising API (PA-API 5.0) |
| **Flipkart** | All categories | Affiliate API |
| **Ajio** | Fashion & Apparel | Web scraping |
| **Nykaa** | Beauty & Cosmetics | Web scraping |
| **Meesho** | Fashion, Ethnic wear | Web scraping |

---

## AI Intelligence Layer

### Step 1 — Category Detection
Use a vision model to classify the uploaded image into one of:
- `fashion` → dresses, tops, kurtas, sarees, lehengas, jeans, etc.
- `beauty` → lipstick, mascara, foundation, kajal, nail polish, etc.
- `footwear` → heels, sandals, sneakers, etc.
- `accessories` → bags, jewellery, sunglasses, etc.
- `unknown` → prompt user to clarify

**Recommended:** GPT-4o Vision for Phase 1 (most accurate for fashion nuance, single API call does both classification and query extraction). Migrate to fine-tuned CLIP for cost savings at scale.

### Step 2 — Attribute Extraction
From the image, extract a structured search query:
> "red floral midi dress with puff sleeves"
> "matte red lipstick"
> "black embroidered anarkali kurta"

This becomes the text search query sent to each platform.

### Step 3 — Visual Search (Phase 2)
Some platforms support reverse image search natively:
- Myntra has a visual search feature (internal endpoint)
- Amazon has "Search by image" (internal endpoint)
- These can be triggered via their internal API endpoints

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Web Browser                        │
│          (React + Vite SPA)                     │
│                                                 │
│  [Drag-drop / File Upload] → [Loading State]   │
│  [Results Grid] ← [Filter/Sort Controls]       │
│  [Profile Page] [Bookmarks] [Favourites]       │
│                                                 │
│  Auth: Amplify Auth (Cognito)                  │
│  Hosted on: AWS Amplify                         │
│  URL: https://<branch>.amplifyapp.com           │
└──────────────────────┬──────────────────────────┘
                       │ HTTPS (REST)
                       │ Authorization: Bearer <JWT>  (if logged in)
                       ▼
┌─────────────────────────────────────────────────┐
│           AWS API Gateway (HTTP API)            │
│                                                 │
│   POST /identify                                │
│   POST /search       ← rate-limit middleware    │
│   GET  /profile                                 │
│   POST /bookmarks    DELETE /bookmarks/:id      │
│   POST /favourites   DELETE /favourites/:id     │
│   GET  /history                                 │
└──────────────────────┬──────────────────────────┘
                       │ Lambda invoke
                       ▼
┌─────────────────────────────────────────────────┐
│              AWS Lambda Functions               │
│          (Python 3.12, async)                   │
│                                                 │
│  identify-fn   →  GPT-4o Vision call            │
│  search-fn     →  Rate limit check              │
│                   → Aggregator (parallel)        │
│  profile-fn    →  Read/write user data          │
│  bookmarks-fn  →  CRUD bookmarks                │
│  favourites-fn →  CRUD favourites               │
│  history-fn    →  Read search history           │
└──────┬──────────────────────────────────────────┘
       │
       ├──► AWS Cognito (JWT validation, user pool)
       │
       ├──► OpenAI API (GPT-4o Vision)
       │
       ├──► Search Aggregator (parallel asyncio)
       │       ├── Amazon PA-API
       │       ├── Flipkart Affiliate API
       │       ├── Myntra Scraper
       │       ├── Ajio Scraper
       │       ├── Nykaa Scraper
       │       └── Meesho Scraper
       │
       └──► AWS DynamoDB
               ├── RateLimits    (IP counters, TTL = midnight)
               ├── Users         (profile data)
               ├── Bookmarks     (saved products)
               ├── Favourites    (saved searches)
               ├── SearchHistory (TTL = 90 days)
               └── SearchCache   (query → results, TTL = 30 min)
```

---

## Tech Stack

### Frontend (AWS Amplify Hosted)
- **Framework:** React 18 + Vite
- **Styling:** Tailwind CSS
- **State:** React Query (TanStack Query) — handles loading/error states for API calls
- **Image upload:** react-dropzone
- **HTTP:** Axios
- **Deployment:** AWS Amplify Hosting (CI/CD from GitHub branch)

### Backend (AWS Lambda + API Gateway)
- **Runtime:** Python 3.12 (Lambda)
- **AI:** OpenAI Python SDK (GPT-4o Vision)
- **Scraping:** httpx + BeautifulSoup (lightweight, Lambda-compatible; no Playwright in Lambda)
- **Packaging:** Lambda Layers for large dependencies (httpx, bs4, openai)
- **Caching:** DynamoDB with TTL (simpler than Redis for Lambda; 30-min cache on search results)
- **Infrastructure-as-Code:** AWS SAM or Terraform

### APIs & Integrations
- OpenAI API (GPT-4o Vision)
- Amazon Product Advertising API v5
- Flipkart Affiliate API
- Google Custom Search API (fallback for platforms without official APIs)

---

## AWS Amplify Setup

```
GitHub repo
    └── main branch
          │  push → Amplify build trigger
          ▼
    Amplify Build
      - npm install
      - npm run build (Vite output → dist/)
      ▼
    Amplify Hosting
      - Serves dist/ as static SPA
      - URL: https://main.d<id>.amplifyapp.com
      - Custom domain optional (Route 53)
      - HTTPS included by default
```

**amplify.yml (build config):**
```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm install
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

The frontend calls the API Gateway URL (stored as `VITE_API_URL` env var set in Amplify console).

---

## Data Flow (Single Search)

```
User drops image on web page
      │
      ▼
Frontend converts to base64, POST /identify
      │
      ▼
Lambda (identify-fn) sends image to GPT-4o Vision → returns:
{
  category: "fashion",
  sub_type: "dress",
  attributes: "red, floral, midi, puff sleeves",
  search_query: "red floral midi dress puff sleeves"
}
      │
      ▼
Frontend receives category + query, POST /search
      │
      ▼
Lambda (search-fn) fires parallel asyncio tasks:
      ├── Amazon PA-API (keyword search)
      ├── Flipkart API (keyword search)
      ├── Myntra Scraper (search page)
      ├── Ajio Scraper
      ├── Nykaa Scraper (only if category = beauty)
      └── Meesho Scraper
      │
      ▼
Results normalized into unified schema:
{
  platform: "Myntra",
  product_name: "...",
  price: 1299,
  original_price: 2499,
  discount_percent: 48,
  image_url: "...",
  product_url: "...",
  rating: 4.2,
  in_stock: true
}
      │
      ▼
Sorted by price (asc), returned as JSON
      │
      ▼
React renders product card grid with filters
```

---

## Rate Limiting (Guest Users)

### Rule
- **10 searches per IP per day** without logging in
- After the 10th search, a modal appears prompting the user to sign up / log in
- Logged-in users get **unlimited searches**

### Implementation (DynamoDB)

Each search request hits a Lambda middleware that:
1. Extracts the caller's IP from `event['requestContext']['http']['sourceIp']`
2. Reads/writes a DynamoDB item:
```
Table: RateLimits
PK: "IP#<ip_address>"
SK: "DATE#2026-04-04"
count: 7
ttl: <unix timestamp for midnight tonight>  ← DynamoDB auto-deletes at midnight
```
3. If `count >= 10` AND user is not authenticated → return HTTP 429 with body `{ "limit_reached": true }`
4. Frontend intercepts 429 and opens the Login modal

```python
# Lambda middleware pseudocode
def check_rate_limit(ip: str, user_id: str | None) -> bool:
    if user_id:
        return True  # logged-in users bypass limit

    today = date.today().isoformat()
    key = {"pk": f"IP#{ip}", "sk": f"DATE#{today}"}
    item = dynamo.get_item(key) or {"count": 0}

    if item["count"] >= 10:
        return False  # blocked

    dynamo.update_item(key, increment_count=1, ttl=end_of_day_timestamp())
    return True
```

### UX Flow
```
Guest searches 1–9:
  → Search proceeds normally
  → Small counter shown: "3 of 10 free searches used today"

Guest search #10:
  → Search runs, results shown
  → Banner appears: "You've used all 10 free searches today"

Guest search #11+:
  → Search blocked immediately
  → Modal: "Sign in to continue searching — it's free!"
    [Sign in with Google]  [Sign up with email]  [Maybe later]
```

---

## Authentication

### Provider: AWS Cognito + Amplify Auth

AWS Cognito integrates natively with Amplify — minimal config, free tier covers up to 50,000 MAUs.

**Login options:**
- Google OAuth (one-click, most common)
- Email + Password (with email verification)
- Apple Sign-In (optional, Phase 2)

**Auth flow:**
```
User clicks "Sign In"
  → Amplify Auth triggers Cognito Hosted UI or custom UI
  → On success: JWT (access + id token) stored in browser localStorage
  → JWT sent as Authorization: Bearer <token> header on all API calls
  → Lambda validates token via Cognito JWKS endpoint
  → User identity extracted from token sub (userId)
```

**JWT validation in Lambda:**
```python
import jwt
from jwt.algorithms import RSAAlgorithm

def get_user_id(event) -> str | None:
    token = event.get("headers", {}).get("authorization", "").replace("Bearer ", "")
    if not token:
        return None
    try:
        payload = jwt.decode(token, get_cognito_public_key(), algorithms=["RS256"])
        return payload["sub"]  # Cognito user ID
    except Exception:
        return None
```

---

## User Profile & Features

### Profile Data Storage (DynamoDB)

```
Table: Users
PK: "USER#<cognito_sub>"
Attributes:
  - email
  - display_name
  - avatar_url (from Google OAuth)
  - created_at
  - total_searches (counter)
```

```
Table: Bookmarks
PK: "USER#<user_id>"
SK: "BM#<timestamp>#<platform>"
Attributes:
  - product_name
  - platform
  - price (at time of bookmarking)
  - image_url
  - product_url
  - bookmarked_at
```

```
Table: Favourites
PK: "USER#<user_id>"
SK: "FAV#<timestamp>"
Attributes:
  - search_image_s3_key  (the uploaded image stored in S3)
  - detected_query       (e.g. "red floral midi dress")
  - category
  - top_result           (best price product snapshot)
  - saved_at
  Note: Favourites = saved searches (the whole search), 
        Bookmarks  = saved individual products
```

```
Table: SearchHistory
PK: "USER#<user_id>"
SK: "SEARCH#<timestamp>"
Attributes:
  - search_image_thumbnail_url
  - detected_query
  - category
  - result_count
  - searched_at
TTL: 90 days auto-delete
```

---

## Web App Pages / Views

1. **Home / Upload View**
   - Large drag-and-drop zone ("Drop a photo of any fashion or beauty item")
   - Click to browse files
   - Image preview before submitting
   - Recent searches (from localStorage for guests, from API for logged-in users)
   - Search counter badge for guest: "7 / 10 free searches used today"

2. **Identifying State**
   - Spinner / skeleton with "Analyzing your image..." message
   - Shows detected category + extracted attributes once done
   - e.g. "Found: Red Floral Midi Dress — searching across 5 platforms"

3. **Results View**
   - Responsive card grid (3 cols desktop, 2 cols tablet, 1 col mobile)
   - Each card: product image, name, platform badge, price, original price, discount %
   - Bookmark icon (heart) on each card → saves individual product
   - Favourite icon (star) on results page header → saves the whole search
   - Filters sidebar: platform checkboxes, price range slider, discount filter
   - Sort: price low→high, discount %, relevance
   - "View on [Platform]" button → opens platform URL in new tab

4. **Login / Signup Modal**
   - Triggered when: search limit hit, or user clicks "Sign In"
   - [Continue with Google] button (Cognito OAuth)
   - [Email + Password] form
   - No redirect — stays on the same page, modal closes on success

5. **Profile Page** (`/profile`)
   - Avatar + display name + email
   - Stats: total searches, bookmarks count, favourites count
   - Tabs:
     - **Bookmarks** — saved products grid (with current price refresh option)
     - **Favourites** — saved searches (click to re-run)
     - **History** — recent searches (last 90 days)
   - [Sign Out] button

6. **No Results / Error State**
   - Friendly message + option to edit the extracted search query manually

---

## Smart Category Routing

| Detected Category | Platforms Queried |
|---|---|
| Fashion / Clothing | Myntra, Amazon, Flipkart, Ajio, Meesho |
| Beauty / Cosmetics | Nykaa, Amazon, Flipkart, Myntra (beauty section) |
| Footwear | Myntra, Amazon, Flipkart, Ajio |
| Accessories | Myntra, Amazon, Flipkart, Ajio, Meesho |
| Unknown | Show category picker to user, then route |

---

## Scraper Design (per platform)

Each scraper is a Python async function with a standard interface:
```python
async def scrape_myntra(query: str, category: str) -> list[Product]:
    ...
```

Scrapers handle:
- Rate limiting (random delays, rotating user-agents)
- httpx async requests (no Playwright in Lambda — use requests-based scraping)
- Retry logic (3 attempts with exponential backoff)
- Result normalization into the shared `Product` schema

For JS-heavy pages that don't work with plain httpx, fall back to:
- Google Custom Search API scoped to `site:myntra.com`
- Platform-specific undocumented JSON APIs (most platforms have internal search JSON APIs that can be reverse-engineered)

**Note on scraping legality:** Scraping publicly visible product listings and prices for personal/aggregation use is common practice and generally accepted. No login-protected or account data is accessed.

---

## Phased Rollout

### Phase 1 — MVP
- [ ] React + Vite frontend: upload + results view
- [ ] AWS Amplify deployment (Amplify URL live)
- [ ] API Gateway + Lambda setup (SAM template)
- [ ] GPT-4o Vision integration (identify-fn)
- [ ] Amazon PA-API integration (search-fn)
- [ ] Myntra + Nykaa scrapers
- [ ] Basic results card grid
- [ ] IP rate limiting (DynamoDB counter, 10/day)
- [ ] Guest search counter badge in UI
- [ ] Login modal (triggered on limit hit)

### Phase 2 — Auth + Profile
- [ ] AWS Cognito setup (Google OAuth + email/password)
- [ ] Amplify Auth integration in frontend
- [ ] JWT validation in Lambda
- [ ] Logged-in users bypass rate limit
- [ ] Profile page (`/profile`) with avatar + stats
- [ ] Bookmarks feature (save individual products)
- [ ] Favourites feature (save whole searches)
- [ ] Search history (last 90 days, DynamoDB TTL)
- [ ] Search image upload to S3 for re-run favourites

### Phase 3 — Full Platform Coverage
- [ ] Add Flipkart API, Ajio, Meesho scrapers
- [ ] DynamoDB TTL caching for search results
- [ ] Parallel asyncio scraping
- [ ] Filter + sort UI
- [ ] Smart category routing
- [ ] Custom domain (optional, Route 53)

### Phase 4 — Polish & Intelligence
- [ ] Visual similarity search (platform-native image search endpoints)
- [ ] Price refresh on bookmarked products ("price changed since you saved this")
- [ ] Price history sparkline on product cards
- [ ] Share results page (shareable URL with search id)
- [ ] Manual query override (user can edit the extracted search query)
- [ ] Similar items section

---

## Folder Structure (Monorepo) — As Built

The backend uses a single FastAPI app deployed as a single Lambda (via Mangum), rather than separate Lambda functions per route. All routes are co-located in the FastAPI app and routed by API Gateway to one Lambda handler.

```
find-me-this/
├── frontend/                       # React + Vite web app
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadZone.jsx      # drag-and-drop image upload
│   │   │   ├── ProductCard.jsx     # bookmark icon per card
│   │   │   ├── ResultsGrid.jsx     # grid + filter sidebar
│   │   │   ├── FilterSidebar.jsx   # platform/price/sort filters
│   │   │   ├── LoginModal.jsx      # triggered on rate limit or nav
│   │   │   ├── SearchCounter.jsx   # "7/10 free searches" badge
│   │   │   └── Navbar.jsx          # login/profile link
│   │   ├── pages/
│   │   │   ├── Home.jsx            # upload + results view
│   │   │   └── Profile.jsx         # bookmarks, favourites, history tabs
│   │   ├── hooks/
│   │   │   ├── useSearch.js        # identify + search flow
│   │   │   ├── useAuth.js          # AuthContext + useAuth hook
│   │   │   └── useRateLimit.js     # tracks guest search count (localStorage)
│   │   ├── api/
│   │   │   └── client.js           # axios instance, attaches JWT
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── backend/                        # Single FastAPI app → single Lambda
│   ├── app/
│   │   ├── routers/
│   │   │   ├── identify.py         # POST /identify
│   │   │   ├── search.py           # POST /search (rate limit → aggregator)
│   │   │   ├── bookmarks.py        # POST/GET/DELETE /bookmarks
│   │   │   ├── favourites.py       # POST/GET/DELETE /favourites
│   │   │   ├── history.py          # POST/GET /history
│   │   │   └── profile.py          # GET /profile
│   │   ├── scrapers/
│   │   │   ├── base.py             # BaseScraper ABC
│   │   │   ├── myntra.py
│   │   │   ├── amazon.py
│   │   │   ├── flipkart.py
│   │   │   ├── ajio.py
│   │   │   ├── nykaa.py
│   │   │   └── meesho.py
│   │   ├── services/
│   │   │   ├── vision.py           # GPT-4o Vision call
│   │   │   ├── aggregator.py       # parallel asyncio search across scrapers
│   │   │   └── rate_limit.py       # DynamoDB IP counter (10/day for guests)
│   │   ├── models/
│   │   │   └── product.py          # Product + IdentifyResponse Pydantic models
│   │   ├── auth.py                 # JWT validation via Cognito JWKS
│   │   └── main.py                 # FastAPI app + CORS + router registration
│   ├── handler.py                  # Lambda entry point (Mangum wrapper)
│   ├── requirements.txt
│   └── template.yaml               # AWS SAM template (Lambda + API GW + DynamoDB)
│
├── amplify.yml                     # Amplify build config (cd frontend && npm build)
├── .env.example                    # Environment variable template
└── Plan.md
```

---

## Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Scrapers break when sites update HTML | Modular design; daily Lambda health-check cron |
| Playwright not available in Lambda | Use httpx + platform internal JSON APIs instead |
| Lambda cold start latency on first request | Keep Lambda warm with EventBridge ping every 5 min |
| GPT-4o Vision cost at scale | Cache results in DynamoDB; identical query = cached response |
| Rate limiting by platforms | Random delays, user-agent rotation, respect robots.txt |
| Amazon / Flipkart API approval takes time | Start with scraping as fallback while API access is pending |
| CORS errors (browser → API Gateway) | Configure CORS on API Gateway; Lambda returns proper headers |
| IP spoofing to bypass rate limit | Rate limit is a soft UX nudge, not a security gate — Cognito auth is the real gate |
| User deletes account but data remains | Cascade-delete all DynamoDB rows on Cognito account deletion trigger |

---

## Estimated Costs (Monthly, MVP Scale ~1000 searches/day)

| Service | Estimated Cost |
|---|---|
| AWS Amplify Hosting | Free tier (first 15 GB served free) |
| AWS Lambda (1000 req/day) | Free tier (1M requests/month free) |
| AWS API Gateway | ~$1/month |
| AWS DynamoDB (5 tables, low traffic) | Free tier |
| AWS Cognito (up to 50k MAUs) | Free tier |
| AWS S3 (favourite search images) | ~$1/month |
| OpenAI GPT-4o Vision | ~$15–30/month |
| Amazon PA-API | Free (affiliate commissions) |
| **Total** | **~$17–35/month** |
