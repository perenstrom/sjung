# Sjung

Sjung is a Next.js app for choir administration and repertoire workflows, including song
catalog management, people/role handling, and related planning data.

## Prerequisites

- Node.js `22` (from `.nvmrc`)
- npm (bundled with Node.js)
- PostgreSQL (local or remote)

## Environment setup

Copy `.env.example` to `.env` and set all variables:

```bash
cp .env.example .env
```

Required variables (from `.env.example`):

- `DATABASE_URL`
- `AUTH_SECRET`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_ENDPOINT`
- `R2_PUBLIC_BASE_URL`

## Local bootstrap

Run these commands from project root:

```bash
nvm use
npm install
cp .env.example .env
npm run db:migrate:dev
npm run db:seed
npm run dev
```

App runs at `http://localhost:3000`.

## Useful commands

- `npm run dev` - start local development server
- `npm run build` - production build
- `npm run start` - run production server
- `npm run lint` - run linting
- `npm run test:unit` - run unit tests once
- `npm run test:unit:watch` - run unit tests in watch mode
- `npm run db:migrate:dev` - create/apply development migration
- `npm run db:migrate:deploy` - apply migrations in deploy environments
- `npm run db:migrate:reset` - reset database and re-apply migrations
- `npm run db:push` - push schema without creating migrations
- `npm run db:seed` - seed database
- `npm run db:studio` - open Prisma Studio

## Testing Strategy

Unit tests in Sjung focus on deterministic logic first: pure helpers, parsing, transformations,
and domain rules that do not require network, database, or framework runtime.

- Test first: `lib/*` modules with pure or mostly pure logic.
- Prefer not mocking for unit tests; only mock when isolating unavoidable external boundaries.
- Keep tests co-located as `*.test.ts` next to the implementation file.
- Use the canonical CI/local command: `npm run test:unit`.
- Use watch mode while developing: `npm run test:unit:watch`.
