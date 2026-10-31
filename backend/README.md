# SportsBet API

Express 5 + TypeScript + Postgres. Handles admin login, articles and cover/inline image uploads.

## Setup
1. **Database:** create a Neon project, copy its connection string into `DATABASE_URL`.
2. **Images:** create a Cloudinary account, fill the `CLOUDINARY_*` values.
3. **Admin:** set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (10+ characters). The first admin is created on first start, then change the password in your env and keep it safe.
4. **Secret:** set `JWT_SECRET` to 32+ random characters (`openssl rand -hex 32`).
5. **CORS:** set `FRONTEND_ORIGIN` to your site, e.g. `https://sportsbet-tips.com`.
6. Run locally: `npm install && npm run dev` (needs `.env`; `docker compose up -d` starts a local Postgres).

## Deploy on Render
- Root directory `backend`, build `npm install && npm run build`, start `npm start`.
- Add the variables from `.env.example` and `NODE_ENV=production`.
- Migrations run automatically at startup.

## Auto-publish to the site
1. Vercel: Project Settings > Git > Deploy Hooks, create a hook, put its URL in `DEPLOY_HOOK_URL` on Render.
2. Vercel: Project Settings > Environment Variables, add `VITE_API_URL` = your Render URL (no trailing slash).
3. Every publish, edit or delete of a published article now rebuilds the site. The build downloads the articles and writes real HTML pages and the sitemap. If the API is down, the build stops instead of deploying a site without articles.

## Endpoints
- Public: `GET /api/articles`, `GET /api/articles/:slug`
- Writers (Bearer token): `GET/POST /api/manage/articles`, `GET/PATCH/DELETE /api/manage/articles/:id`
- Auth: `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/change-password`
- Admin only: `/api/admin/users` (create, disable, reset users)

## Owner account and the client
The account created from `ADMIN_EMAIL` is flagged as the **owner**. Other admins do not see it in the Users list and cannot change it. Add the client from **Admin > Users** as an **Admin**; he gets a temporary password and must choose his own at first sign-in. He can then add, disable and reset people himself.

Tell the client that a maintenance (owner) account exists. If you would rather not keep one, disable or remove it after handover.

## Videos
On its own line in an article, paste a YouTube, Vimeo, Facebook or direct `.mp4`/`.webm` link. The site shows a player and a link to the source. Other links (TikTok, Instagram and so on) stay normal links.

## Sessions
Sign-in lasts `JWT_EXPIRES_IN` (default 12h) and then the server rejects the token. The admin signs out after 30 minutes without activity, and **Sign out** ends the session on the server too (it signs that account out on every device). Check that `JWT_EXPIRES_IN` isn't set to a long value in Render.
