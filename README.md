# E-book Shop (demo)

ร้านขายอีบุ๊กตัวอย่างสำหรับงานมหาวิทยาลัย: เลือกหนังสือ → กรอกข้อมูลผู้ซื้อ → ชำระเงิน**จำลอง** → ส่งลิงก์ดาวน์โหลดทางอีเมล → ติดตามคำสั่งซื้อ
Mobile-first (390 px, Android WebView), Thai UI, English status values. **No real payment gateway anywhere.**

| Unit   | Stack                                              | Deploy                         |
| ------ | -------------------------------------------------- | ------------------------------ |
| `web/` | Next.js 16 (App Router), TypeScript, Tailwind 4    | Vercel, or the `web` service   |
| `api/` | Express 5, TypeScript, zod, Prisma 7 → PostgreSQL  | Docker container behind nginx  |

The frontend never talks to Postgres: every read and write goes through the REST API at `NEXT_PUBLIC_API_URL`.

## Run everything with Docker Compose

Needs Docker with Compose v2.

```bash
cp .env.example .env            # set POSTGRES_PASSWORD (URL-safe characters)
docker compose up -d --build
docker compose ps               # wait until api is "healthy"
```

Open **https://localhost** (self-signed certificate, accept the warning once).

| Service    | What it does                                                                                 |
| ---------- | -------------------------------------------------------------------------------------------- |
| `postgres` | PostgreSQL 17, data in the named volume `pgdata`, published on `127.0.0.1:5432` only           |
| `migrate`  | one-shot: `prisma migrate deploy` + sync books from `api/files/books.json`, then exits        |
| `api`      | Express on :4000 (internal), non-root, healthcheck on `/api/health`                           |
| `web`      | Next.js standalone server on :3000 (internal)                                                  |
| `certs`    | one-shot: creates a self-signed cert in `nginx/certs/` unless one is already there             |
| `nginx`    | :80 → :443, TLS termination, gzip, CORS for `ALLOWED_ORIGIN` only; `/api/*` → api, `/` → web |

Without `SMTP_HOST`, the payment email (download link + expiry) is printed to the api log:

```bash
docker compose logs -f api
```

Stop with `docker compose down` (add `-v` to delete the database volume).

## API tests

Security tests (lookup rules, idempotent mock-pay, download tokens, rate limits) run against a real Postgres:

```bash
docker compose up -d postgres migrate
cd api
cp .env.example .env            # put your POSTGRES_PASSWORD into DATABASE_URL
npm ci
npm test
```

## Local development (hot reload)

```bash
# database only (needs the root .env from above)
docker compose up -d postgres migrate

# terminal 1: API on http://localhost:4000
cd api && npm ci && cp .env.example .env && npx prisma generate && npm run seed && npm run dev   # seed: cover URLs on :4000

# terminal 2: web on http://localhost:3000
cd web && npm ci && cp .env.example .env.local && npm run dev
```

`CORS_ORIGIN` in `api/.env` lets the dev web server call the API directly. In Docker, nginx owns CORS.

## Deploy: web on Vercel, API on a server

1. **Vercel:** import the repo, set Root Directory to `web`, set `NEXT_PUBLIC_API_URL=https://api.example.com`.
2. **Server** (DNS `api.example.com` → server, ports 80/443 open):

   ```bash
   cp .env.example .env    # PUBLIC_API_URL=https://api.example.com
                           # ALLOWED_ORIGIN=https://<project>.vercel.app, SMTP_* for real email
   sudo certbot certonly --standalone -d api.example.com
   mkdir -p nginx/certs
   sudo cp /etc/letsencrypt/live/api.example.com/{fullchain,privkey}.pem nginx/certs/
   docker compose up -d --build api nginx     # starts postgres + migrate too; web is not needed here
   ```

## Adding books

Everything for sale lives in `api/files/`, mounted into the containers, so adding a book needs no rebuild:

```
api/files/
├── books.json        # the catalog
├── my-book.pdf       # what buyers download
└── covers/
    └── my-book.jpg   # public, served at /api/covers/my-book.jpg (ratio 110:148, e.g. 660×888, gets cropped)
```

1. Copy the PDF into `api/files/` and the cover into `api/files/covers/` (e.g. `scp`).
2. Add an entry to `books.json`. `id` goes into the URL (`a-z`, `0-9`, `-`); the shop lists books by `id`.

   ```json
   { "id": "my-book", "title": "ชื่อหนังสือ", "description": "คำอธิบาย", "priceTHB": 199, "file": "my-book.pdf", "cover": "my-book.jpg" }
   ```

3. Sync: `docker compose run --rm migrate`

The sync checks everything first (id format, price, both files exist, no duplicate ids) and changes nothing if one entry is wrong.
Removing an entry takes the book off the shop, while earlier buyers keep their orders and download links.

## API

| Method | Path                           | Notes                                                                       |
| ------ | ------------------------------ | --------------------------------------------------------------------------- |
| GET    | `/api/books`                   | list (never exposes `fileKey`)                                              |
| GET    | `/api/books/:id`               | detail, 404 if unknown                                                      |
| POST   | `/api/orders`                  | `{ bookId, buyerName, buyerEmail }` → 201, status `PENDING`, `EB-YYYY-NNNN` |
| POST   | `/api/orders/:id/mock-pay`     | `PENDING → PAID`, issues the download token, sends email; idempotent        |
| POST   | `/api/orders/lookup`           | `{ orderNumber, email }` → order + download link, or 404                    |
| GET    | `/api/download/:token`         | streams the file while the token is valid                                   |

## Security

- **Lookup** needs `orderNumber` and `email` together, matched in one query. A wrong email and an unknown order number return the same 404 body.
- **Download tokens** come from `crypto.randomBytes(32)` (base64url) and expire after 24 h. The order id is never a download link. Once a link expires, a successful lookup issues a new token on the same row.
- **mock-pay** only flips a row that is still `PENDING`, inside a transaction, and `Download.orderId` is unique. Repeated or concurrent calls therefore never create a second token or send a second email.
- **Rate limits** are per IP: lookup 20 / 15 min, mock-pay 10 / 15 min. nginx overwrites `X-Forwarded-For`, so clients can't spoof their IP.
- **Validation:** zod strict schemas reject unknown fields with 400, and request bodies are capped at 10 kb.
- **Secrets:** none in the repo, only `.env.example` files. `.gitignore` covers `.env`, `.env.local`, `.env*.local`, local Postgres data and certs.

## Android WebView

- Enable `javaScriptEnabled` and `domStorageEnabled`. The checkout keeps screen-to-screen state in `sessionStorage`.
- The download button is a normal link to a `Content-Disposition: attachment` response. The host app needs a `DownloadListener` to save it.
