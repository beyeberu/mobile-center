# Workspace Guidance

- The frontend is in `client/` and uses React with Vite.
- The backend is in `server/` and uses Node.js with Express.
- Run `npm run dev` from the workspace root to start both development servers.
- Keep API routes under `/api`; Vite proxies these requests to the backend.