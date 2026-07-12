# CMHub — Sistema de Gestión Empresarial RD

Monorepo para el sistema de gestión contable y empresarial para empresas dominicanas.

## Stack

| Capa | Tecnología |
|---|---|
| Monorepo | Turborepo |
| Backend | NestJS 10, Onion Architecture, Prisma, PostgreSQL |
| Frontend | Next.js 15 App Router, Redux Toolkit, shadcn/ui, Tailwind CSS |
| Shared | `@cmhub/shared-types` — tipos TypeScript compartidos |
| Auth | JWT + Refresh Tokens |

## Estructura

```
cmhub/
├── apps/
│   ├── api/          @cmhub/api    — Backend NestJS (puerto 3001)
│   └── web/          @cmhub/web    — Frontend Next.js (puerto 3000)
└── packages/
    └── shared-types/ @cmhub/shared-types — Enums e interfaces compartidas
```

## Requisitos

- Node >= 20
- npm >= 10
- Docker (para PostgreSQL local)

## Setup inicial

```bash
# 1. Instalar todas las dependencias del monorepo
npm install

# 2. Copiar variables de entorno
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Editar apps/api/.env con tu JWT_SECRET y DATABASE_URL

# 4. Levantar PostgreSQL
docker-compose -f apps/api/docker-compose.yml up -d

# 5. Ejecutar migraciones
npm run db:migrate --workspace=@cmhub/api

# 6. Levantar todos los servicios en desarrollo
npm run dev
```

## Scripts del monorepo

| Comando | Descripción |
|---|---|
| `npm run dev` | Levanta api + web en paralelo |
| `npm run build` | Build de todos los packages |
| `npm run lint` | Lint de todos los packages |
| `npm run test` | Tests de todos los packages |
| `npm run db:migrate --workspace=@cmhub/api` | Migraciones de base de datos |
| `npm run db:studio --workspace=@cmhub/api` | Prisma Studio |

## URLs en desarrollo

| Servicio | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Swagger docs | http://localhost:3001/api/docs |

## Variables de entorno

### apps/api/.env

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret para access tokens |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens |
| `JWT_EXPIRES_IN` | Duración access token (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | Duración refresh token (default: 7d) |
| `PORT` | Puerto del servidor (default: 3001) |

### apps/web/.env.local

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del backend API |

## Módulos implementados

- **Auth** — Registro, login, JWT
- **Empresas** — Multi-empresa, roles por empresa (ADMIN / CONTADOR / VIEWER)
- **Contabilidad** — Plan de cuentas, asientos contables con validación de doble entrada
- **RD específico** — Tipos NCF (B01–E45), regímenes fiscales, validación RNC

## Próximos módulos

- Impuestos (ITBIS, retenciones)
- NCF — generación y control de secuencias
- Reportes DGII (606, 607, 608)
- AI — parseo de facturas con LangChain.js
- Logística e inventario
