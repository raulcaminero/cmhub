# CMHub API

Backend REST API for CMHub — a business management platform for Dominican Republic companies, focused on accounting, chart of accounts, double-entry journal entries, and DGII NCF (Número de Comprobante Fiscal) compliance.

## Stack

- **Runtime**: Node.js 20+
- **Framework**: NestJS 10
- **Language**: TypeScript 5
- **ORM**: Prisma 5
- **Database**: PostgreSQL 16
- **Auth**: JWT (access + refresh tokens) via Passport
- **Validation**: class-validator + class-transformer
- **Docs**: Swagger / OpenAPI

## Architecture

Onion architecture with four layers:

```
src/
├── domain/           # Pure domain — no framework deps
│   ├── entities/
│   ├── value-objects/
│   ├── enums/
│   └── repositories/ # Interfaces only
├── application/      # Use cases, services, DTOs
│   ├── dtos/
│   ├── enums/
│   └── services/
├── infrastructure/   # Concrete implementations
│   ├── persistence/
│   └── providers/
└── presentation/     # NestJS modules, controllers, guards
    └── modules/
```

## Prerequisites

- Node.js 20+
- Docker and Docker Compose

## Setup

```bash
cp .env.example .env

docker-compose up -d

npm install

npm run db:migrate

npm run start:dev
```

## API Documentation

Swagger UI is available at: http://localhost:3001/api/docs

## Environment Variables

| Variable               | Description                          | Default                  |
|------------------------|--------------------------------------|--------------------------|
| `DATABASE_URL`         | PostgreSQL connection string         | (required)               |
| `JWT_SECRET`           | Secret for signing access tokens     | (required in production) |
| `JWT_REFRESH_SECRET`   | Secret for signing refresh tokens    | (required in production) |
| `JWT_EXPIRES_IN`       | Access token lifetime                | `15m`                    |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime             | `7d`                     |
| `PORT`                 | HTTP port the server listens on      | `3001`                   |
| `NODE_ENV`             | Environment mode                     | `development`            |

## Available Scripts

| Script             | Description                              |
|--------------------|------------------------------------------|
| `npm run start:dev` | Start in watch mode (development)       |
| `npm run build`     | Compile TypeScript to `dist/`           |
| `npm run start`     | Run compiled build                      |
| `npm run test`      | Run unit tests                          |
| `npm run test:cov`  | Run tests with coverage report          |
| `npm run db:migrate` | Apply pending Prisma migrations        |
| `npm run db:generate` | Regenerate Prisma client              |
| `npm run db:studio` | Open Prisma Studio (DB browser)         |
| `npm run db:seed`   | Seed the database                       |

## API Endpoints

### Auth
| Method | Path               | Auth | Description            |
|--------|--------------------|------|------------------------|
| POST   | /api/auth/register | No   | Register a new user    |
| POST   | /api/auth/login    | No   | Login, returns tokens  |

### Companies
| Method | Path                   | Auth | Description                        |
|--------|------------------------|------|------------------------------------|
| POST   | /api/companies         | Yes  | Create a new company               |
| GET    | /api/companies         | Yes  | List companies for current user    |
| GET    | /api/companies/:id     | Yes  | Get company details                |

### Accounting
| Method | Path                                              | Auth | Description                  |
|--------|---------------------------------------------------|------|------------------------------|
| GET    | /api/companies/:id/accounting/accounts            | Yes  | List chart of accounts       |
| POST   | /api/companies/:id/accounting/accounts            | Yes  | Create an account            |
| GET    | /api/companies/:id/accounting/journal-entries     | Yes  | List journal entries         |
| POST   | /api/companies/:id/accounting/journal-entries     | Yes  | Create a journal entry       |

## Dominican Republic Specifics

- **RNC**: Registro Nacional del Contribuyente — 9-digit tax ID for companies, or 11-digit Cédula for individuals.
- **NCF**: Número de Comprobante Fiscal — DGII-assigned invoice sequence numbers. Types B01–B16 (physical) and E31–E45 (electronic).
- **Tax Regimes**: `ORDINARIO` (standard) and `RST` (Régimen Simplificado de Tributación).
- **Default currency**: DOP (Dominican Peso). The `Money` value object enforces non-negative amounts and 2 decimal precision.
- **Double-entry enforcement**: `POST /journal-entries` rejects any entry where total debits ≠ total credits (tolerance 0.001).
