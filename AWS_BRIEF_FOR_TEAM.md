# 🚀 Beam Affiliate — Tech Stack & Architecture Brief for AWS Team

> **Purpose:** This document describes the Beam Affiliate platform's technology stack, infrastructure requirements, and deployment characteristics so the AWS team can recommend the right services to host it.

---

## 1. What We Are Building

**Beam Affiliate** is a full-stack **affiliate marketing SaaS platform**. It allows businesses to run their own partner/referral programme — tracking clicks, managing affiliates, processing commissions, and automating payouts.

The platform has:
- A **partner-facing portal** where affiliates log in, view their referral links, track earnings, and request payouts
- An **admin dashboard** where internal staff manage partners, approve commissions, configure programme settings, and process payouts
- A **public referral tracker** (a redirect endpoint) that records when a customer clicks an affiliate link
- A **checkout/payment flow** integrated with Stripe

---

## 2. Tech Stack

### Frontend + Backend (Unified — Monolith)

| Layer | Technology |
|---|---|
| **Framework** | Next.js 16 (React-based, full-stack) |
| **Language** | TypeScript |
| **Runtime** | Node.js 20 |
| **Rendering** | Mix of SSR (Server-Side Rendering) and client-side rendering |
| **Styling** | Tailwind CSS |
| **Auth** | Custom JWT-based authentication (no third-party auth provider) |

> **Key point:** This is a **monolith** — the frontend UI and the backend API live in the same codebase and run in the same process. There is no separate API server. Next.js handles both the rendered pages and all API routes (REST endpoints under `/api/*`).

---

### Database

| Detail | Value |
|---|---|
| **Database engine** | PostgreSQL 16 |
| **ORM** | Prisma (Node.js ORM — handles all DB queries) |
| **Connection style** | Standard TCP connection via `DATABASE_URL` env var |
| **Schema migrations** | `prisma db push` (schema-first, no migration files yet) |
| **Data stored** | Users, affiliates, referrals, commissions, payouts, audit logs, email logs, webhooks, programme settings |
| **Estimated DB size** | Small initially — under 1 GB for the first year |

---

### Containerisation

| Detail | Value |
|---|---|
| **Docker** | Yes — production `Dockerfile` is included in the repo |
| **Build type** | Next.js **standalone** output mode — self-contained `server.js` |
| **Base image** | `node:20-alpine` |
| **Port exposed** | `3000` |
| **User** | Non-root (UID 1001) |
| **Stateless?** | ✅ Yes — no local disk writes, all state in PostgreSQL |
| **Docker Compose** | Yes — local dev uses Compose (app + local Postgres) |

> The app container is **stateless and horizontally scalable**. Multiple instances can run behind a load balancer without any session-sharing mechanism because authentication is JWT-based (no server-side sessions).

---

### External Third-Party Services (Not Hosted by Us)

These are SaaS APIs the application calls over HTTPS. They are **not** hosted on our infrastructure.

| Service | What it does | Traffic direction |
|---|---|---|
| **Stripe** | Payment processing on the checkout page | Our app → Stripe API; Stripe → Our webhook endpoint |
| **Beam Wallet** | Affiliate payout processing | Our app → Beam Wallet API; Beam Wallet → Our webhook endpoint |

> **Webhook inbound traffic:** Both Stripe and Beam Wallet send `POST` requests to our server when events happen (e.g. payment succeeded, payout completed). Our HTTPS endpoints must be publicly reachable by these third parties.

---

### File Storage

- Currently, admin-uploaded files (marketing resources for affiliates) are **not** stored anywhere persistent — this needs a solution in production.
- We need an **object storage service** for file uploads.

---

## 3. Deployment & Build

### How the App is Built

```
1. npm install                          # Install dependencies
2. npx prisma generate                  # Generate Prisma database client from schema
3. npm run build (= next build)         # Compile Next.js → standalone output in .next/
4. docker build                         # Package into Docker image
5. docker push → image registry         # Store image
6. Deploy new container                 # Pull image and run
```

### Important: Build-time Environment Variables

Next.js "bakes" any variable prefixed with `NEXT_PUBLIC_` into the JavaScript bundle **at build time**. This means:

- `NEXT_PUBLIC_APP_URL` must be set **during the build**, not just at runtime
- All other secrets (database password, API keys, JWT secret) are **runtime-only** and do not need to be known at build time

### Current Hosting

Currently deployed on **Vercel** (a managed Next.js platform). We want to move to AWS for more control, compliance, and cost predictability.

---

## 4. Application Characteristics

### Traffic Pattern

| Metric | Estimate |
|---|---|
| Monthly active affiliates | ~500 (growing) |
| Daily page loads / API calls | ~50,000 requests/day |
| Peak concurrent users | ~200 |
| Spiky traffic? | Moderate — spikes when admin sends payout emails |

### Compute Profile

- **CPU:** Low to moderate. Most work is database queries and external API calls — not CPU-intensive computation.
- **Memory:** Moderate. Next.js SSR pages are rendered in-process.
- **I/O:** Primarily network I/O (DB queries, external API calls).
- **Long-running processes?** No. All requests are short-lived HTTP request/response cycles.

### Database Profile

- Read-heavy (affiliate dashboards, admin analytics)
- Writes occur on user actions (new referral, commission approval, payout creation)
- No real-time requirements (no WebSockets)
- Transactions used for atomic payout operations

### Health Check Endpoint

The app exposes `GET /api/health` which returns `HTTP 200` when the service is healthy. This can be used by load balancers and container orchestrators for health monitoring.

---

## 5. Security Requirements

- All traffic must be **HTTPS only** (HTTP should redirect to HTTPS)
- The database must be **not publicly accessible** — only reachable from the application server
- Secrets (DB password, JWT secret, API keys) must be stored securely and **injected as environment variables** at runtime — never hardcoded
- The existing security headers we enforce (already in our configuration):
  - `Strict-Transport-Security` (HSTS)
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy`
  - `X-XSS-Protection`

---

## 6. What We Need AWS to Recommend

Based on the above, please advise on the appropriate AWS services for:

| Need | Details |
|---|---|
| **Run the Docker container** | Stateless Next.js app, port 3000, needs to scale horizontally |
| **Store Docker images** | Private image registry to push/pull our app images |
| **PostgreSQL database** | Managed PostgreSQL 16, high availability, automated backups |
| **Store secrets/env vars** | Secure storage and injection of API keys, DB password, JWT secret |
| **HTTPS + SSL** | TLS termination, free certificate management |
| **DNS** | Domain routing to our application |
| **Load balancing** | Distribute traffic across multiple container instances |
| **File uploads** | Object storage for admin-uploaded files (PDFs, images) |
| **Logs & monitoring** | Centralised application logs, metrics, alerts |
| **CI/CD** | Automated build → image push → deploy on every code merge |
| **Outbound internet access** | Containers need to call Resend, Stripe, Beam Wallet over HTTPS |
| **Inbound webhooks** | Stripe and Beam Wallet POST to our HTTPS endpoints |

---

## 7. Key Constraints & Preferences

- **Single region** is fine for now (we don't need multi-region)
- **High availability** is required — the platform must survive a single instance failure without downtime
- **Managed services** preferred over self-managed (e.g. managed PostgreSQL over running our own Postgres on EC2)
- **Zero-downtime deployments** — we need rolling updates when we push new code
- **Scalable** — the system should handle 10x current traffic without a redesign
- We have a **Dockerfile ready** — so any container-based compute service will work

---

## 8. Repository & File References

For technical review, the following files in our repository are most relevant:

| File | What it contains |
|---|---|
| `Dockerfile` | Multi-stage production Docker build |
| `docker-compose.yml` | Local dev setup (app + local Postgres) |
| `next.config.js` | Next.js config — `output: 'standalone'` confirms standalone build |
| `prisma/schema.prisma` | Full database schema (all tables and relations) |
| `.env.example` | All environment variables the app needs (values are placeholders) |
| `package.json` | Node.js dependencies and build/start scripts |
| `vercel.json` | Current deployment config — shows security headers and routing |

---


