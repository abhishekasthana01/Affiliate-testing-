# ☁️ Beam Affiliate — AWS Hosting Architecture

> **Audience:** AWS infrastructure / DevOps team  
> **Application:** Beam Affiliate — Affiliate Marketing Platform  
> **Stack:** Next.js 16 (Node.js 20), PostgreSQL 16, Docker (standalone build)

---

## 📋 Table of Contents

1. [Application Overview](#application-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Recommended AWS Services](#recommended-aws-services)
4. [Service-by-Service Breakdown](#service-by-service-breakdown)
5. [Environment Variables Required](#environment-variables-required)
6. [Docker & Container Details](#docker--container-details)
7. [Networking & Security Requirements](#networking--security-requirements)
8. [External Third-Party APIs](#external-third-party-apis)
9. [Estimated Traffic & Scaling Profile](#estimated-traffic--scaling-profile)
10. [Deployment Pipeline Recommendation](#deployment-pipeline-recommendation)
11. [Cost Optimisation Notes](#cost-optimisation-notes)

---

## Application Overview

Beam Affiliate is a **full-stack Next.js web application** that runs as a single containerised service. It handles:

- Server-side rendered pages (SSR) and API routes — all in one process
- Affiliate partner portal (`/affiliate/*`)
- Admin dashboard (`/admin/*`)
- Public referral tracking (`/r/[code]`)
- Checkout and payment processing (`/checkout`)
- REST API (`/api/*`) consumed by the frontend and external webhooks

The application is **stateless** — all state lives in the PostgreSQL database. The container itself does not write to disk (uploads go to external storage). This makes horizontal scaling straightforward.

**Build output:** `standalone` mode — a self-contained `server.js` + `node_modules` snapshot, ideal for Docker/container deployments.

---

## Architecture Diagram

```
                          ┌─────────────────────────────────────────┐
                          │              Internet / Users            │
                          └────────────────────┬────────────────────┘
                                               │ HTTPS
                          ┌────────────────────▼────────────────────┐
                          │         Route 53 (DNS)                  │
                          │    app.beamaffiliate.com → ALB          │
                          └────────────────────┬────────────────────┘
                                               │
                          ┌────────────────────▼────────────────────┐
                          │     Application Load Balancer (ALB)     │
                          │        ACM SSL Certificate              │
                          │         HTTP → HTTPS redirect           │
                          └──────────┬──────────────────┬───────────┘
                                     │                  │
                       ┌─────────────▼──┐        ┌──────▼─────────────┐
                       │  ECS Task (AZ-A)│        │  ECS Task (AZ-B)   │
                       │  Next.js :3000  │        │  Next.js :3000     │
                       │  (Fargate)      │        │  (Fargate)         │
                       └─────────────┬──┘        └──────┬─────────────┘
                                     │                  │
                          ┌──────────▼──────────────────▼───────────┐
                          │         Amazon RDS                       │
                          │   PostgreSQL 16 (Multi-AZ)              │
                          │   db.t4g.medium (or larger)             │
                          └─────────────────────────────────────────┘

   ┌──────────────────────────────────────────────────────────────────┐
   │                     Supporting Services                          │
   │                                                                  │
   │  ECR          → Docker image registry                           │
   │  Secrets Mgr  → JWT_SECRET, DB password, API keys              │
   │  CloudWatch   → Logs, metrics, alarms                          │
   │  S3           → (optional) File uploads / static assets        │
   │  CloudFront   → (optional) CDN for static assets               │
   │  CodePipeline → CI/CD pipeline (build → push ECR → deploy ECS) │
   └──────────────────────────────────────────────────────────────────┘

   External APIs (NOT hosted on AWS — managed by third parties):
   ┌──────────────────────────────────────────────────────────────────┐
   │  Resend API        → Transactional email delivery               │
   │  Stripe API        → Payment processing & webhooks             │
   │  Beam Wallet API   → Payout processing                         │
   └──────────────────────────────────────────────────────────────────┘
```

---

## Recommended AWS Services

| Service | Purpose | Tier / Config |
|---|---|---|
| **Amazon ECS (Fargate)** | Run the Next.js Docker container | `1 vCPU / 2 GB RAM` per task, min 2 tasks |
| **Amazon ECR** | Store Docker images | Private repository `beam-affiliate` |
| **Application Load Balancer** | HTTPS termination, routing, health checks | 1 ALB across 2 AZs |
| **Amazon RDS (PostgreSQL 16)** | Primary database | `db.t4g.medium`, Multi-AZ standby |
| **AWS Secrets Manager** | Store all secrets & env vars securely | One secret per environment |
| **Amazon Route 53** | DNS management | A-record alias to ALB |
| **AWS Certificate Manager (ACM)** | Free SSL/TLS cert | Attached to ALB listener |
| **Amazon CloudWatch** | Logs, metrics, alarms | Container log groups + custom metrics |
| **Amazon S3** | (Optional) File uploads from admin | Single private bucket |
| **Amazon CloudFront** | (Optional) CDN for Next.js static assets | In front of ALB or S3 |
| **AWS CodePipeline + CodeBuild** | CI/CD — build, push, deploy | Triggered on `main` branch push |
| **Amazon VPC** | Network isolation | Private subnets for ECS + RDS |

---

## Service-by-Service Breakdown

### 1. Amazon ECS with Fargate — Application Host

The app ships as a **Docker container** (see `Dockerfile` in repo root). It runs `node server.js` on port `3000`.

**Key configuration:**
```
Image:          <account>.dkr.ecr.<region>.amazonaws.com/beam-affiliate:latest
Port:           3000
Protocol:       TCP
CPU:            1024 (1 vCPU)
Memory:         2048 MB (2 GB)
Min tasks:      2  (for high availability)
Max tasks:      10 (auto-scaling upper bound)
Health check:   GET /api/health  →  expect HTTP 200
```

**Auto Scaling policy:**  
Scale out when average CPU > 60% for 3 minutes.  
Scale in when average CPU < 30% for 10 minutes.

**Task IAM Role** must allow:
- `secretsmanager:GetSecretValue` — to read environment variables
- `logs:CreateLogStream`, `logs:PutLogEvents` — for CloudWatch Logs
- `s3:PutObject`, `s3:GetObject` — only if file uploads to S3 are enabled

---

### 2. Amazon ECR — Docker Image Registry

Create a private repository:
```
Repository name:   beam-affiliate
Image tag:         latest  (also tag with Git SHA for rollback capability)
Lifecycle policy:  Keep last 10 images, expire older ones
```

Build and push triggered by CodeBuild on every merge to `main`.

---

### 3. Application Load Balancer (ALB)

- **Listener port 443 (HTTPS):** Forward to ECS target group on port 3000
- **Listener port 80 (HTTP):** Redirect to HTTPS (301)
- **Target group health check:** `GET /api/health`, healthy threshold: 2, unhealthy: 3
- **Stickiness:** Not required — the app is stateless (JWT auth, no server-side sessions)
- **Idle timeout:** 60 seconds (suitable for SSR pages)

---

### 4. Amazon RDS — PostgreSQL 16

The application uses **Prisma ORM** to connect to PostgreSQL. Connection is via the standard `DATABASE_URL` environment variable.

```
Engine:            PostgreSQL 16
Instance class:    db.t4g.medium  (start here, scale to db.t4g.large or db.r8g.large as needed)
Storage:           100 GB gp3, auto-scaling enabled up to 500 GB
Multi-AZ:          Yes (automatic failover standby)
Backups:           Automated daily snapshots, 7-day retention
Encryption:        Enabled (KMS)
Port:              5432
Publicly accessible: NO — private subnet only
Parameter group:   max_connections = 200 (Prisma uses a connection pool)
```

> ⚠️ **Important:** RDS must be in the **same VPC** as the ECS tasks, in private subnets. The ECS security group must be allowed inbound on port 5432 to the RDS security group. RDS must NOT be publicly accessible.

**Connection Pooling:**  
Prisma's default connection pool is used. If you anticipate >50 concurrent ECS tasks, consider adding **PgBouncer** (can run as a sidecar container in the same ECS task, or as a separate Fargate service).

---

### 5. AWS Secrets Manager — Environment Variables

Store all secrets in Secrets Manager and inject them as environment variables into the ECS task definition. Do **not** hardcode secrets in the task definition or image.

**Recommended secret structure — one JSON secret per environment:**

```
Secret name: beam-affiliate/production

{
  "DATABASE_URL":              "postgresql://beam_user:<password>@<rds-endpoint>:5432/beam",
  "JWT_SECRET":                "<min 32 char random string>",
  "NEXT_PUBLIC_APP_URL":       "https://app.beamaffiliate.com",
  "RESEND_API_KEY":            "re_...",
  "RESEND_FROM_EMAIL":         "Beam Affiliate <noreply@beamaffiliate.com>",
  "ADMIN_EMAILS":              "admin@yourdomain.com",
  "STRIPE_SECRET_KEY":         "sk_live_...",
  "STRIPE_PUBLISHABLE_KEY":    "pk_live_...",
  "STRIPE_WEBHOOK_SECRET":     "whsec_...",
  "BEAM_WALLET_API_URL":       "https://api.beamwallet.com/v1",
  "BEAM_WALLET_API_KEY":       "...",
  "BEAM_WALLET_MERCHANT_ID":   "...",
  "BEAM_WEBHOOK_SECRET":       "...",
  "BANK_WEBHOOK_SECRET":       "...",
  "CRON_SECRET":               "<random string>",
  "BANK_ACCOUNT_NAME":         "Beam Technologies Ltd",
  "BANK_IBAN":                 "...",
  "BANK_BIC":                  "..."
}
```

In the ECS task definition, reference each secret individually using `valueFrom`.

---

### 6. Amazon Route 53 — DNS

- Create a hosted zone for `beamaffiliate.com`
- Add an **A record (alias)** pointing `app.beamaffiliate.com` → ALB DNS name

---

### 7. AWS Certificate Manager (ACM)

- Request a certificate for `beamaffiliate.com` and `*.beamaffiliate.com`
- Validate via DNS (Route 53 — one-click validation)
- Attach to the ALB HTTPS listener

---

### 8. Amazon CloudWatch — Observability

**Log Groups to create:**
```
/ecs/beam-affiliate/app      →  Application logs (stdout from Next.js)
```

**Recommended Alarms:**
| Alarm | Threshold | Action |
|---|---|---|
| ECS CPU Utilisation > 80% | 5 min | SNS → Email alert |
| ECS Memory Utilisation > 85% | 5 min | SNS → Email alert |
| ALB 5xx errors > 10/min | 1 min | SNS → Email alert |
| ALB 4xx errors > 100/min | 5 min | SNS → Email alert |
| RDS CPU > 75% | 5 min | SNS → Email alert |
| RDS FreeStorageSpace < 20 GB | - | SNS → Email alert |
| ECS Task count < 2 | - | SNS → immediate alert |

---

### 9. Amazon S3 — File Storage (Optional)

The admin panel allows uploading marketing resources for affiliates. Currently these are stored locally. For production on AWS, use S3:

```
Bucket name:     beam-affiliate-uploads-prod
Access:          Private (no public access)
Region:          Same as ECS cluster
Versioning:      Enabled
Lifecycle:       Move to S3-IA after 90 days
```

If S3 is used, generate **pre-signed URLs** from the application to allow secure direct downloads. The ECS Task Role needs `s3:GetObject` and `s3:PutObject` on this bucket.

---

### 10. Amazon CloudFront — CDN (Optional but Recommended)

The Next.js build outputs static assets to `/_next/static/`. Serving these via CloudFront reduces origin load and improves global performance.

**Two setup options:**
- **Option A (Simple):** Put CloudFront in front of the ALB. All traffic (dynamic + static) goes through CloudFront. Cache `/_next/static/*` with TTL = 365 days (assets are content-hashed). Cache `/api/*` with TTL = 0.
- **Option B (Separate):** Serve static assets from S3 + CloudFront, and API/dynamic routes directly from ALB.

Option A is simpler to maintain and recommended to start.

---

## Environment Variables Required

These must be set in the ECS task (via Secrets Manager). All are **required** unless marked optional.

| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | ✅ Yes |
| `JWT_SECRET` | Min 32-char secret for signing auth tokens | ✅ Yes |
| `NEXT_PUBLIC_APP_URL` | Public URL of the app (e.g. `https://app.beamaffiliate.com`) | ✅ Yes |
| `RESEND_API_KEY` | Resend email service API key | ✅ Yes |
| `RESEND_FROM_EMAIL` | From address for all emails | ✅ Yes |
| `ADMIN_EMAILS` | Comma-separated admin email addresses | ✅ Yes |
| `STRIPE_SECRET_KEY` | Stripe server-side secret key | ✅ Yes |
| `STRIPE_PUBLISHABLE_KEY` | Stripe client-side public key | ✅ Yes |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret | ✅ Yes |
| `BEAM_WALLET_API_URL` | Beam Wallet base API URL | ✅ Yes |
| `BEAM_WALLET_API_KEY` | Beam Wallet API key | ✅ Yes |
| `BEAM_WALLET_MERCHANT_ID` | Beam Wallet merchant identifier | ✅ Yes |
| `BEAM_WEBHOOK_SECRET` | Beam Wallet webhook verification secret | ✅ Yes |
| `BANK_WEBHOOK_SECRET` | Bank webhook verification secret | ✅ Yes |
| `CRON_SECRET` | Secret to authenticate scheduled cron requests | ✅ Yes |
| `BANK_ACCOUNT_NAME` | Company bank account name (for payout instructions) | ⚠️ If bank payouts used |
| `BANK_IBAN` | Company IBAN | ⚠️ If bank payouts used |
| `BANK_BIC` | Company BIC/SWIFT code | ⚠️ If bank payouts used |
| `PUSH_PROVIDER_URL` | Push notification provider URL | ❌ Optional |

> **Note on `NEXT_PUBLIC_*` variables:** These are baked into the frontend JavaScript bundle **at build time** by Next.js. They must be set in the **CodeBuild environment** (during `npm run build`), not only at runtime in ECS. Set them in the CodeBuild project as environment variables as well.

---

## Docker & Container Details

The repo includes a production-ready multi-stage `Dockerfile`:

```
Stage 1 (deps):    npm ci + prisma schema copy
Stage 2 (builder): npx prisma generate + npm run build → standalone output
Stage 3 (runner):  Minimal Alpine image, non-root user (UID 1001), port 3000
```

**Build command for CodeBuild:**
```bash
# Log in to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin $ECR_URI

# Build (pass NEXT_PUBLIC vars as build-args if needed)
docker build \
  --build-arg NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
  -t beam-affiliate:$CODEBUILD_RESOLVED_SOURCE_VERSION \
  -t beam-affiliate:latest .

# Push both tags
docker push $ECR_URI/beam-affiliate:$CODEBUILD_RESOLVED_SOURCE_VERSION
docker push $ECR_URI/beam-affiliate:latest
```

**Container health check (ECS task definition):**
```json
{
  "command": ["CMD-SHELL", "curl -f http://localhost:3000/api/health || exit 1"],
  "interval": 30,
  "timeout": 5,
  "retries": 3,
  "startPeriod": 60
}
```

---

## Networking & Security Requirements

### VPC Layout (Recommended)

```
VPC CIDR: 10.0.0.0/16

Public Subnets  (ALB lives here):
  10.0.1.0/24  — AZ-a
  10.0.2.0/24  — AZ-b

Private Subnets (ECS + RDS live here):
  10.0.11.0/24 — AZ-a
  10.0.12.0/24 — AZ-b
```

### Security Groups

| Group | Inbound | Outbound |
|---|---|---|
| `sg-alb` | 443 from 0.0.0.0/0, 80 from 0.0.0.0/0 | Port 3000 to `sg-ecs` |
| `sg-ecs` | Port 3000 from `sg-alb` only | 443 to 0.0.0.0/0 (external APIs), 5432 to `sg-rds` |
| `sg-rds` | Port 5432 from `sg-ecs` only | None |

### NAT Gateway

ECS tasks in private subnets need a **NAT Gateway** in each public subnet to reach external APIs (Resend, Stripe, Beam Wallet).

### Webhook Endpoints

Stripe and Beam Wallet POST to these public endpoints. The ALB handles TLS termination, so no special routing is needed — these URLs just need to be publicly reachable over HTTPS:

```
Stripe webhooks:      POST https://app.beamaffiliate.com/api/webhooks/stripe
Beam Wallet webhooks: POST https://app.beamaffiliate.com/api/webhooks/beam
```

Register these URLs in the respective third-party dashboards after deploying.

---

## External Third-Party APIs

These are **not hosted on AWS** — they are external SaaS services. The ECS tasks make outbound HTTPS calls to them. Ensure outbound 443 is allowed from the ECS security group.

| Service | URL | Purpose |
|---|---|---|
| **Resend** | `https://api.resend.com` | Transactional email (registration OTPs, commission notifications, payout emails) |
| **Stripe** | `https://api.stripe.com` | Checkout payment processing |
| **Beam Wallet** | `https://api.beamwallet.com/v1` | Affiliate payout processing |

---

## Estimated Traffic & Scaling Profile

| Metric | Estimate (initial) | Notes |
|---|---|---|
| Monthly active affiliates | ~500 | Growing |
| Daily API requests | ~50,000 | Mix of SSR page loads + API calls |
| Peak concurrent users | ~200 | Admin + affiliate portals |
| Database connections | ~50 concurrent | Prisma default pool |
| Container count at baseline | 2 tasks | One per AZ |
| Container count at peak | 4–6 tasks | Auto-scaling |

**Starting instance recommendation:** `1 vCPU / 2 GB` Fargate tasks. Scale to `2 vCPU / 4 GB` if SSR response times degrade under load.

---

## Deployment Pipeline Recommendation

### Overview

```
GitHub (main branch push)
         ↓
    CodePipeline triggered
         ↓
    CodeBuild Stage 1: Test + Build
      - npm install
      - npx prisma generate
      - npm run build (next build)
      - docker build + push to ECR
         ↓
    CodeBuild Stage 2: Deploy
      - aws ecs update-service --force-new-deployment
         ↓
    ECS rolls out new tasks (rolling update, 0 downtime)
         ↓
    ALB health check passes → old tasks drained and stopped
```

### ECS Deployment Config (Zero-Downtime Rolling Update)

```
Minimum healthy percent:   100%   (keeps 2 tasks alive during deploy)
Maximum percent:           200%   (allows 2 new tasks to launch before old ones stop)
```

### Database Migrations

Prisma Migrate is not set up (the project uses `prisma db push` for schema sync). Before deploying a new image that has schema changes, run:

```bash
# One-off migration task (run as ECS one-time task before service update)
npx prisma db push --skip-generate
```

Recommend adding this as a **pre-deploy CodeBuild step** that runs a temporary ECS task with the migration command before rolling out the new application version.

---

## Cost Optimisation Notes

| Suggestion | Estimated Saving |
|---|---|
| Use **Fargate Spot** for non-critical tasks (e.g. background jobs) | ~70% cheaper than standard Fargate |
| Use **RDS t4g (Graviton2)** instance class | ~20% cheaper than x86 equivalent |
| Enable **S3 Intelligent-Tiering** for uploads bucket | Automatic cost optimisation |
| Use **Savings Plans** for ECS Fargate once traffic is predictable | 20–40% discount |
| Set **CloudWatch Log retention** to 30 days (not indefinite) | Reduces log storage cost |
| Enable **RDS storage auto-scaling** with a ceiling | Avoids over-provisioning |

---

## Quick Reference — Resources to Create

- [ ] VPC with 2 public + 2 private subnets across 2 AZs
- [ ] NAT Gateway (1 per AZ for HA, or 1 shared for cost saving)
- [ ] Security Groups: `sg-alb`, `sg-ecs`, `sg-rds`
- [ ] ECR repository: `beam-affiliate`
- [ ] ECS Cluster (Fargate): `beam-affiliate-cluster`
- [ ] ECS Task Definition with container definition + secrets injection
- [ ] ECS Service with ALB target group + auto-scaling
- [ ] Application Load Balancer + HTTPS listener (port 443) + HTTP redirect (port 80)
- [ ] ACM Certificate for `beamaffiliate.com` / `*.beamaffiliate.com`
- [ ] RDS PostgreSQL 16 instance (Multi-AZ, private subnet)
- [ ] Secrets Manager secret: `beam-affiliate/production`
- [ ] Route 53 hosted zone + A-record alias to ALB
- [ ] CloudWatch Log Group: `/ecs/beam-affiliate/app`
- [ ] CloudWatch Alarms + SNS topic for alerts
- [ ] CodePipeline + CodeBuild project for CI/CD
- [ ] S3 bucket for uploads (if file upload feature is used)
- [ ] CloudFront distribution (optional, for CDN)

---

*Document prepared by the Beam Affiliate development team — May 2026*  
*For questions, contact the development team before provisioning.*
