# Phase 0 — Project Foundation: Decisions

## Scope

Repository, tooling, and a verified connection path
`frontend → backend → database` — no product features yet.

## Decisions

- **Monorepo, not separate repos.** `frontend/` and `backend/` are
  logically separated (independent `package.json`, independent deploy
  units later) but versioned together for now, per the blueprint.
- **Backend layering:** `routes → controllers → services → repositories/Prisma`.
  Phase 0 only wires up `routes → controllers` (health check); `services/`
  and `repositories/` are created empty and populated starting Phase 1.
- **TypeScript pinned to 5.7.x**, not the newly-released 7.x line — 7.x
  removed/changed `tsconfig` options (`moduleResolution: node`, `baseUrl`)
  that the rest of the toolchain (ts-node-dev, current ESLint configs)
  still assumes. Revisit once the ecosystem catches up.
- **Health checks split into liveness vs. readiness** (`/health/live`,
  `/health/ready`) rather than one endpoint — liveness only proves the
  process is running; readiness additionally proves the database is
  reachable. This is the standard pattern for container orchestration
  health probes, which matters once Phase 14/16 (Docker, AWS) land.
- **`docker-compose.yml` at Phase 0** provisions PostgreSQL only, for local
  dev convenience. It is *not* the Phase 14 deliverable — Phase 14
  containerizes the frontend and backend applications themselves.
- **No shadcn/ui, Framer Motion, or Recharts installed yet.** They're in
  the final stack (§3) but nothing in Phase 0 uses them; adding them now
  would be dependencies with no callers. They'll be added when the phase
  that needs them starts (e.g., Recharts in Phase 7 — Dashboard).

## Known environment limitation (dev sandbox only)

`prisma generate` and `next/font/google` could not complete inside the
sandbox this scaffold was built in — both require reaching hosts
(`binaries.prisma.sh`, `fonts.googleapis.com`) outside its network
allowlist. This does **not** affect a normal machine or CI runner with
standard internet access. Two consequences while working in a restricted
sandbox:

1. Run `npm run prisma:generate` (in `backend/`) on a machine with full
   network access before `npm run dev` — the Prisma Client types won't
   exist otherwise, and the app fails to boot (see below).
2. `next/font/google` was replaced with the system font stack in
   `frontend/src/app/layout.tsx` — this removes an external network
   dependency at build time entirely, which is arguably preferable
   regardless of environment.

One follow-up worth tracking in Phase 1: `src/config/prisma.ts`
instantiates `PrismaClient` at import time, so *any* route — including
`/health/live`, which shouldn't need the database — fails to boot the
whole process if the Prisma Client hasn't been generated. That's expected
(generation is a required build step), but worth knowing if liveness ever
needs to succeed independently of the database in a partially-broken
deploy.
