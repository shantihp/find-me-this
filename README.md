# FindMeThis

An AI-powered visual product search engine for Indian e-commerce. Upload a photo of any fashion, beauty, footwear, or accessory item and instantly find it across 6 major Indian shopping platforms — no text description needed.

## What It Does

1. User uploads a product photo (or drops an image URL)
2. GPT-4o Vision identifies the item and extracts a precise search query
3. The backend scrapes Myntra, Amazon India, Flipkart, Ajio, Nykaa, and Meesho in parallel
4. Results are unified, deduplicated, and sorted by price with direct buy links

**Use case:** You see a dress on Instagram, a lipstick shade on a friend, or sandals in a magazine — just take a photo and find it.

---

## Tech Stack

### Frontend
- React 18 + Vite
- Tailwind CSS
- TanStack React Query
- react-dropzone (image upload)
- Axios
- AWS Amplify Auth (Cognito) — *currently mocked, see Gotchas*
- Hosted on AWS Amplify

### Backend
- Python 3.12 on AWS Lambda
- FastAPI + Mangum (ASGI → Lambda adapter)
- OpenAI SDK (GPT-4o Vision)
- httpx + BeautifulSoup (web scraping)
- boto3 (DynamoDB, Cognito)
- python-jose (JWT validation)

### Infrastructure
| Service | Purpose |
|---|---|
| AWS Lambda | Serverless compute (single function, all routes) |
| AWS API Gateway | HTTP API frontend |
| AWS DynamoDB | Rate limits + user data (bookmarks, history) |
| AWS Cognito | User authentication |
| AWS Amplify | Frontend hosting + CI/CD |
| AWS SAM | Infrastructure as Code |
| OpenAI API | GPT-4o Vision for image identification |

---

## Project Structure

```
find-me-this/
├── frontend/
│   ├── src/
│   │   ├── api/client.js          # Axios client with JWT attachment
│   │   ├── hooks/                 # useAuth, useSearch, useRateLimit
│   │   ├── pages/                 # Home.jsx, Profile.jsx
│   │   └── components/            # UploadZone, ProductCard, LoginModal, etc.
│   ├── vite.config.js             # Dev proxy → localhost:8000
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI app + router mounting
│   │   ├── auth.py                # JWT validation via Cognito JWKS
│   │   ├── routers/               # /identify, /search, /bookmarks, /history, /profile
│   │   ├── services/              # aggregator.py, vision.py, rate_limit.py
│   │   ├── scrapers/              # myntra.py, amazon.py, flipkart.py, ajio.py, nykaa.py, meesho.py
│   │   └── models/product.py      # Pydantic schemas
│   ├── handler.py                 # Mangum Lambda entrypoint
│   ├── requirements.txt
│   └── template.yaml              # SAM template (Lambda, API GW, DynamoDB, IAM)
├── amplify.yml                    # Amplify build config
├── .env.example
└── Plan.md                        # Architecture & design notes
```

---

## Local Development

### Prerequisites
- Node.js 16+
- Python 3.12
- AWS CLI configured (`aws configure`)
- An OpenAI API key with GPT-4o access
- AWS Cognito User Pool (or skip auth for local dev)

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Copy and fill in env vars
cp ../.env.example .env

uvicorn app.main:app --reload --port 8000
```

API available at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`. The Vite dev server proxies `/api/*` calls to `localhost:8000`, so no CORS issues in dev.

### Running Both Together

Open two terminals:
```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

```env
OPENAI_API_KEY=sk-...
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
RATE_LIMIT_TABLE=FindMeThis-RateLimits
USER_DATA_TABLE=FindMeThis-UserData
COGNITO_USER_POOL_ID=ap-south-1_XXXXXXXXX
COGNITO_CLIENT_ID=XXXXXXXXXXXXXXXXXXXXXXXXXX
```

In production, secrets are pulled from AWS Systems Manager Parameter Store:
- `/findmethis/openai_api_key`
- `/findmethis/cognito_user_pool_id`
- `/findmethis/cognito_client_id`

### Frontend (`frontend/.env.local`)

```env
VITE_API_URL=http://localhost:8000    # dev
# VITE_API_URL=https://xxxx.execute-api.ap-south-1.amazonaws.com   # prod
```

Vite only exposes variables prefixed with `VITE_`.

---

## Deployment

### 1. Store Secrets in Parameter Store

```bash
aws ssm put-parameter --name /findmethis/openai_api_key \
  --value "sk-..." --type SecureString

aws ssm put-parameter --name /findmethis/cognito_user_pool_id \
  --value "ap-south-1_XXX" --type SecureString

aws ssm put-parameter --name /findmethis/cognito_client_id \
  --value "XXX" --type SecureString
```

### 2. Deploy Backend (SAM)

```bash
cd backend

# First time — walks through all options
sam build
sam deploy --guided
# Stack name:    FindMeThis-Stack
# Region:        ap-south-1
# Save to file:  Y (creates samconfig.toml)

# Subsequent deploys
sam build && sam deploy
```

SAM creates the Lambda function, API Gateway, and both DynamoDB tables automatically. The deployed API URL is printed in the output as `ApiUrl`.

### 3. Deploy Frontend (AWS Amplify)

1. Go to AWS Amplify Console → **New app** → **Host web app**
2. Connect this GitHub repository and select the `main` branch
3. Amplify detects `amplify.yml` automatically — build command is `npm run build`, output dir is `frontend/dist`
4. Under **Environment variables**, add:
   - `VITE_API_URL` → the `ApiUrl` from the SAM deploy output
5. Click **Save and deploy**

Every push to `main` triggers a new Amplify build and deploy automatically.

### 4. Configure Cognito

Either create a User Pool via the AWS Console or CLI, then store the Pool ID and Client ID in Parameter Store (step 1). The backend validates JWTs against Cognito's JWKS endpoint; the region is set in `backend/app/auth.py`.

---

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/identify` | Optional | Upload image (base64), returns GPT-4o search query + category |
| POST | `/search` | Optional | Search all platforms with a query string |
| GET | `/bookmarks` | Required | List saved bookmarks |
| POST | `/bookmarks` | Required | Save a product bookmark |
| DELETE | `/bookmarks/{id}` | Required | Remove a bookmark |
| GET | `/history` | Required | List search history (90-day TTL) |
| GET | `/profile` | Required | Returns user ID |

---

## Rate Limiting

- **Unauthenticated:** 10 searches per IP per day
- **Authenticated:** Unlimited

Rate limit state is stored in DynamoDB (`FindMeThis-RateLimits`) with a TTL set to end-of-day (midnight IST). The frontend also tracks this client-side in `localStorage` (`fto_rate_limit`) to avoid unnecessary API calls.

---

## Gotchas

**Scraper fragility** — Scrapers use `httpx` with no rotating proxies. If a platform updates its HTML structure or detects the user agent, that platform's results silently return empty. This won't break the search — it just means fewer results from that source. Myntra uses an internal gateway API rather than HTML scraping.

**Auth is mocked in the frontend** — `LoginModal.jsx` calls a `mockLogin()` function that sets a fake user ID in state and `localStorage`. The backend JWT validation is fully implemented, but the Amplify Auth SDK calls on the frontend are not wired up yet. Bookmarks and history won't work end-to-end until this is connected.

**CORS is open** — The SAM template sets `AllowOrigins: "*"`. Before going to production, tighten this to your Amplify domain.

**Single Lambda for all routes** — All API routes run in one Lambda function (30s timeout, 512 MB memory). This keeps cold starts manageable but means a slow scrape affects the entire function.

**Region is hardcoded** — The backend targets `ap-south-1` (Mumbai). If you deploy to a different region, update `REGION` in `backend/app/auth.py` and the Parameter Store paths.

**Nykaa only runs for beauty** — The Nykaa scraper is only invoked when `category="beauty"`. Other categories skip it.

**Search history TTL** — History records are auto-deleted after 90 days. Bookmarks and favorites have no TTL and persist indefinitely.

**Image requirements** — Frontend accepts JPG, PNG, and WebP only. Images are base64-encoded before being sent to the backend. GPT-4o Vision performs best with clear, well-lit photos of a single item.

**No search result caching** — The Plan.md mentions a 30-minute DynamoDB cache for search results, but it is not implemented. Every search hits the scrapers live.

---

## License

MIT
