# Return Loop

Return Loop is a decision intelligence application for returned electronics. It helps retailers work out the best next destination for each returned product.

Every return ends in one of six dispositions:

1. **Resell**: sell the item again as-is.
2. **Refurbish**: repair or restore the item, then resell it.
3. **Exchange**: use the item to fulfil a customer replacement.
4. **Donate**: give the item to a charitable organization.
5. **Recycle**: send the item for responsible material recovery.
6. **Write-off**: remove the item from inventory as a loss.

> **Project status:** Early development. The backend currently provides an Express server with a health-check endpoint. Product, return, inspection, warehouse, recommendation and decision-outcome features are planned but **not yet implemented**.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js (v22 or later) |
| Web framework | Express.js |
| Language | JavaScript (CommonJS) |
| Database | PostgreSQL (planned) |
| Configuration | dotenv |
| Cross-origin requests | cors |
| Development reload | nodemon |
| Testing | Node.js built-in test runner (`node:test`) |

## Folder Structure

```text
ReturnLoop_AP_2026/
├── src/
│   ├── config/        # Configuration (environment variables)
│   ├── controllers/   # Request handlers
│   ├── routes/        # Route definitions, mounted under /api
│   ├── services/      # Business logic
│   ├── models/        # Data access
│   ├── middleware/    # 404 and error-handling middleware
│   ├── app.js         # Express application (middleware and routes)
│   └── server.js      # Entry point that starts the HTTP server
├── dbms/              # Database design, schema and SQL (owned by the DBMS team)
├── tests/             # Automated tests
├── docs/              # Project documentation
├── .env.example       # Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

## Installation

Prerequisites: Node.js v22 or later and npm.

```bash
git clone https://github.com/divyanshj25604-arch/ReturnLoop_AP_2026.git
cd ReturnLoop_AP_2026
npm install
cp .env.example .env
```

Edit `.env` to suit your machine. Never commit `.env`; it is ignored by git.

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | Port the HTTP server listens on | `3000` |
| `NODE_ENV` | Runtime environment | `development` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/returnloop_db` |

## Database Setup

1. Ensure PostgreSQL is running and create a local database:

   ```bash
   createdb returnloop_db
   ```

2. Configure `DATABASE_URL` in `.env`:

   ```env
   DATABASE_URL=postgresql://localhost:5432/returnloop_db
   ```

3. Initialize the schema and populate seed data:

   ```bash
   npm run db:setup
   ```

   This executes `dbms/03_schema.sql` followed by `dbms/04_seed.sql`, rebuilding and seeding all tables cleanly in one command.

## Running the Project

```bash
npm run dev   # start with automatic reload (nodemon)
npm start     # start with plain Node.js
npm test      # run the test suite
```

When the server starts it logs:

```text
Return Loop API running on http://localhost:3000 (development)
```

If the port is already in use, the server logs an error and exits with code 1. Change `PORT` in `.env` to use another port.

## API

All endpoints are served under the `/api` prefix.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Confirms the API is running |

### `GET /api/health`

```bash
curl http://localhost:3000/api/health
```

Response (`200 OK`):

```json
{
  "success": true,
  "message": "Return Loop API is running",
  "service": "Return Loop",
  "environment": "development"
}
```

### Errors

Unknown routes return `404 Not Found`:

```json
{
  "success": false,
  "message": "Route not found: GET /api/unknown"
}
```

Malformed JSON request bodies return `400 Bad Request`. Unexpected errors return `500 Internal Server Error`; in production the error details are hidden.

## License

No license has been selected yet.
