# Hireloop - Engineering Talent Placement Platform

Hireloop is a full-stack talent placement and candidate relationship platform built for technical recruiting agencies, hiring managers, and engineering candidates. It combines multi-tenant workspace isolation, candidate skill-matrix indexing, AI-powered job description matching, candidate self-service portals, and external client review shortlists.

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
  - [High-Level Data Flow](#high-level-data-flow)
  - [Directory Structure](#directory-structure)
  - [Database Schema](#database-schema)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
  - [1. Clone and Install](#1-clone-and-install)
  - [2. Environment Configuration](#2-environment-configuration)
  - [3. Database Initialization and Seeding](#3-database-initialization-and-seeding)
  - [4. Start Local Development](#4-start-local-development)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [Security Model](#security-model)
- [API Route Reference](#api-route-reference)
- [Production Deployment](#production-deployment)
  - [Database Strategy: PGlite vs Hosted PostgreSQL](#database-strategy-pglite-vs-hosted-postgresql)
  - [Deploying to Vercel](#deploying-to-vercel)
  - [Deploying via Docker / Node Server](#deploying-via-docker--node-server)
- [Current System Limitations and Honest Considerations](#current-system-limitations-and-honest-considerations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Overview

Hireloop automates the talent pipeline lifecycle across three distinct stakeholder surfaces:

1. **Recruiter & Agency Workspace**: Multi-tenant team hub for sourcing, filtering candidates by granular framework proficiencies, tracking active client placements, scheduling interviews, reviewing audit logs, and managing team permissions.
2. **Candidate Portal**: Passwordless self-service portal where engineers manage their availability schedule, update hourly rates, upload resumes for automated skill parsing, and track scheduled interviews.
3. **Client Review Shortlist**: External, token-authenticated public review links where hiring managers evaluate curated candidate profiles, submit feedback, request interviews, or make hiring decisions without requiring an account.

---

## Key Features

- **Multi-Tenant Workspaces**: Role-based access control (Owner, Admin, Member) with workspace switcher, invitation tokens, and member management.
- **Skill Matrix & Framework Indexing**: Structured candidate skill taxonomy tracking proficiency levels (`learning`, `working`, `strong`, `expert`), years of experience, and last-used timestamps.
- **AI Matching & Heuristic Fallback**: Evaluates candidate fit against arbitrary job descriptions using Google Gemini 1.5 Flash. If no API key is supplied, a deterministic heuristic scoring engine calculates relevancy automatically.
- **Automated Resume Parsing**: Reads PDF resumes via `pdf-parse` and uses LLM/regex extraction to populate candidate skill profiles.
- **Passwordless Candidate Access**: Secure, time-limited magic links and tokenized invitation emails for candidate portal onboarding.
- **Client Shortlist Sharing**: Shareable review links with custom expiry windows, client contact tracking, and instant action buttons.
- **Audit Trails**: Non-blocking database logging tracking entity updates with field-level before/after JSON diffs while sanitizing sensitive credentials.
- **Real-Time Notification Streaming**: Server-Sent Events (SSE) stream delivering real-time notification badges and activity feeds.
- **CSV Data Exports**: One-click data exports for candidates, placement pipelines, and audit trails.

---

## System Architecture

### High-Level Data Flow

```
[Candidate / Recruiter / Client]
               |
               v
     +-------------------+
     | Next.js App Router|  (Route Handlers & Server Components)
     +-------------------+
        |        |       |
        |        |       +--> Server-Sent Events (SSE) Live Notifications
        |        |
        |        +----------> Google Gemini 1.5 Flash (AI Matching & Resume Parsing)
        |                     [Fallback: Deterministic Heuristic Matcher]
        v
     +-------------------+
     | Drizzle ORM       |
     +-------------------+
        |
        +---> [Development] Embedded PGlite (WASM PostgreSQL on Disk)
        |
        +---> [Production]  Hosted PostgreSQL (Neon, Supabase, AWS RDS)
```

### Directory Structure

```
.
├── src/
│   ├── app/
│   │   ├── (app)/                   # Recruiter workspace layout & views
│   │   │   ├── availability/        # Talent availability matrix
│   │   │   ├── candidates/          # Candidate catalog, search, and detail views
│   │   │   ├── clients/             # Client accounts and contacts
│   │   │   ├── dashboard/           # Pipeline metrics, analytics, recent activity
│   │   │   ├── interviews/          # Interview schedule & outcome logging
│   │   │   ├── placements/          # Kanban placement milestone tracker
│   │   │   ├── settings/            # Organization, team members, audit logs
│   │   │   └── skills/              # Skill definition taxonomy
│   │   ├── (candidate)/             # Candidate portal layout & views
│   │   │   └── candidate/           # Dashboard, profile editor, availability editor
│   │   ├── (client)/                # External client review interface
│   │   │   └── shortlist/[token]/   # Tokenized candidate shortlist review
│   │   ├── api/                     # REST Route Handlers
│   │   │   ├── audit-logs/          # Audit querying & CSV export
│   │   │   ├── auth/                # Session login, logout, magic link, seed
│   │   │   ├── availability/        # Availability CRUD
│   │   │   ├── candidates/          # Candidate CRUD, resume upload, AI match
│   │   │   ├── clients/             # Client management
│   │   │   ├── files/               # Local file serving endpoint
│   │   │   ├── health/              # System healthcheck endpoint
│   │   │   ├── interviews/          # Interview CRUD
│   │   │   ├── notifications/       # Notification read status & SSE stream
│   │   │   ├── org/                 # Workspace creation, invites, switching
│   │   │   ├── placements/          # Placement pipeline CRUD & CSV export
│   │   │   ├── shortlists/          # Shortlist token generation & review
│   │   │   ├── skills/              # Skill taxonomy & matrix updates
│   │   │   └── stats/               # Workspace summary aggregation
│   │   ├── invite/                  # Token resolution for candidate & team invites
│   │   ├── login/                   # Authentication view
│   │   ├── magic-link/              # Magic link validation & session exchange
│   │   ├── globals.css              # Design tokens and styling variables
│   │   └── layout.tsx               # Root document wrapper
│   ├── components/                  # Shared UI primitives and visualizations
│   │   ├── CandidateCard.tsx        # Responsive candidate profile card
│   │   ├── FilterPanel.tsx          # Multi-criteria search filter sidebar
│   │   ├── Sidebar.tsx              # Workspace navigation & org switcher
│   │   ├── ThreeHero.tsx            # Three.js interactive canvas visualization
│   │   ├── Topbar.tsx               # Global search bar, notifications, user menu
│   │   └── ...                      # Modals, chips, toasts, avatars
│   ├── db/
│   │   ├── index.ts                 # Dual-mode database client (PGlite / pg.Pool)
│   │   └── schema.ts                # Drizzle ORM relational table schemas
│   └── lib/
│       ├── audit.ts                 # Sanitized non-blocking audit logging & diffing
│       ├── auth.ts                  # Password hashing, sessions, magic tokens
│       ├── email.ts                 # Nodemailer email dispatcher + console fallbacks
│       ├── format.ts                # Date, currency, seniority formatters
│       ├── matching.ts              # Gemini AI + Heuristic scoring engine
│       ├── notify.ts                # In-app notification dispatcher
│       ├── org.ts                   # Organization multi-tenancy context
│       ├── resume-parser.ts         # PDF text extraction & skill normalizer
│       ├── seed.ts                  # Realistic database seed generator
│       └── storage.ts               # Local disk & S3 storage abstraction
├── uploads/                         # Local storage directory for uploaded resumes
├── drizzle.config.json              # Drizzle configuration
├── eslint.config.mjs                # ESLint configuration
├── next.config.ts                   # Next.js configuration
├── package.json                     # Dependencies and scripts
└── tsconfig.json                    # TypeScript compiler configuration
```

### Database Schema

The relational database is defined with Drizzle ORM in `src/db/schema.ts`:

- `users`: Core authentication identity, role (`recruiter`, `candidate`, `admin`), password hash (`scrypt`).
- `sessions`: Active user sessions with SHA-256 token hashing and expiration dates.
- `organizations`: Multi-tenant workspace entities with plans and branding metadata.
- `org_members`: User-to-organization mapping with workspace roles (`owner`, `admin`, `member`).
- `org_invites`: Pending team invitation tokens with expiration windows.
- `candidates`: Candidate profiles, hourly rates, location, timezone overlap, bio, portfolio links, invite tokens.
- `skill_categories` & `skill_definitions`: Normalized taxonomy of frameworks, languages, databases, and DevOps tools.
- `skill_matrices`: Candidate proficiency mapping (`learning`, `working`, `strong`, `expert`), years of experience, and notes.
- `availabilities`: Weekly capacity status (`available`, `limited`, `booked`, `on-leave`) and preferred start timelines.
- `clients` & `client_contacts`: Client accounts, industries, and associated hiring managers.
- `placements`: Placement pipeline milestones (`sourced`, `screening`, `submitted`, `interviewing`, `offer`, `placed`, `archived`) and contract values.
- `shortlists`: Tokenized candidate review links shared with external clients.
- `interviews`: Scheduled rounds (`screen`, `technical`, `system-design`, `behavioral`, `final`), interviewers, scores, and feedback.
- `resumes`: Uploaded PDF metadata, parse status, and extracted skill arrays.
- `notifications`: User notification queue with read flags and deep links.
- `audit_logs`: Activity ledger recording actor IDs, actions, target entities, metadata, and before/after JSONB diffs.

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | Server Components, Route Handlers, Client Views |
| **Language** | TypeScript 5.9 | Static type checking and interface contracts |
| **UI Library** | React 19 | Component hierarchy and hooks |
| **Styling** | Tailwind CSS 4 + PostCSS | Utility-first design tokens and CSS variables |
| **ORM** | Drizzle ORM | Type-safe SQL query generation and relation mapping |
| **Database** | PostgreSQL / @electric-sql/pglite | Production SQL storage / Zero-setup embedded development database |
| **AI Integration** | @google/generative-ai (Gemini 1.5 Flash) | Resume skill extraction and candidate-to-job matching |
| **Visualizations** | Three.js | Interactive 3D particle and node connection hero canvas |
| **File Processing**| pdf-parse | PDF resume text extraction |
| **Email** | Nodemailer | Transactional email delivery with dev-mode console logging |
| **Cryptography** | Node.js `node:crypto` | `scryptSync`, `timingSafeEqual`, SHA-256 token hashing |

---

## Prerequisites

- **Node.js**: Version 20.x or higher
- **npm** (or **pnpm** / **yarn**)
- **Operating System**: macOS, Linux, or Windows
- *(Optional)* A Google Gemini API Key (`GEMINI_API_KEY`) for AI matching and resume parsing.
- *(Optional)* A PostgreSQL instance (Neon, Supabase, RDS) if not using the default embedded PGlite.

---

## Getting Started

### 1. Clone and Install

```bash
git clone https://github.com/Sehaan-1/engineering-talent-placement-platform.git
cd engineering-talent-placement-platform
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# General
APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Leave empty to use zero-setup local embedded PGlite)
DATABASE_URL=

# AI Provider (Optional: Heuristic fallback is used if omitted)
GEMINI_API_KEY=

# Email SMTP (Optional: Falls back to terminal console preview in development)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_SECURE=false
SMTP_FROM="Hireloop Talent Network <noreply@hireloop.dev>"

# File Storage (local | s3 | r2)
STORAGE_PROVIDER=local
```

### 3. Database Initialization and Seeding

The platform includes an automated database seeder that creates sample recruiter accounts, candidates, skill matrices, placements, interviews, clients, and audit trails.

You can trigger the seed by starting the app and visiting the login page, or via a direct HTTP POST request:

```bash
curl -X POST http://localhost:3000/api/auth/seed
```

**Default Demo Credentials:**

| Role | Email | Password |
| :--- | :--- | :--- |
| **Recruiter / Admin** | `alex.chen@hireloop.dev` | `demo1234` |
| **Recruiter** | `sarah.kim@hireloop.dev` | `demo1234` |
| **Candidate (Passwordless)** | `elena.rostova@example.com` | Use Candidate Portal magic link or demo sign-in |

### 4. Start Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection URI | No (uses PGlite if blank) | `undefined` |
| `APP_URL` | Application root URL for email links | No | `http://localhost:3000` |
| `GEMINI_API_KEY` | Google AI Studio API key | No (uses heuristic engine) | `undefined` |
| `SMTP_HOST` | SMTP server host | No (logs emails to console) | `undefined` |
| `SMTP_PORT` | SMTP server port | No | `587` |
| `SMTP_USER` | SMTP username | No | `undefined` |
| `SMTP_PASS` | SMTP password | No | `undefined` |
| `SMTP_FROM` | Sender address in headers | No | `"Hireloop <noreply@hireloop.dev>"` |
| `STORAGE_PROVIDER` | Storage backend (`local`, `s3`, `r2`) | No | `local` |
| `S3_BUCKET` | Cloud storage bucket name | Only if `STORAGE_PROVIDER=s3` | `undefined` |
| `S3_PUBLIC_DOMAIN` | CDN domain for stored files | Only if using public CDN | `undefined` |

---

## Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts Next.js development server with Turbopack |
| `npm run build` | Compiles production bundle and executes static optimization |
| `npm run start` | Launches compiled Next.js production server |
| `npm run typecheck` | Runs TypeScript compiler in `--noEmit` mode to verify types |
| `npm run lint` | Runs ESLint across all JavaScript/TypeScript source files |

---

## Security Model

1. **Authentication & Session Tokens**:
   - Passwords are salted with 16 random bytes and hashed using Node's `scryptSync(password, salt, 64)`.
   - Verification uses constant-time `timingSafeEqual` to eliminate timing attack vectors.
   - Session tokens are stored in the database as SHA-256 digests (`tokenFingerprint`). Stolen database snapshots do not immediately grant valid session cookies.
   - Session cookies are set with `HttpOnly`, `SameSite=Lax`, and `Path=/`.
2. **Multi-Tenant Scoping**:
   - Queries and mutations are verified against `org_members` to ensure recruiters cannot access or mutate candidates, placements, or audit logs outside their active workspace.
   - Orphan prevention checks ensure an organization cannot delete or demote its last remaining owner.
3. **Audit Trails & Credential Sanitization**:
   - The audit log engine strips password hashes, access tokens, and invitation secrets before computing before/after JSON diffs.
4. **Token Expiration & One-Time Use**:
   - Candidate invitation links (72-hour TTL) and magic link sign-ins (15-minute TTL) are single-use; the token is cleared from the database immediately upon consumption.

---

## API Route Reference

### Authentication & Tenant Context
- `POST /api/auth/login`: Authenticate with email/password and issue session cookie.
- `POST /api/auth/logout`: Invalidate session record and clear cookie.
- `POST /api/auth/magic-link`: Generate and dispatch passwordless candidate sign-in email.
- `GET  /api/auth/me`: Return current authenticated user and linked candidate record.
- `POST /api/auth/seed`: Initialize database tables and seed demo records.

### Organization Management
- `GET  /api/org`: Fetch current workspace details and member list.
- `POST /api/org/create`: Create a new organization and assign caller as owner.
- `POST /api/org/switch`: Set active workspace cookie.
- `POST /api/org/invites`: Invite a new team member via email with role assignment.
- `DELETE /api/org/members/[id]`: Remove a team member (protected by orphan check).

### Candidate Network
- `GET  /api/candidates`: List candidates with keyword search, seniority, rate, and skill filtering.
- `POST /api/candidates`: Create a new candidate record.
- `GET  /api/candidates/[id]`: Retrieve full candidate profile, skills, availability, and placements.
- `PATCH /api/candidates/[id]`: Update candidate details.
- `DELETE /api/candidates/[id]`: Delete candidate record.
- `POST /api/candidates/[id]/invite`: Issue a candidate portal onboarding invitation link.
- `POST /api/candidates/[id]/resume`: Upload and trigger PDF resume parsing.
- `POST /api/candidates/match`: Score and rank candidate network against a job description.
- `GET  /api/candidates/export`: Download full candidate list as a CSV file.

### Placements & Shortlists
- `GET  /api/placements`: List placement milestones for active workspace.
- `POST /api/placements`: Create a placement entry.
- `PATCH /api/placements/[id]`: Update placement milestone status or contract value.
- `GET  /api/placements/export`: Download placement pipeline report as a CSV file.
- `POST /api/shortlists`: Generate a tokenized client candidate review link.
- `GET  /api/shortlists/[token]`: Public client endpoint to retrieve shortlist candidates.

### Interviews & Availability
- `GET  /api/interviews`: Retrieve interview calendar entries.
- `POST /api/interviews`: Schedule an interview round with outcome tracking.
- `PATCH /api/interviews/[id]`: Update interview status, score, or feedback notes.
- `GET  /api/availability`: Fetch weekly candidate availability grid.
- `PATCH /api/availability/[id]`: Update hours, availability status, or preferred start.

### Notifications & System
- `GET  /api/notifications`: Retrieve latest in-app notifications.
- `PATCH /api/notifications/[id]`: Mark notification as read.
- `GET  /api/notifications/stream`: Server-Sent Events (SSE) live notification connection.
- `GET  /api/health`: Database and service health check.

---

## Production Deployment

### Database Strategy: PGlite vs Hosted PostgreSQL

- **Development**: The application defaults to `@electric-sql/pglite`, an embedded WebAssembly PostgreSQL engine that writes directly to `./.pglite_data`. This enables zero-configuration local development without installing Docker or external database servers.
- **Production Requirement**: In distributed production environments (such as Vercel, AWS ECS, or Google Cloud Run), multiple serverless instances cannot share a local filesystem. You **must** set the `DATABASE_URL` environment variable to a managed PostgreSQL database (such as Neon, Supabase, Aiven, or AWS RDS). When `DATABASE_URL` is set, the application automatically switches to `node-postgres` connection pooling (`pg.Pool`).

### Deploying to Vercel

1. Push your repository to GitHub or GitLab.
2. Import the project into Vercel.
3. Configure the Environment Variables in the Vercel Dashboard:
   - `DATABASE_URL`: Your hosted PostgreSQL connection string (e.g. Neon or Supabase).
   - `APP_URL`: Your production domain (e.g. `https://hireloop.yourdomain.com`).
   - `GEMINI_API_KEY`: Your Google AI Studio API key.
   - `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`: Your production SMTP credentials.
4. Deploy.

### Deploying via Docker / Node Server

Create a standard Node.js production container:

```bash
# Build production bundle
npm run build

# Start production server
NODE_ENV=production npm run start
```

---

## Current System Limitations and Honest Considerations

To provide complete architectural transparency, the following items represent areas where high-scale production systems may require further enhancements:

1. **In-Band Processing for AI & Resumes**:
   - Resume parsing and Gemini job description matching execute synchronously within Route Handlers. On large documents or slow network responses, this can consume 5 to 15 seconds of execution time. High-volume environments should offload these tasks to an asynchronous queue (such as BullMQ, Inngest, or AWS SQS).
2. **Public Endpoint Rate Limiting**:
   - Public authentication endpoints (`/api/auth/login`, `/api/auth/magic-link`) and the AI matching endpoint do not have IP-based rate limiting. Production deployments should enforce rate limiting (via Upstash Redis or reverse-proxy middleware) to mitigate brute-force and resource exhaustion attempts.
3. **Database Migrations in CI/CD**:
   - The platform uses Drizzle schema synchronization at runtime. For enterprise release pipelines, automated migration generation (`drizzle-kit generate`) should be integrated into your CI/CD workflow.
4. **Seed Route Hardening**:
   - The `/api/auth/seed` endpoint is enabled by default. In a public production deployment, access to this endpoint should be restricted using a secret header token or disabled when `NODE_ENV === "production"`.

---

## Troubleshooting

### 1. Embedded Database File Lock Error
- **Symptom**: `RuntimeError: Aborted()` or `pglite database lock error` when running multiple concurrent processes.
- **Cause**: PGlite uses file-level locking on `./.pglite_data`. Running multiple dev servers or build workers simultaneously against the same directory can cause lock conflicts.
- **Solution**: Stop all running dev servers or configure a hosted PostgreSQL database via `DATABASE_URL`.

### 2. Missing Resume Text Extraction
- **Symptom**: Resumes upload successfully, but no skills are extracted.
- **Cause**: Scanned image-based PDFs without embedded text layers cannot be read by `pdf-parse` without OCR.
- **Solution**: Upload standard text-based PDF resumes, or integrate an OCR service (such as Google Cloud Document AI or AWS Textract) for scanned documents.

### 3. Emails Not Delivering
- **Symptom**: Candidate invites or magic links are not arriving in inboxes.
- **Cause**: `SMTP_HOST` is not configured.
- **Behavior**: When SMTP is not configured, Hireloop automatically prints the full email content and clickable magic link to the server console log for seamless local testing.
- **Solution**: Supply valid SMTP credentials in `.env` to send real emails over the network.

---

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for details.
