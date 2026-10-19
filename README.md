# ReturnLoop

### Turning business surplus into recoverable value.

ReturnLoop is a planned B2B surplus asset recovery platform that helps businesses discover, list, and exchange surplus inventory, unused equipment, and reusable materials.

Businesses often hold resources that are no longer needed for their original purpose but may still be useful to another organization. ReturnLoop aims to make these resources easier to discover and transfer through structured listings, buyer requests, inventory tracking, and transaction workflows.

> **Project status:** Initial specification. Development has not started. Features, APIs, and database structures described in this document are proposed designs, not implemented functionality.

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. The Problem](#2-the-problem)
- [3. Proposed Solution](#3-proposed-solution)
- [4. Product Goals](#4-product-goals)
- [5. Target Users](#5-target-users)
- [6. Scope and MVP](#6-scope-and-mvp)
- [7. Core User Journeys](#7-core-user-journeys)
- [8. Planned Features](#8-planned-features)
- [9. Technology Stack](#9-technology-stack)
- [10. Proposed Architecture](#10-proposed-architecture)
- [11. Planned Repository Structure](#11-planned-repository-structure)
- [12. Database Design](#12-database-design)
- [13. API Design](#13-api-design)
- [14. Inventory and Request Rules](#14-inventory-and-request-rules)
- [15. Authentication and Security](#15-authentication-and-security)
- [16. Non-Functional Requirements](#16-non-functional-requirements)
- [17. UI and UX Direction](#17-ui-and-ux-direction)
- [18. Development Roadmap](#18-development-roadmap)
- [19. Local Setup](#19-local-setup)
- [20. Environment Variables](#20-environment-variables)
- [21. Testing Strategy](#21-testing-strategy)
- [22. Advanced Programming Concepts](#22-advanced-programming-concepts)
- [23. Future Possibilities](#23-future-possibilities)
- [24. Risks and Constraints](#24-risks-and-constraints)
- [25. Success Metrics](#25-success-metrics)
- [26. Contributing](#26-contributing)
- [27. License](#27-license)

---

## 1. Overview

ReturnLoop is a proposed business-to-business (B2B) platform for recovering value from surplus assets.

A business can publish resources it no longer needs. Other businesses can discover those resources, request quantities, and coordinate a transfer. Sellers can manage availability, review requests, and track the outcome.

The initial version will focus on **surplus office furniture and equipment**. This gives the project a clear starting market before considering additional categories such as commercial equipment, packaging, and reusable materials.

### Example

A company has 50 surplus office chairs after relocating its office. Another company needs 20 chairs for a new workspace.

The seller lists the chairs on ReturnLoop with their condition, quantity, location, and asking price. The buyer discovers the listing and submits a request for 20 chairs. The seller reviews the request and accepts or rejects it. If accepted, the platform records the reservation and tracks the transaction until completion or cancellation.

### Product principle

**Help businesses find a useful next destination for resources they already own.**

ReturnLoop is not initially intended to handle every part of logistics, payment processing, or asset disposal. The MVP focuses on discovery, requests, inventory consistency, and transaction records.

---

## 2. The Problem

Businesses can accumulate surplus assets for several reasons:

- Office relocation or expansion.
- Project completion.
- Overstocking or changes in demand.
- Replacement of equipment.
- Returned or refurbished products.
- Changes in packaging or operational requirements.

These resources may remain in storage, be sold through informal channels, or be discarded because the process of finding another buyer is inconvenient.

Three problems are central to ReturnLoop's proposed scope.

### 2.1 Poor discoverability

Potential buyers may not know that suitable surplus resources are available from another business.

### 2.2 Fragmented coordination

Listings, availability, enquiries, negotiations, and transfer records can be spread across calls, messages, spreadsheets, and emails.

### 2.3 Unclear inventory and transaction status

Without a structured workflow, sellers may struggle to track available quantities, pending requests, accepted requests, and completed transfers.

ReturnLoop aims to bring these steps into one consistent workflow.

---

## 3. Proposed Solution

ReturnLoop will provide a shared platform for listing and recovering surplus business resources.

The planned workflow is:

1. A business creates an account and profile.
2. An authorized user creates a surplus listing.
3. Other businesses browse or search the marketplace.
4. A buyer submits a request for a specific quantity.
5. The seller accepts or rejects the request.
6. The system updates reserved and available quantities safely.
7. The parties coordinate the transfer.
8. The transaction is marked completed or cancelled.
9. The system retains a history of the request and transaction.

The first release will focus on the software workflow. Physical inspection, transportation, payment settlement, and legal ownership transfer remain the responsibility of the participating businesses unless a future version explicitly supports them.

---

## 4. Product Goals

### Primary goals

- Make business surplus easier to discover.
- Give sellers a structured way to publish available resources.
- Help buyers request the quantity they need.
- Prevent inventory from being over-reserved.
- Maintain a clear record of requests and transactions.
- Provide useful visibility into listings and recovered value.

### Non-goals for the MVP

The initial release will **not** attempt to:

- Operate a logistics fleet.
- Guarantee the physical condition of every listed item.
- Provide escrow or payment settlement.
- Automatically value every asset.
- Use machine learning as a requirement for matching.
- Support every possible surplus category.
- Provide complex enterprise resource planning (ERP) functionality.

Keeping these limits explicit should help the team finish a coherent, working product instead of accumulating unfinished features.

---

## 5. Target Users

### 5.1 Sellers

Businesses with surplus inventory, furniture, or equipment.

They need to:
- Publish accurate listings.
- Specify available quantities and prices.
- Review incoming requests.
- Track reserved inventory.
- Mark transfers as completed.

### 5.2 Buyers

Businesses looking for affordable resources.

They need to:
- Find relevant listings.
- Compare condition, quantity, price, and location.
- Request a specific quantity.
- Track request status.
- Maintain a history of purchases or transfers.

### 5.3 Platform administrators

Administrators oversee platform activity.

They need to:
- Review reported listings.
- Suspend abusive accounts when necessary.
- Remove inappropriate or misleading listings.
- Monitor requests and transactions.
- View platform-level metrics.

A user may be associated with a business that both buys and sells. The product should not require separate accounts for these activities.

---

## 6. Scope and MVP

The MVP should establish one complete path from listing a resource to recording a completed transfer.

### Included in the MVP

- User registration and login.
- Business profile management.
- Create, edit, publish, and archive listings.
- Listing images and descriptions.
- Category, condition, quantity, price, and location fields.
- Search, filtering, sorting, and pagination.
- Buyer requests for a specified quantity.
- Seller acceptance and rejection.
- Inventory reservation and release.
- Request cancellation under defined rules.
- Transaction status tracking.
- User dashboards.
- Basic administrative moderation.
- Activity history for important state changes.
- Basic product analytics.

### Deferred until after the MVP

- Real payment processing.
- Delivery partner integrations.
- Automated shipping quotes.
- AI-powered pricing.
- External ERP integrations.
- Native mobile applications.
- Complex bidding or auction systems.
- Multi-country tax and compliance workflows.
- Automated quality certification.

### MVP completion criteria

The MVP should be considered functionally complete only when:

1. A user can register and log in.
2. A seller can publish a valid listing.
3. Another user can find the listing and submit a request.
4. The seller can accept or reject the request.
5. Accepted quantities are reserved without exceeding available stock.
6. The transaction can be completed or cancelled according to defined rules.
7. The database retains the resulting state after a page refresh or server restart.
8. Unauthorized users cannot modify another business's listings or requests.
9. Core validation and error cases are tested.

---

## 7. Core User Journeys

### 7.1 Seller journey

1. Register and complete a business profile.
2. Open the seller dashboard.
3. Create a listing.
4. Enter the item's title, description, category, condition, quantity, price, and location.
5. Publish the listing.
6. Receive a buyer request.
7. Review the requested quantity and buyer information.
8. Accept or reject the request.
9. Coordinate the transfer outside the platform.
10. Mark the transaction completed when appropriate.

### 7.2 Buyer journey

1. Register and complete a business profile.
2. Browse available listings.
3. Search and apply filters.
4. Open a listing's detail page.
5. Enter the requested quantity and an optional message.
6. Submit the request.
7. Track whether the request is pending, accepted, rejected, or cancelled.
8. Coordinate collection or delivery with the seller.
9. Review the transaction record.

### 7.3 Administrator journey

1. Sign in with an authorized administrator account.
2. View platform activity and reported listings.
3. Inspect a listing or account.
4. Take an authorized moderation action.
5. Record the action and its reason.
6. Review relevant activity history.

Administrative permissions must be enforced by the backend, not just by hiding controls in the frontend.

---

## 8. Planned Features

### 8.1 Authentication and business profiles

Users should be able to create accounts and authenticate securely. Business profiles will contain the information needed to identify an organization on the platform.

Potential profile fields:
- Business name.
- Business type.
- Contact person's name.
- Business email.
- Phone number, if required.
- City and region.
- Business description.
- Verification status.

The first version may use basic email verification or administrator-reviewed profiles. Any claim that a business is verified must reflect a real verification process.

### 8.2 Surplus listings

A listing should include:
- Title.
- Description.
- Category.
- Item condition.
- Total quantity.
- Unit price and currency.
- Location.
- Images.
- Listing status.
- Seller/business reference.
- Creation and update timestamps.

Listings should have explicit statuses such as `DRAFT`, `ACTIVE`, `PAUSED`, `SOLD_OUT`, and `ARCHIVED`.

Only active listings with available inventory should normally accept new requests.

### 8.3 Search and filtering

Buyers should be able to filter listings by:
- Keyword.
- Category.
- Condition.
- Minimum and maximum price.
- Location.
- Available quantity.

The backend should validate filter parameters and use pagination rather than returning every listing in one response.

### 8.4 Recovery requests

A buyer submits a request against a listing.

The request should record:
- Listing.
- Buyer.
- Requested quantity.
- Optional message.
- Request status.
- Creation and update timestamps.

Proposed request statuses:
- `PENDING`
- `ACCEPTED`
- `REJECTED`
- `CANCELLED`

The seller should not be allowed to accept a request that would over-reserve the listing's inventory.

### 8.5 Inventory management

The system should distinguish between total, reserved, and available quantities.

For example:

| Inventory measure | Quantity |
|---|---:|
| Total quantity | 50 |
| Reserved quantity | 20 |
| Available quantity | 30 |

The available quantity can be derived as:

`availableQuantity = totalQuantity - reservedQuantity`

The backend must validate this invariant whenever a reservation is created, released, or completed. If the database stores a derived value for performance, updates must keep it consistent.

### 8.6 Transaction tracking

An accepted request should create or transition a transaction record according to the agreed workflow.

Proposed transaction statuses:
- `RESERVED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

The exact transition rules should be enforced in backend services.

### 8.7 Smart Surplus Matching

A future MVP extension may calculate a rule-based match score between a buyer's requirements and available listings.

Possible factors:
- Category compatibility.
- Price within the buyer's budget.
- Quantity availability.
- Distance or location compatibility.
- Condition requirements.

A simple, explainable scoring system should be implemented before considering machine learning. Recommendations must not be presented as guaranteed matches.

### 8.8 Analytics dashboard

Potential metrics include:
- Active listings.
- Pending requests.
- Completed transactions.
- Total quantities transferred.
- Estimated transaction value.
- Inventory recovery by category.
- Listing-to-request conversion rate.

Any displayed “value recovered” metric must be defined clearly. For the initial release, it should represent the recorded value of completed transactions, not independently verified savings or environmental impact.

---

## 9. Technology Stack

The proposed stack is chosen to fit a full-stack Advanced Programming project.

| Layer | Planned technology | Purpose |
|---|---|---|
| Frontend | React | Component-based user interface |
| Frontend tooling | Vite | Development server and build tooling |
| Styling | CSS or Tailwind CSS | Responsive interface styling |
| Backend runtime | Node.js | JavaScript runtime for the server |
| Backend framework | Express.js | HTTP server, routing, and middleware |
| Database | PostgreSQL | Relational, persistent application data |
| ORM | Prisma | Schema management and database queries |
| Authentication | JWT-based sessions or secure cookie sessions | Authenticated access |
| Password security | bcrypt or Argon2 | Password hashing |
| Image storage | Object storage service | Listing image storage |
| API testing | Postman or Bruno | Manual API verification |
| Automated testing | Node.js test runner or Vitest, plus Supertest | Automated tests |
| Version control | Git and GitHub | Source control and collaboration |

The final dependency versions should be selected when implementation begins. Use mutually compatible, supported releases and commit the lockfile.

### Why PostgreSQL?

ReturnLoop has related entities such as businesses, listings, requests, and transactions. PostgreSQL provides foreign keys, constraints, transactions, and relational queries that are well suited to this workflow.

### Why Prisma?

Prisma provides a schema-driven approach to database modeling and type-aware queries. It can make migrations and relationships easier to manage as the application evolves.

---

## 10. Proposed Architecture

ReturnLoop will use a client-server architecture.

```text
+-------------------------------+
|        React Frontend         |
| Pages, Components, Forms      |
+---------------+---------------+
                |
                | HTTPS / JSON
                v
+-------------------------------+
|       Express API Server      |
| Routes and Request Validation |
+---------------+---------------+
                |
                v
+-------------------------------+
|          Middleware           |
| Authentication, Authorization |
| Validation, Error Handling    |
+---------------+---------------+
                |
                v
+-------------------------------+
|        Service Layer          |
| Business Rules and Workflows  |
+---------------+---------------+
                |
        +-------+--------+
        |                |
        v                v
+---------------+  +----------------+
| Prisma / ORM  |  | Event Listeners |
+-------+-------+  +----------------+
        |                |
        v                v
+---------------+  +----------------+
|  PostgreSQL   |  | Notifications   |
+---------------+  +----------------+
```

This diagram represents the intended design, not an existing implementation.

### Architectural responsibilities

**Frontend**
- Render pages and reusable components.
- Collect and validate user input for usability.
- Call backend APIs.
- Display loading, success, and error states.
- Enforce no security decisions on its own.

**Routes and controllers**
- Define API endpoints.
- Parse requests.
- Call the appropriate service.
- Return consistent HTTP responses.

**Middleware**
- Authenticate requests.
- Check user roles and resource permissions.
- Validate request data.
- Handle request-level concerns and errors.

**Service layer**
- Apply business rules.
- Manage listing, request, inventory, and transaction workflows.
- Coordinate database operations.
- Emit domain events when appropriate.

**Database**
- Persist users, businesses, listings, requests, transactions, and activity records.
- Enforce referential integrity and relevant constraints.

**Event listeners**
- Handle secondary actions, such as creating notifications or recording analytics events.
- Avoid making a successful core transaction depend on a non-essential notification succeeding.

For critical events that must never be lost, a durable outbox or queued job mechanism may be considered later. An in-memory event emitter alone is not durable.

---

## 11. Planned Repository Structure

The repository is expected to follow a monorepo structure with separate frontend and backend applications.

```text
returnloop/
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   ├── businesses/
│   │   │   ├── listings/
│   │   │   ├── requests/
│   │   │   ├── transactions/
│   │   │   └── dashboard/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── lib/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   └── package.json
│
├── server/
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── events/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   ├── .env.example
│   └── package.json
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   └── database.md
│
├── .gitignore
├── README.md
└── package.json
```

This is the planned structure. Files and folders should be created as the implementation is built; their appearance here does not mean they already exist.

---

## 12. Database Design

The following schema is a proposed logical design. Exact field types, indexes, constraints, and Prisma syntax should be finalized during implementation.

### 12.1 User

Represents an individual account.

Suggested fields:
- `id`
- `name`
- `email`
- `passwordHash`
- `role`
- `status`
- `createdAt`
- `updatedAt`

The email should be unique. Password hashes must never be returned in API responses.

### 12.2 Business

Represents an organization.

Suggested fields:
- `id`
- `name`
- `businessType`
- `description`
- `email`
- `phone`
- `city`
- `region`
- `verificationStatus`
- `createdAt`
- `updatedAt`

### 12.3 BusinessMembership

Connects users to businesses.

Suggested fields:
- `id`
- `businessId`
- `userId`
- `membershipRole`
- `createdAt`

This relationship allows multiple users to manage one business and permits a user to belong to more than one business if required.

A unique constraint should prevent duplicate membership records for the same user and business.

### 12.4 Listing

Represents a surplus asset or group of similar assets.

Suggested fields:
- `id`
- `businessId`
- `title`
- `description`
- `category`
- `condition`
- `totalQuantity`
- `reservedQuantity`
- `unitPrice`
- `currency`
- `city`
- `region`
- `status`
- `createdAt`
- `updatedAt`

Quantities must be positive where appropriate, and reserved quantity must never be negative or greater than total quantity.

For monetary values, use a suitable decimal type rather than floating-point arithmetic. The application should define how currency is represented and validated.

### 12.5 ListingImage

Stores image metadata and references.

Suggested fields:
- `id`
- `listingId`
- `storageKey` or `url`
- `altText`
- `createdAt`

Image files should be stored in object storage or an appropriate file service, rather than as large binary blobs in ordinary listing rows. The database should store references and metadata.

### 12.6 RecoveryRequest

Represents a buyer's request for inventory.

Suggested fields:
- `id`
- `listingId`
- `buyerBusinessId`
- `requestedQuantity`
- `message`
- `status`
- `createdAt`
- `updatedAt`

A request should preserve the identity of the buyer business and listing it references.

### 12.7 Transaction

Tracks the agreed transfer arising from an accepted request.

Suggested fields:
- `id`
- `requestId`
- `sellerBusinessId`
- `buyerBusinessId`
- `quantity`
- `agreedUnitPrice`
- `currency`
- `status`
- `completedAt`
- `createdAt`
- `updatedAt`

A transaction should retain the agreed quantity and price as a historical snapshot. Later listing edits should not silently change an existing agreement.

### 12.8 ActivityLog

Records important application actions.

Suggested fields:
- `id`
- `actorUserId`
- `businessId`
- `entityType`
- `entityId`
- `action`
- `metadata`
- `createdAt`

The application should append records for important events such as request acceptance, reservation, rejection, completion, and cancellation. Ordinary users should not be able to edit or delete audit records through normal application routes.

### Relationship overview

```text
User -----< BusinessMembership >----- Business
                                         |
                                         | 1
                                         |
                                         v
                                      Listing
                                         |
                           +-------------+-------------+
                           |                           |
                           v                           v
                     ListingImage               RecoveryRequest
                                                       |
                                                       v
                                                   Transaction

User / Business -------------------------------> ActivityLog
```

The final database schema must specify deletion behavior carefully. For example, completed transaction records should not disappear merely because a listing is archived.

---

## 13. API Design

The API will use REST-style routes and JSON request/response bodies.

The proposed prefix is:

`/api/v1`

All endpoints below are planned contracts. They are not implemented yet, and request schemas may change during development.

### 13.1 Authentication

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Create an account | Public |
| `POST` | `/api/v1/auth/login` | Authenticate a user | Public |
| `POST` | `/api/v1/auth/logout` | End the session | Authenticated |
| `GET` | `/api/v1/auth/me` | Get current user profile | Authenticated |

If cookie-based sessions are selected, logout should invalidate the session. If stateless JWTs are used, token expiry and revocation behavior must be designed explicitly.

### 13.2 Businesses

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/v1/businesses` | Create a business profile | Authenticated |
| `GET` | `/api/v1/businesses/:id` | View a business profile | Authorized |
| `PATCH` | `/api/v1/businesses/:id` | Update a business profile | Business member |
| `GET` | `/api/v1/businesses/:id/members` | List business members | Authorized member |

### 13.3 Listings

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/v1/listings` | Create a listing | Authorized seller |
| `GET` | `/api/v1/listings` | Browse listings | Public or authenticated, per policy |
| `GET` | `/api/v1/listings/:id` | View listing details | Public or authenticated, per policy |
| `PATCH` | `/api/v1/listings/:id` | Update a listing | Owning business member |
| `POST` | `/api/v1/listings/:id/pause` | Pause a listing | Owning business member |
| `POST` | `/api/v1/listings/:id/archive` | Archive a listing | Owning business member |

Browsing may be public, but creating requests and managing inventory should require authentication.

Example query:

`GET /api/v1/listings?category=office-furniture&city=Delhi&page=1&limit=20`

The API should validate query parameters and enforce a maximum page size.

### 13.4 Recovery requests

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `POST` | `/api/v1/listings/:id/requests` | Request a quantity | Authenticated buyer |
| `GET` | `/api/v1/requests` | List requests visible to the user | Authorized user |
| `GET` | `/api/v1/requests/:id` | View request details | Buyer or seller |
| `POST` | `/api/v1/requests/:id/accept` | Accept a request | Authorized seller |
| `POST` | `/api/v1/requests/:id/reject` | Reject a request | Authorized seller |
| `POST` | `/api/v1/requests/:id/cancel` | Cancel a request when allowed | Authorized participant |

The backend must determine the buyer and seller from authenticated identity and database relationships, rather than trusting a client-supplied user ID.

### 13.5 Transactions

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/v1/transactions` | List a user's business transactions | Authorized participant |
| `GET` | `/api/v1/transactions/:id` | View transaction details | Authorized participant |
| `POST` | `/api/v1/transactions/:id/start` | Mark transfer as in progress | Authorized participant, per policy |
| `POST` | `/api/v1/transactions/:id/complete` | Mark transfer complete | Authorized participant, per policy |
| `POST` | `/api/v1/transactions/:id/cancel` | Cancel when permitted | Authorized participant or admin |

Completion and cancellation policies must be defined before these endpoints are implemented.

### 13.6 Administration

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| `GET` | `/api/v1/admin/reports` | View reported listings | Admin |
| `POST` | `/api/v1/admin/listings/:id/suspend` | Suspend a listing | Admin |
| `POST` | `/api/v1/admin/users/:id/suspend` | Suspend an account | Admin |
| `GET` | `/api/v1/admin/metrics` | View platform metrics | Admin |

### Standard response shape

A successful response may use:

```json
{
  "success": true,
  "data": {
    "id": "example-id"
  }
}
```

An error response may use:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The requested quantity is invalid."
  }
}
```

These are illustrative response examples, not output from a working API.

Use suitable HTTP status codes, including:
- `200 OK` for successful reads and updates.
- `201 Created` for successfully created resources.
- `204 No Content` where no response body is needed.
- `400 Bad Request` for malformed input.
- `401 Unauthorized` for unauthenticated requests.
- `403 Forbidden` for authenticated users without permission.
- `404 Not Found` for missing or inaccessible resources, according to the disclosure policy.
- `409 Conflict` for state conflicts such as insufficient inventory.
- `422 Unprocessable Content` for validly formed but semantically invalid input, if adopted consistently.
- `429 Too Many Requests` for rate-limited requests.
- `500 Internal Server Error` for unexpected failures.

Do not return stack traces, database details, password hashes, or secret configuration in production error responses.

---

## 14. Inventory and Request Rules

Inventory consistency is a central technical requirement.

### 14.1 Inventory invariant

For each listing:

`0 <= reservedQuantity <= totalQuantity`

Available quantity is:

`availableQuantity = totalQuantity - reservedQuantity`

### 14.2 Accepting a request

When a seller accepts a request, the backend should:

1. Verify that the requester is authorized to manage the listing.
2. Confirm that the request is still pending.
3. Confirm that the listing can accept requests.
4. Confirm that sufficient quantity is available.
5. Atomically reserve the requested quantity.
6. Change the request status.
7. Create the associated transaction record.
8. Record the relevant activity.
9. Commit the database transaction.

The operation must be atomic. If any critical step fails, the database should not retain a partially accepted request.

### 14.3 Concurrent requests

Two sellers or administrators should not be able to accept requests that collectively reserve more stock than is available.

Use an appropriate PostgreSQL transaction and locking or conditional-update strategy. A transaction by itself is not automatically enough under every isolation level if the operations are implemented incorrectly.

### 14.4 Cancellation

The release of reserved inventory must depend on the current state.

For example:
- Cancelling a pending request does not release inventory if none was reserved.
- Cancelling an accepted request may release reserved quantity if the transfer has not reached a state where cancellation is prohibited.
- Completing a transaction should reduce total inventory and reserved inventory consistently, or use an equivalent inventory ledger design.

The same reservation must never be released twice.

### 14.5 Historical integrity

Completed transaction records should preserve the agreed quantity, price, currency, and participating businesses. Listing changes must not rewrite completed transaction history.

### 14.6 Idempotency and duplicate actions

Critical actions such as accepting a request or completing a transaction should be protected against duplicate submissions. This can involve state-transition checks, database constraints, idempotency keys where appropriate, and careful transaction design.

---

## 15. Authentication and Security

Security requirements should be part of the initial implementation rather than an afterthought.

### Authentication
- Hash passwords with a suitable password-hashing algorithm such as Argon2 or bcrypt.
- Never store plaintext passwords.
- Never return password hashes from API endpoints.
- Set reasonable token or session expiry.
- Keep signing keys and database credentials in environment variables.

### Authorization
- Verify permissions on the server for every protected operation.
- Confirm that the authenticated user belongs to the relevant business.
- Prevent buyers from changing seller inventory.
- Prevent users from viewing or modifying unrelated private requests.
- Restrict administrative operations to administrators.

### Input validation
- Validate and normalize emails.
- Enforce maximum string lengths.
- Reject invalid quantities and negative prices.
- Validate enums and state transitions.
- Validate uploaded file type and size.
- Avoid trusting client-provided IDs, prices, roles, or status changes without server-side checks.

### Web security
- Configure CORS for known frontend origins.
- Use HTTPS in deployed environments.
- Apply rate limits to authentication and sensitive endpoints.
- Use secure, HTTP-only cookies and appropriate CSRF protections if cookie-based authentication is chosen.
- If using bearer tokens, avoid storing sensitive long-lived credentials in insecure browser storage.
- Use parameterized database queries through the ORM.
- Keep dependencies updated.
- Avoid logging passwords, tokens, or unnecessary personal information.

### File uploads
- Store images in an appropriate file or object-storage service.
- Verify allowed MIME types and file sizes.
- Generate safe storage names.
- Avoid executing uploaded files.
- Use signed or access-controlled URLs when appropriate.

### Audit history
- Record important administrative and transaction actions.
- Restrict direct modification of activity records.
- Do not claim the logs are tamper-proof unless the architecture actually provides that property.

---

## 16. Non-Functional Requirements

### Reliability
Core workflows should preserve consistent inventory and transaction state.

### Maintainability
Separate route handling, validation, business logic, and database access rather than placing everything in one large server file.

### Usability
Users should be able to understand a listing, request inventory, and track status without needing technical knowledge.

### Performance
Use pagination, appropriate database indexes, and efficient queries. Performance targets should be established after the expected dataset and deployment environment are known.

### Accessibility
Use semantic HTML, clear labels, keyboard-accessible controls, and visible validation messages.

### Responsiveness
The application should work on desktop and mobile browser sizes.

### Observability
Log important server errors and workflow events without exposing secrets or unnecessary personal data.

---

## 17. UI and UX Direction

The interface should feel like a practical B2B marketplace, not a social network.

### Proposed primary navigation
- Marketplace
- My Listings
- Requests
- Transactions
- Business Profile
- Dashboard

Administrative navigation should be shown only to authorized users.

### Planned pages
1. Landing page.
2. Register and login pages.
3. Marketplace listing page.
4. Listing detail page.
5. Create and edit listing pages.
6. Seller dashboard.
7. Buyer request dashboard.
8. Transaction detail page.
9. Business profile page.
10. Admin dashboard.

### UX principles
- Display quantity, condition, price, and location clearly.
- Make listing and request statuses easy to distinguish.
- Ask for confirmation before destructive or irreversible actions.
- Show clear empty, loading, success, and error states.
- Explain why a request cannot proceed.
- Avoid fake metrics and fabricated verification badges.
- Keep the number of steps in common workflows low.

The exact visual design system will be finalized during frontend development.

---

## 18. Development Roadmap

Development should proceed in small, testable milestones.

### Phase 0: Planning
- Confirm the MVP scope.
- Agree on user roles and workflows.
- Finalize the initial database model.
- Define API conventions.
- Create the repository and project scripts.

**Deliverable:** Agreed specification and project skeleton.

### Phase 1: Backend foundation
- Set up Node.js and Express.
- Configure environment variables.
- Connect PostgreSQL through Prisma.
- Create initial migrations.
- Add centralized error handling.
- Add request validation.
- Implement health-check endpoint.

**Deliverable:** Running API connected to the database.

### Phase 2: Authentication and businesses
- Implement registration and login.
- Add password hashing.
- Implement authorization middleware.
- Add business profiles and membership.
- Test ownership and role permissions.

**Deliverable:** Users can authenticate and manage authorized business profiles.

### Phase 3: Listings
- Implement listing creation and editing.
- Add listing status transitions.
- Implement search and filters.
- Add pagination.
- Integrate image storage if included in the first release.

**Deliverable:** Sellers can publish listings and buyers can discover them.

### Phase 4: Requests and inventory
- Implement buyer requests.
- Add seller acceptance and rejection.
- Enforce inventory constraints.
- Add transaction-safe reservations.
- Implement cancellation rules.
- Record activity history.

**Deliverable:** The main marketplace workflow works end to end.

### Phase 5: Frontend integration
- Build core pages and navigation.
- Connect pages to the API.
- Add forms and validation feedback.
- Implement loading, empty, and error states.
- Build dashboards for buyers and sellers.

**Deliverable:** A usable full-stack application.

### Phase 6: Administration and analytics
- Add listing moderation.
- Add account moderation.
- Build basic operational metrics.
- Restrict administrative endpoints.

**Deliverable:** A manageable platform for demonstration and testing.

### Phase 7: Quality and deployment
- Run automated tests.
- Test concurrent inventory requests.
- Fix authorization issues.
- Add seed data for local demonstrations.
- Configure deployment and production environment variables.
- Document known limitations.

**Deliverable:** A demonstrable MVP with reproducible setup instructions.

---

## 19. Local Setup

> The following instructions describe the intended setup process. They will become executable once the corresponding project files and scripts have been created.

### Prerequisites

Install:
- A supported Node.js LTS release.
- npm, included with Node.js.
- PostgreSQL.
- Git.
- An API client such as Postman or Bruno.

Verify your installation:

```bash
node --version
npm --version
git --version
psql --version
```

### 19.1 Clone the repository

Once the repository exists remotely:

```bash
git clone <repository-url>
cd returnloop
```

Replace `<repository-url>` with the actual repository URL.

### 19.2 Install dependencies

The final installation commands depend on the package scripts and workspace configuration selected during implementation.

For a monorepo with a root package file, the intended command may be:

```bash
npm install
```

If the frontend and backend use separate package files, install their dependencies in the corresponding directories instead.

### 19.3 Configure PostgreSQL

Create a local database and a development database user with appropriate permissions.

For example, using `psql` as a PostgreSQL administrator:

```sql
CREATE DATABASE returnloop;
CREATE USER returnloop_dev WITH PASSWORD 'replace-with-a-local-password';
GRANT CONNECT, CREATE ON DATABASE returnloop TO returnloop_dev;
```

Depending on the PostgreSQL version and schema permissions, additional grants may be needed. Do not use these development credentials in production.

### 19.4 Configure environment variables

Create local environment files from the eventual example files:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

These commands will work after the example files have been added to the repository.

Set the values required by the application. See [Environment Variables](#20-environment-variables).

### 19.5 Initialize Prisma

Once the Prisma schema and scripts exist, the expected workflow will resemble:

```bash
cd server
npx prisma generate
npx prisma migrate dev
```

Use the project's documented migration commands once they are defined. Do not reset a database containing data you need to preserve.

### 19.6 Start development servers

The final scripts are not yet defined. The intended development workflow will run:
- The Express API server.
- The Vite development server.

Use the root scripts or the individual client and server scripts documented after implementation begins.

### 19.7 Verify the setup

After implementation, verify that:
- The backend health endpoint responds.
- The frontend loads.
- Registration and login work.
- Listings can be created and retrieved.
- Recovery requests persist.
- Inventory changes survive a server restart.

---

## 20. Environment Variables

The following names are proposed. Add only variables the application actually uses, and keep `.env.example` free of real credentials.

### Server

| Variable | Purpose | Example |
|---|---|---|
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | API server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://USER:PASSWORD@localhost:5432/returnloop` |
| `JWT_SECRET` | JWT signing secret, if JWT is selected | Local placeholder only |
| `CLIENT_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `UPLOAD_STORAGE` | Selected image storage provider | To be decided |

Authentication-specific variables should match the chosen session or token design. Do not define unused secrets merely because they appear in this draft.

### Client

| Variable | Purpose | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for API calls | `http://localhost:5000/api/v1` |

Only non-secret values should use the `VITE_` prefix because Vite exposes such variables to client-side code.

### Environment rules
- Never commit `.env` files.
- Commit sanitized `.env.example` files.
- Use separate credentials for development, testing, and production.
- Rotate any secret that is accidentally committed or exposed.
- Never place database credentials or signing secrets in frontend variables.

---

## 21. Testing Strategy

Testing should cover business rules, authorization, and failure cases, not just whether the homepage renders.

### Unit tests
Test isolated functions and service rules, such as:
- Available quantity calculations.
- Listing validation.
- Request status transitions.
- Matching-score calculations.
- Permission decisions.

### API integration tests
Test endpoints against a test database:
- Registration and login.
- Listing creation and retrieval.
- Invalid listing data.
- Request submission.
- Request acceptance and rejection.
- Unauthorized access.
- Transaction completion and cancellation.

### Inventory consistency tests
Test cases should include:
- Requesting more than the available quantity.
- Accepting a request when inventory has changed.
- Two requests competing for the same remaining stock.
- Cancelling a pending request.
- Cancelling an accepted request.
- Duplicate acceptance or completion requests.
- Ensuring failed operations do not leave partial state changes.

### Frontend tests
Test important form validation, status rendering, and error handling.

### End-to-end tests
A representative end-to-end scenario should:
1. Create a seller account and business.
2. Publish a listing.
3. Create a buyer account and business.
4. Submit a request.
5. Accept the request.
6. Complete the transaction.
7. Verify inventory and transaction history.

Use a separate test database and test credentials. Never run destructive tests against production data.

---

## 22. Advanced Programming Concepts

ReturnLoop is intended to demonstrate concepts from a Node.js and backend programming syllabus.

| Concept | Planned application |
|---|---|
| Node.js runtime | Run the API server |
| Event loop | Handle asynchronous HTTP requests and database operations |
| Module system | Organize routes, services, middleware, and utilities into modules |
| HTTP server | Accept requests and return responses |
| Client-server architecture | Separate React UI from backend business logic |
| Express routing | Define resource-specific API endpoints |
| Express middleware | Authentication, authorization, validation, and error handling |
| Static files | Serve frontend build assets if the deployment architecture uses Express for this |
| Event Emitter | Trigger secondary in-process actions after important domain events |
| REST API design | Expose resources and workflows through HTTP |
| Relational database design | Model users, businesses, listings, requests, and transactions |
| Database transactions | Preserve consistency during inventory reservation and state transitions |
| Input validation | Reject invalid request data before business logic executes |
| Error handling | Return consistent, safe error responses |
| Testing | Verify route behavior and business rules |

### Event Emitter example

A future implementation might emit a `request.accepted` domain event after a request and inventory reservation have been committed successfully.

A listener could then create an in-app notification.

The event should be emitted after the database operation succeeds. For a production system where losing a notification event is unacceptable, use a durable delivery mechanism such as an outbox rather than relying only on an in-memory emitter.

---

## 23. Future Possibilities

These are possible extensions, not commitments for the first release.

### Smart matching
Recommend listings based on buyer requirements, price, quantity, condition, and location.

### Demand insights
Show sellers which categories receive the most interest and help them price listings more effectively.

### Bulk listing tools
Allow businesses to import many assets through CSV or spreadsheet files.

### Logistics integrations
Support delivery quotes, pickup scheduling, and shipment tracking through third-party providers.

### Payment integration
Introduce a supported payment provider after commercial and compliance requirements have been evaluated.

### Asset recovery reporting
Report recorded transaction values, quantities transferred, and reuse outcomes.

Environmental impact estimates should be introduced only with transparent assumptions and credible calculation methods.

### Enterprise workflows
Add multiple branches, approval chains, inventory exports, and integration with existing business systems.

### Verification
Introduce a documented business verification process and appropriate trust indicators.

---

## 24. Risks and Constraints

### Marketplace liquidity
A marketplace is useful only when buyers can find relevant inventory and sellers can reach potential buyers. Start with one narrow category and geography rather than trying to serve every business.

### Asset quality
Listings may be inaccurate or misleading. Clear condition definitions, photographs, reporting, and moderation can reduce risk but cannot guarantee quality.

### Logistics
Transporting low-value or bulky goods can cost more than the assets are worth. The MVP should allow parties to coordinate transfers without promising logistics services it does not provide.

### Trust
Business identity, listing accuracy, and transaction reliability affect adoption. Verification claims must be supported by actual checks.

### Inventory concurrency
Poorly implemented reservations can cause overselling or inconsistent records. Inventory changes must be handled atomically and tested under concurrent requests.

### Scope creep
Payment processing, logistics, AI, and enterprise integrations can expand the project significantly. They should remain out of scope until the core workflow is reliable.

### Monetization
Transaction fees and subscriptions are hypotheses to validate. The platform needs evidence that it saves time, recovers value, or reduces costs enough for customers to pay.

---

## 25. Success Metrics

The project should track metrics that reflect actual use rather than vanity metrics.

### MVP product metrics
- Number of registered businesses.
- Number of active listings.
- Number of requests submitted.
- Request acceptance rate.
- Number of completed transactions.
- Average time from listing to first request.
- Average time from acceptance to completion.
- Cancellation rate.
- Number of inventory conflicts prevented.

### Business validation metrics
- Percentage of participating businesses that return.
- Repeat listing rate.
- Repeat buyer rate.
- Recorded value of completed transactions.
- Estimated customer time saved, measured through interviews or observation.
- Willingness to pay for continued access.

### Technical quality metrics
- API error rate.
- Endpoint response times.
- Automated test coverage for critical workflows.
- Number of unresolved high-severity security issues.
- Inventory consistency under concurrent requests.

Set numeric targets after establishing a baseline. Do not claim financial savings or environmental benefits without explaining how they were calculated.

---

## 26. Contributing

ReturnLoop is a planned project. Contribution guidelines may be expanded once the repository and team workflow are established.

For development work:

1. Create a branch for a focused change.
2. Keep routes, validation, and business logic in their intended layers.
3. Add or update tests for changed behavior.
4. Run relevant checks before opening a pull request.
5. Document API or database changes.
6. Never commit credentials or production data.

Suggested branch naming:

```text
feature/authentication
feature/listing-management
feature/recovery-requests
feature/inventory-reservations
fix/request-authorization
```

Database schema changes should be accompanied by appropriate Prisma migrations.

---

## 27. License

The project license has not yet been selected.

Before publishing or distributing the project, choose a license appropriate for the intended use and add the corresponding `LICENSE` file. Until then, do not assume the repository is released under an open-source license.

---

## Project Status

**Current stage:** Initial planning and specification.

The repository is expected to begin with the project documentation and then grow through the milestones described above.

No backend, database schema, frontend pages, API endpoints, authentication system, or marketplace workflow should be considered implemented until the corresponding code is written, tested, and committed.

**ReturnLoop: recover value, reduce waste, and give surplus resources another useful destination.**
