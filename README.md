# gojotv-api (W6)

Frontend API Worker for GojoTV.

## Purpose
Single HTTP worker that serves all public API requests for the
GojoTV frontend. No queues, no cron, no external API calls.

## Routes
- GET /api/home
- GET /api/section/:key
- GET /api/anime/:slug
- GET /api/watch/:slug
- GET /api/catalog
- GET /api/search
- GET /api/menu
- GET /api/page/:slug

## Deploy
1. Push to GitHub
2. Cloudflare Dashboard → Workers & Pages → Connect to Git
3. Set secrets:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
4. Auto-deploy on push

## Dev
```bash
npm install
npm run dev
