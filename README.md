# Mobile Center

Mobile Center is a responsive phone storefront and repair-booking site with an admin dashboard backed by an Express API and SQLite database.

## Run locally

Requires Node.js 20.19+ or 22.12+ and npm.

```sh
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173`. The API runs on port 3001. The first server start creates an admin account and prints its one-time password in the server terminal. Save it; the password is stored as a scrypt hash and is not shown again. The admin sign-in is at `/admin`.

To set a chosen password before the first server start, set `ADMIN_PASSWORD` to at least 12 characters in the server process environment. `ADMIN_USERNAME` defaults to `admin`. To rotate an existing admin password, set `ADMIN_PASSWORD` and restart the API; the database is retained and the password is re-hashed.
The project includes `render.yaml` for a single Render web service serving both the React site and Express API. It uses a persistent disk at `/var/data` for SQLite and image uploads, and health-checks `/api/health`.

To deploy, create a new Blueprint on Render from `https://github.com/beyeberu/mobile-center`. Set the prompted `ADMIN_PASSWORD` to a unique value of at least 12 characters. Render generates the persistent `SESSION_SECRET`. After deployment, open the generated service URL; sign in to the dashboard at `/admin`.

The Render Starter service and persistent disk are paid resources. Back up the persistent disk regularly. For other production hosts, configure `NODE_ENV=production`, `STORAGE_DIR` to a persistent writable directory, a persistent random `SESSION_SECRET` of at least 32 characters, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. Serve over HTTPS so the admin session cookie remains secure.
- Node.js 20.19+ or 22.12+
- npm

## Run in development

From the project root, install dependencies and start both servers:

```sh
npm install
npm run dev
```

Open the Vite address printed in the terminal (normally `http://localhost:5173`). The client proxies `/api` requests to the Express server on port 3001.

## Other commands

```sh
npm run build
npm start
```

The production API listens on port 3001 by default. Set the `PORT` environment variable to change it.