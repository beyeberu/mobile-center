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

## Free deployment

The project includes `render.yaml` for a no-cost Render web service serving the React site and Express API together. It health-checks `/api/health` and prompts for `ADMIN_PASSWORD` during setup. Set it to a unique value of at least 12 characters; Render generates `SESSION_SECRET`. The admin dashboard is at `/admin` on the deployed service URL.

**Free-tier storage is temporary.** SQLite orders, stock edits, and uploaded product images are stored on the instance filesystem and may be lost when Render restarts, sleeps, or redeploys the service. The free instance may also take a short time to wake after inactivity. This setup is suitable for a preview, not dependable live shop operations. Durable data requires a persistent database and image storage, which may have a cost.

To deploy, open Render, choose **New → Blueprint**, and select `beyeberu/mobile-center`. For a durable production store on another host, configure a persistent writable `STORAGE_DIR`, `NODE_ENV=production`, a persistent random `SESSION_SECRET` of at least 32 characters, `ADMIN_USERNAME`, and `ADMIN_PASSWORD`. Serve over HTTPS so the admin session cookie remains secure.