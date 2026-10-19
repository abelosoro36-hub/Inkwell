# Inkwell

A writing platform: writers sign up free, pay a one-time activation, claim tasks, send work for review and
can upgrade to Premium after passing a writing test. The admin posts jobs, approves clients and work, and checks payments.

## What is inside

| Folder | What it is |
|---|---|
| `backend/` | Node.js, Express and TypeScript API with a SQLite database |
| `frontend/` | React website. One project, two builds: the public website and the admin site |

## Run it on your computer

1. Needs Node.js 22.13 or newer.
2. Backend: copy `backend/.env.example` to `backend/.env`, fill it in, then
   `cd backend`, `npm install`, `npm run dev` (http://localhost:4000).
3. Public website: `cd frontend`, `npm install`, `npm run dev` (http://localhost:5173).
4. Admin site: in another terminal in `frontend`, `npm run dev:admin` (http://localhost:5180).

Or run `start-dev.ps1` on Windows to open all three.

## Checks

- Backend: `npx tsc --noEmit`
- Payment keys: `npm run pay:test` (in `backend`)
- Websites: `npm run build` and `npm run build:admin` (in `frontend`)
- Backup the database: `npm run db:backup` (in `backend`)

## Deploying

- Backend: a host that runs Node 22.13+ and has a permanent disk for the database. Set the values from
  `backend/.env.example` as environment variables on the host, with `NODE_ENV=production`.
- Public website: build with `npm run build`, publish the `dist` folder.
- Admin site: build with `npm run build:admin`, publish the `dist-admin` folder at a different address.
- Set `VITE_API_URL` and `VITE_CLIENT_URL` when building (see `frontend/.env.example`).

## Security

Never commit `.env` files or the `data` folder. Keep the admin address private.