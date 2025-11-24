# Smart-Roads — Backend

Node/Express backend for the Smart-Roads project. Provides REST endpoints to create users, submit road requests (with photo uploads), and manage approvals. The app uses PostgreSQL for persistence and stores uploaded images in the `public/` folder.

## Quick start (local)

- Install dependencies:

```powershell
npm install
```

- Create a `.env` file in the project root with the required environment variables (see next section).
- Initialize the database (run migrations):

```powershell
npm run db:migrate
```

- Start the app in development mode:

```powershell
npm run dev
```

Notes:

- The project expects an `npm` script named `db:migrate` that runs the SQL migration files in `database/migrations/`. If that script is not present, run the SQL files manually with your Postgres client (see Database section).

## Environment variables

Set these in `.env` or in your host (Render/Heroku/etc):

- `PORT` — port to run the server (default 10000)
- `DATABASE_URL` — preferred (Postgres connection string). If not present, set the following individually:
  - `DB_HOST`
  - `DB_PORT`
  - `DB_USER`
  - `DB_PASSWORD`
  - `DB_NAME`
- `JWT_SECRET` — secret used to sign JSON Web Tokens
- `SERVER_URL` — canonical public URL of the backend (e.g. `https://smart-roads-ozka.onrender.com`). Used to construct public image URLs.

Notes:

- The code will use `DATABASE_URL` if available; otherwise it will use DB\_\* variables. Environment values are sanitized (trim + remove surrounding quotes) before use.

## API Endpoints (overview)

- `POST /signup` — create a user
- `POST /login` — log in (returns JWT)
- `POST /request` — submit a request (requires `Authorization: Bearer <token>`, multipart with `photo` file)
- `GET /request` — list requests (requires auth)
- `GET /request/:id` — single request (requires auth)
- `GET /approvals` — list approvals for the signed-in approver
- `POST /approve` — approve/reject a request (requires auth)

## Uploads

Uploaded images are stored in the `public/` folder and served statically. The server builds image URLs from `SERVER_URL` (recommended) or the incoming request host when `SERVER_URL` is not set.

If you previously uploaded images during local development, the DB may contain `http://localhost:8000/...` URLs. The server rewrites those on responses to use `SERVER_URL`. Consider migrating DB rows to permanent URLs (example SQL provided in the Database section below).

## Database / Migrations

The `database/` folder contains the connection helper and migration files.

- `database/connection.js` — Creates and exports a `pg` Pool. It supports `DATABASE_URL` (preferred) or individual `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` vars. The code sanitizes env vars (trims and removes surrounding quotes) and parses `DB_PORT` as a number.
- `database/migrations/` — SQL/JS migration files used to create the `users`, `requests`, and `approval` tables.

Run migrations:

```powershell
# recommended: if your package.json defines a script
npm run db:migrate

# otherwise run the SQL files in `database/migrations/` using psql or your DB tool
# example (psql):
# psql "postgres://user:pass@host:5432/dbname" -f database/migrations/create_users.js
```

Example SQL to migrate existing image URLs (replace localhost URLs saved during development):

```sql
UPDATE requests
SET photo = replace(photo, 'http://localhost:8000', 'https://smart-roads-ozka.onrender.com')
WHERE photo LIKE 'http://localhost:8000%';
```

## Deploy (Render)

1. Push repo to your Git provider (Render will clone it).
2. Create a Web Service on Render and point it to this repo & branch.
3. Set environment variables on Render (`DATABASE_URL` or DB\_\*, `JWT_SECRET`, `SERVER_URL`).
4. Build & Deploy: Render will run `npm install` and `node app.js` by default.

If the service fails at startup, check the logs for database connection errors (common causes: incorrect `DATABASE_URL`, quoted env values, or missing `DB_PORT`).
