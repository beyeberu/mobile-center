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

## Business details

Update `client/src/storeConfig.js` before launch with your currency, business phone, WhatsApp number (country code and digits), address, locality, and opening hours. The sample catalog and product photos are starter content; replace them in the admin dashboard with your inventory and images.

## Admin dashboard

Sign in at `/admin` to manage phones, upload up to eight photos per phone, update prices and stock, manage repair services and icons, and update order or repair-request statuses. Changes are saved to the same database used by the customer site. Customers can place orders and submit repair requests without creating an account.

## Data and uploads

- SQLite database: `server/data/mobile-center.sqlite`
- Uploaded product photos: `server/uploads/`
- Back up both paths together. These local files are not automatically synchronized to another machine.

## Production

```sh
npm run build
npm start
```

Set `NODE_ENV=production`, a persistent random `SESSION_SECRET`, `ADMIN_USERNAME`, and `ADMIN_PASSWORD` in the server environment. Set `PORT` if the default API port 3001 is unavailable. Serve the app over HTTPS in production; the admin session cookie is marked secure in production.
# React + Node Starter

A React frontend powered by Vite and a Node.js API powered by Express.

## Requirements

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