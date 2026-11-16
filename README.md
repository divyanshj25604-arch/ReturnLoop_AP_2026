# Return Loop

Return Loop is a decision intelligence application for returned electronics. It helps retailers work out the best next destination for each returned product.

Every return ends in one of six dispositions:

1. **Resell**: sell the item again as-is.
2. **Refurbish**: repair or restore the item, then resell it.
3. **Exchange**: use the item to fulfil a customer replacement.
4. **Donate**: give the item to a charitable organization.
5. **Recycle**: send the item for responsible material recovery.
6. **Write-off**: remove the item from inventory as a loss.

> **Project status:** Early development. This repository currently contains only the backend project skeleton. Product, return, inspection, warehouse, recommendation and decision-outcome features are planned but **not yet implemented**.

## Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js (v20 or later) |
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
│   ├── config/        # Configuration (environment, database connection)
│   ├── controllers/   # Request handlers
│   ├── routes/        # Route definitions
│   ├── services/      # Business logic
│   ├── models/        # Data access
│   ├── middleware/    # Express middleware
│   └── app.js         # Express application
├── dbms/              # Database design, schema and SQL (owned by the DBMS team)
├── tests/             # Automated tests
├── docs/              # Project documentation
├── .env.example       # Template for environment variables
├── .gitignore
├── package.json
└── README.md
```

## Installation

Prerequisites: Node.js v20 or later and npm.

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
| `DATABASE_URL` | PostgreSQL connection string (not used yet) | empty |

## Running the Project

```bash
npm run dev   # start with automatic reload (nodemon)
npm start     # start with plain Node.js
npm test      # run the test suite
```

## License

No license has been selected yet.
