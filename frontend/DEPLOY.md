# ENTE.PrintLabs — Deployment Guide
## Cloudflare Pages (Next.js) + Cloudflare D1 + R2

---

## Step 1 — Cloudflare Account Setup

1. Sign up / log in at [cloudflare.com](https://cloudflare.com)
2. Install Wrangler CLI locally:
   ```bash
   cd frontend
   npx wrangler login
   ```

---

## Step 2 — Create D1 Database

```bash
npx wrangler d1 create enteprintlabs-db
```

Copy the `database_id` from the output and paste it into `wrangler.toml`:
```toml
database_id = "PASTE_YOUR_ID_HERE"
```

Then initialise the schema:
```bash
npx wrangler d1 execute enteprintlabs-db --file=schema.sql
```

---

## Step 3 — Create R2 Bucket

```bash
npx wrangler r2 bucket create enteprintlabs-media
```

Enable public access in the Cloudflare dashboard:
- R2 → `enteprintlabs-media` → Settings → Public Access → Allow

Copy the public URL (e.g. `https://pub-xxxx.r2.dev`) — you'll need it for env vars.

---

## Step 4 — Deploy to Cloudflare Pages

### Option A — Connect GitHub (recommended)
1. Push your `frontend/` folder to a GitHub repo
2. Go to Cloudflare Dashboard → Pages → Create a Project
3. Connect your GitHub repo
4. Set build settings:
   - **Framework preset**: Next.js
   - **Build command**: `npm run build`
   - **Build output directory**: `.next`
5. Set environment variables (Settings → Environment Variables):

| Variable | Value |
|----------|-------|
| `JWT_SECRET` | Any long random string (e.g. 64 char UUID) |
| `NEXT_PUBLIC_R2_PUBLIC_URL` | Your R2 public bucket URL |
| `NODE_ENV` | `production` |

### Option B — Deploy via CLI
```bash
npx wrangler pages deploy .next --project-name=enteprintlabs
```

---

## Step 5 — Local Development with D1

```bash
# Run schema against local D1
npx wrangler d1 execute enteprintlabs-db --local --file=schema.sql

# Start dev server with D1 + R2 emulation
npx wrangler pages dev -- npm run dev
```

---

## Step 6 — Create First Admin User

After deployment, use the register endpoint to create your admin account,
then manually update the role in D1:

```bash
# Production
npx wrangler d1 execute enteprintlabs-db \
  --command "UPDATE users SET role='admin' WHERE username='yourusername'"

# Local
npx wrangler d1 execute enteprintlabs-db --local \
  --command "UPDATE users SET role='admin' WHERE username='yourusername'"
```

---

## API Endpoint Reference

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/register` | Public |
| GET/PATCH | `/api/auth/profile` | Bearer Token |
| GET | `/api/products` | Public |
| GET | `/api/products/[id]` | Public |
| POST/PATCH/DELETE | `/api/products/[id]` | Admin |
| GET | `/api/materials` | Public |
| POST/PATCH/DELETE | `/api/materials/[id]` | Admin |
| GET/POST | `/api/requests` | Bearer Token |
| PATCH | `/api/requests/[id]` | Admin |
| GET/POST | `/api/orders` | Bearer Token |

---

## Files Created

```
frontend/
├── wrangler.toml              ← Cloudflare Pages config
├── schema.sql                 ← D1 database schema
├── src/
│   ├── types/cloudflare.d.ts  ← D1 + R2 global type declarations
│   ├── lib/
│   │   ├── auth.ts            ← JWT sign/verify (jose)
│   │   └── cf.ts              ← D1 + R2 binding accessors
│   └── app/api/
│       ├── auth/login/        ← POST login
│       ├── auth/register/     ← POST register
│       ├── auth/profile/      ← GET/PATCH profile
│       ├── products/          ← GET/POST products
│       ├── products/[id]/     ← GET/PATCH/DELETE product
│       ├── materials/         ← GET/POST materials
│       ├── materials/[id]/    ← PATCH/DELETE material
│       ├── requests/          ← GET/POST custom requests
│       ├── requests/[id]/     ← PATCH request status
│       └── orders/            ← GET/POST orders
```
