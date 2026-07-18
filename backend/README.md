# Backend (Fastify API)

## Stack
- Fastify + TypeScript
- Drizzle ORM → Supabase Postgres
- JWT auth (register + login)

## Local setup

1. Copy env file:

```bash
cp .env.example .env
```

2. Fill `DATABASE_URL` (Supabase) and `JWT_SECRET`.

3. Install & push schema:

```bash
npm install
npm run db:push
```

4. Run API:

```bash
npm run dev
```

Health check: `http://localhost:8080/health`

## Main endpoints

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/register` | no |
| POST | `/auth/login` | no |
| GET | `/auth/me` | yes |
| GET/POST | `/projects` | yes |
| GET/PATCH/DELETE | `/projects/:id` | yes |
| GET/POST | `/projects/:projectId/transactions` | yes |
| PATCH/DELETE | `/transactions/:id` | yes |
| GET/POST | `/categories` | yes |

## Deploy on Render (free)

1. New **Web Service** → connect this GitHub repo
2. **Root Directory:** `backend`
3. **Runtime:** Node
4. **Build Command:** `npm install --include=dev && npm run build`
5. **Start Command:** `npm start`
6. **Instance type:** Free
7. Environment variables:
   - `DATABASE_URL` = Supabase Postgres URI (เพิ่ม `?sslmode=require` ท้าย URL)
   - `JWT_SECRET` = long random string
   - `CORS_ORIGIN` = your Vercel URL (e.g. `https://xxx.vercel.app`)
   - `NODE_ENV` = `production`
   - `NODE_VERSION` = `22`

> Schema/table: รัน `npm run db:push` จากเครื่องคุณก่อน (ไม่ใส่ใน Build บน Render เพราะมักค้าง)

8. After deploy, open `https://YOUR-SERVICE.onrender.com/health`

### Note about free tier
Render free services sleep after ~15 minutes idle. First request after sleep may take ~30–60s. This is expected.

## Connect from Vercel frontend later

Add env on Vercel:

```
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
```
