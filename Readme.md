# OPD Token Allocation Engine

A production-ready hospital outpatient department (OPD) token management system with intelligent priority-based allocation, dynamic reallocation, and elastic capacity management.

## Features

- **Priority-based allocation** — EMERGENCY > PAID > FOLLOWUP > ONLINE > WALKIN
- **Dynamic reallocation** — Automatic patient reassignment on cancellations and no-shows
- **Emergency displacement** — Critical cases can displace lower-priority patients
- **Capacity management** — Hard slot limits with configurable paid/followup caps
- **Idempotency** — Safe handling of duplicate requests
- **Audit logging** — Complete operation tracking for compliance
- **ACID transactions** — Guaranteed consistency under concurrent load

## Technology Stack

- **Runtime:** Node.js with TypeScript
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Architecture:** REST API with transactional business logic

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL 14+

## Quick Start

### 1. Clone and Install

```bash
git clone <https://github.com/aniket1251/opd-token-allocation-engine.git>
cd opd-token-allocation-engine
npm install
```

### 2. Configure Environment

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/opdTokenAllocatorDB"
PORT=8000
NODE_ENV=development || production
```

Replace `username`, `password`, and database name with your PostgreSQL credentials.

### 3. Initialize Database

```bash
# Generate Prisma Client if needed
npx prisma generate

# Run migrations to create tables
npx prisma migrate dev --name init
```

### 4. Start Server

**Development mode:**

```bash
npm run dev
```

**Production mode:**

```bash
npm run build
npm start
```

Server will start on `http://localhost:8000`

### 5. Run Simulation

Test the complete system with a realistic OPD day scenario:

```bash
npm run simulate
```

This demonstrates all features including emergencies, cancellations, reallocation, and edge cases with 6 doctors and multiple patient scenarios.

**📖 Complete Simulation Results:** See **[SimulationResults.pdf](https://drive.google.com/file/d/1hYJNr1_GCbmAhmwI8Jt47FnSgxOtgViH/view?usp=sharing)**

## Project Structure

```
opd-token-allocation-engine/
├── src/
│   ├── config/           # Database and environment configuration
│   ├── controllers/      # HTTP request handlers
│   ├── middlewares/      # Validation and error handling
│   ├── routes/           # API route definitions
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Business logic (allocation engine, helpers)
│   ├── simulation/       # OPD day simulation
│   └── index.ts          # Application entry point
├── prisma/
│   └── schema.prisma     # Database schema
└── package.json
```

## API Overview

### Base URL

```
http://localhost:8000
```

### Core Resources

**Doctors**

- `POST /doctors` — Create doctor
- `GET /doctors` — List all doctors
- `GET /doctors/:id` — Get doctor details

**Slots**

- `POST /slots` — Create time slot
- `GET /slots/:id` — Get slot details
- `GET /slots/doctor/:doctorId` — List doctor's slots

**Tokens**

- `POST /tokens` — Create patient token
- `GET /tokens/:id` — Get token details
- `GET /tokens/doctor/:doctorId` — List doctor's tokens
- `PATCH /tokens/:id/cancel` — Cancel token (auto-reallocation)
- `PATCH /tokens/:id/no-show` — Mark as no-show (auto-reallocation)
- `PATCH /tokens/:id/complete` — Mark as completed
- `POST /tokens/doctor/:doctorId/expire` — Expire waiting tokens (end-of-day)

**📖 Complete API documentation:** See [Api_Documentation.md](ApiDocs.md)

## Key Design Decisions

### Why PostgreSQL with Transactions?

Consistency matters more than raw speed in hospital systems. ACID transactions guarantee that slot capacity is never exceeded even under concurrent cancellations, emergency insertions, and reallocations.

### Why Strict Priority Ordering?

Clinical urgency and revenue commitments require predictable prioritization. Configurable caps (paidCap, followUpCap) prevent priority abuse while maintaining fairness.

### Why Slot-Based Scheduling?

Fixed time slots (9-10 AM) rather than continuous scheduling simplifies capacity management and matches real hospital OPD operations.

**📖 Complete Documentation:** See [Documentation.md](Documentation.md)

## System Requirements

- **Minimum:** 2 CPU cores, 2GB RAM
- **Recommended:** 4 CPU cores, 4GB RAM
- **Database:** PostgreSQL 14+ with 10GB storage
- **Network:** Handles 50-100 concurrent API requests

## License

This project is created for educational purposes.

## Documentation

- **[Api_documentation.md](ApiDocs.md)** — Complete API reference with request/response examples for all 18 endpoints
- **[Documentation.md](Documentation.md)** — Technical architecture, design principles, trade-offs, and edge case handling
- **[SimulationResults.pdf](https://drive.google.com/file/d/1hYJNr1_GCbmAhmwI8Jt47FnSgxOtgViH/view?usp=sharing)** — Comprehensive real world Simulation of 1 day at OPD with 6 doctors and edge case handling

---

**Built with ❤️ for efficient hospital OPD management**