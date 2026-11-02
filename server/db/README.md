# NivasPay Database Migration & PostgreSQL Setup Guide

This guide describes how to configure, migrate, and run NivasPay with a PostgreSQL database.

---

## 1. Environment Configuration

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your `DATABASE_URL` in `.env`:

```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:your_password@localhost:5432/nivaspay_dev"
DB_SSL="false"

# Cloud Hosted PostgreSQL (e.g. Supabase, Neon, AWS RDS, GCP Cloud SQL)
DATABASE_URL="postgresql://user:password@host:5432/dbname?sslmode=require"
DB_SSL="true"
```

> **Security Note:** Never commit `.env` or production credentials to version control. The codebase does not supply insecure hardcoded credentials; if `DATABASE_URL` is empty, the server explicitly informs you that PostgreSQL is not connected.

---

## 2. Running Migrations

Database migrations are located in `server/db/migrations/` and tracked in the `schema_migrations` table.

Run migrations using the npm script:

```bash
npm run db:migrate
```

Or directly via `tsx`:

```bash
npx tsx server/db/migrate.ts
```

### Migration History:
- `001_initial_schema.sql`: Scaffolds core tables:
  - `users`: Email uniqueness, role constraints (`CUSTOMER`, `OWNER`, `ADMIN`), bcrypt hashes, DPDP fields.
  - `properties`: Owner foreign key references, unit count validations, pricing checks, geographic indexes.
  - `applications`: Foreign keys to properties and users, tenancy application status constraints.
  - `payments`: RBI-compliant ledger entries with foreign keys, type and status enums, JSONB metadata.
  - `audit_logs`: Immutable security and operation audit records with user tracking and category indexing.
  - `schema_migrations`: Version-controlled tracking table ensuring idempotent migration runs.

---

## 3. Verifying Database Connectivity

You can check whether the database is genuinely connected by querying the `/api/health` endpoint:

```bash
curl http://localhost:3000/api/health
```

### When Connected to PostgreSQL:
```json
{
  "status": "healthy",
  "database": {
    "type": "PostgreSQL",
    "connected": true,
    "driver": "postgres",
    "urlConfigured": true,
    "activeStorageMode": "POSTGRESQL",
    "latencyMs": 12,
    "serverTime": "2026-10-09T05:50:00.000Z"
  }
}
```

### When PostgreSQL is NOT connected (Local Dev Fallback):
```json
{
  "status": "degraded",
  "database": {
    "type": "PostgreSQL",
    "connected": false,
    "driver": "none",
    "urlConfigured": false,
    "activeStorageMode": "IN_MEMORY_FALLBACK",
    "warning": "PostgreSQL is not connected. The application is operating in local fallback mode. Real database writes require a running PostgreSQL instance."
  }
}
```

---

## 4. Payment Provider (Razorpay)

- In development or local testing without live Razorpay credentials, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` may remain empty.
- When unconfigured, payment orders return a `PAYMENT_PROVIDER_UNCONFIGURED` status rather than fabricating fake successful captures or settlements.
