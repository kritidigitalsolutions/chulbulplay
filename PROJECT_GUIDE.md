# OTT Admin Project Guide

## 1. Overview

This is a full-stack OTT admin dashboard project with:
- Backend: Node.js + Express + MongoDB
- Frontend: React (Vite) + Axios
- Auth: JWT token based
- Role-based access control: admin and moderator roles
- Core features: user management, content management, dashboard visualization

## 2. Project structure

### Backend (c:\\Users\\Asus\\OneDrive\\Desktop\\OTT admin\\backend)
- `server.js` - application entry point (starts HTTP server)
- `app.js` - Express app configuration: middleware, routes
- `config/db.js` - MongoDB connection
- `models/` - Mongoose schemas for `User`, `Content`
- `controllers/` - business logic for auth, user, content
- `routes/` - route definitions
- `middlewares/` - JWT auth and role guard
- `sockets/` - (incomplete / optional, socket.io dashboard events)

### Frontend (c:\\Users\\Asus\\OneDrive\\Desktop\\OTT admin\\my-react-app)
- `src/App.jsx` - routing
- `src/pages/Login.jsx` - login form and auth flow
- `src/pages/Dashboard.jsx` - admin UI with users + content from API
- `src/components/ProtectedRoute.jsx` - route guard via token
- `src/api/axios.js` - API client with auth header interceptor

## 3. Runtime flow

### Backend flow
1. `server.js` loads `.env`, initializes Express app from `app.js`, connects MongoDB via `config/db.js`, and starts server on `PORT`.
2. `app.js` sets JSON parsing and CORS, static uploads path, public and protected routes.
3. `api/auth/login` uses hardcoded credentials to generate JWT; this should be replaced with DB-based login.
4. Protected routes use `authMiddleware` to verify JWT and attach `req.user`.
5. `roleMiddleware` checks `req.user.role` for admin-only operations.
6. `api/users` supports GET all users and PUT /:id/block toggle block status.
7. `api/content` supports GET list and POST add content.

### Frontend flow
1. User starts at `/`, fills login form, calls `API.post('/auth/login', form)`.
2. On success stores `token` in `localStorage`, navigates to `/dashboard`.
3. `ProtectedRoute` checks `token`; redirect to `/` if absent.
4. On dashboard mount, calls `API.get('/users')` and `API.get('/content')`.
5. Axios request interceptor adds `Authorization: Bearer <token>` if present.

## 4. Project logic details (
`backend/controllers` and `frontend/pages`)

### Auth
- `authController.login`: currently admin email/password hardcoded. In production:
  - lookup `User` in DB; verify hashed password with bcrypt.
  - issue JWT with `id`, `role`, `isBlocked` claims.
  - return safe user payload.

### Users
- `userController.getUsers`: returns all users excluding passwords.
- `userController.blockUser`: toggles `isBlocked` and saves. Response includes changed user.

### Content
- `contentController.addContent`: requires `title` and `type`.
- `contentController.getContent`: returns all content sorted descending.

### Middleware
- `authMiddleware`: extracts JWT from `Authorization` header; sets `req.user`.
- `roleMiddleware`: verifies role from `req.user`.

## 5. Known issues and immediate fixes

### EADDRINUSE (port in use)
- `server.js` currently always listens on `5001`, ignoring `PORT` constant. The error indicates another process uses port `5000` (frontend backend mismatch maybe). Fix:
  - use `server.listen(PORT, ...)` not fixed `5001`.
  - ensure .env has `PORT=5001` or set `PORT=5000` and stop existing process (or change to 5001 in frontend as needed).

### Danger: hardcoded credentials
- Replace static login with user DB model, Bcrypt password hash, proper error. Remove any open admin account in source.

### Security improvements
- Add `helmet`, `express-rate-limit`, `xss-clean`, `express-mongo-sanitize`.
- Add app-wide error handler middleware.
- Validate all inputs with `joi`/`celebrate`.

### Scalability and design
- Separate routes by domain and version: `/api/v1/users`, `/api/v1/content`.
- Add service layer (`services/`) to decouple controllers from data layer.
- Use `dotenv-safe` and `config` to manage environments.
- Use centralized response format for success/error.

## 6. Industry-level architecture guide (Next steps)

1. Add unit tests: `jest` for backend, `react-testing-library` for frontend.
2. Add e2e: Cypress.
3. CI/CD: GitHub Actions for lint/test/build, deploy to Heroku/Vercel/Netlify.
4. Containerize: `Dockerfile`, `docker-compose.yml` for app + Mongo.
5. Monitoring: Sentry + Prometheus + Grafana.
6. API docs: Swagger using `swagger-jsdoc` + `/api-docs`.

## 7. Recommended folder structure (production-ready)

```
backend/
  src/
    config/
    controllers/
    models/
    routes/
    middlewares/
    services/
    utils/
    app.js
    server.js
    index.js
  tests/
  .env
  package.json
frontend/
  src/
    api/
    components/
    pages/
    hooks/
    context/
    utils/
    styles/
  public/
  package.json
```

## 8. Quick check commands
- Start backend:
  - `cd backend`
  - `npm install`
  - `npm run dev` (or `node server.js`)
- Start frontend:
  - `cd my-react-app`
  - `npm install`
  - `npm run dev`

## 9. To confirm this guide
- `npm run lint`
- `npm test`
- manual test login and dashboard call

---

*Created by Copilot - use this as a baseline and evolve towards production architecture with auth state hardening, multi-tenant support, audit logs, and documentation.*
