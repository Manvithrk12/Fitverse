# FITVERSE

**Your Fitness. Your Community. Your Journey.**

An AI-powered social fitness and wellness platform — MCA final project
(Cloud Computing & DevOps specialization). Built phase-by-phase; see
[`docs/`](./docs) for architecture, database, API, testing, and deployment
notes as they're added.

> **Status: Phase 0 — Project Foundation.** Repo, tooling, and a health-check
> connection between frontend, backend, and database are wired up. No
> features (auth, workouts, etc.) exist yet — those arrive phase by phase.

## Stack

| Layer     | Technology |
|-----------|------------|
| Frontend  | Next.js (App Router), React, TypeScript, Tailwind CSS |
| Backend   | Node.js, Express, TypeScript, REST |
| Database  | PostgreSQL + Prisma ORM |
| Auth      | JWT (access + refresh) — added Phase 1 |
| Storage   | AWS S3 — added Phase 13 |
| AI        | LLM API via backend only — added Phase 12 |
| DevOps    | Git, GitHub Actions, Docker |
| Cloud     | AWS EC2, RDS (PostgreSQL), S3, CloudWatch, IAM |

## Repository structure

```
FITVERSE/
├── frontend/          Next.js app
├── backend/           Express + TypeScript API
├── docs/              architecture / database / api / testing / deployment
├── .github/workflows/ CI/CD (added Phase 15)
├── docker/            container assets (added Phase 14)
├── docker-compose.yml local PostgreSQL for development
└── README.md
```

## Prerequisites

- Node.js 20+ and npm
- Docker (for local PostgreSQL) — or a local PostgreSQL 16 instance
- Git

## Getting started

### 1. Database

```bash
docker compose up -d postgres
```

This starts PostgreSQL on `localhost:5432` with database `fitverse`,
user `fitverse`, password `fitverse` (dev-only credentials — never used
outside your local machine).

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

The API starts on `http://localhost:4000`. Verify it's up:

```bash
curl http://localhost:4000/api/v1/health/live
curl http://localhost:4000/api/v1/health/ready   # confirms DB connectivity
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Visit `http://localhost:3000`.

## Development phases

Built in order, one phase at a time, with explicit stop/confirm between
each: Foundation → Authentication → Profile → Exercise Library → Workouts →
Nutrition → Progress → Dashboard → Gamification → Challenges/Leaderboards →
Social → Notifications → AI Coach → S3 → Docker → CI/CD → AWS Deployment →
Production Hardening.

## Security notes (Phase 0)

- `.env` files are git-ignored; only `.env.example` / `.env.local.example`
  are committed.
- No secrets are hardcoded anywhere in the codebase.
- All private user data will be scoped to the authenticated user via a
  verified JWT once auth lands in Phase 1 — never trusted from client input.
