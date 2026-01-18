# Project Status Dashboard

## 🟢 Sprint 1: Backend Core & Booking (COMPLETED)
**Period**: 2026.01.17 ~ 2026.01.17
- [x] **Architecture**: NestJS Monorepo + Prisma + PostgreSQL (Docker) setup.
- [x] **Database**: ERD Finalized, Migration applied.
- [x] **Booking Engine**: 
  - Atomic Transactions implemented.
  - "The Lucky 3" Concurrency Test passed.
  - Idempotency & Audit Log logic included.
- [x] **Client MVP**:
  - Admin Web: Slot Generation UI.
  - Patient Web: Booking UI.

---

## 🚀 Sprint 2: Surgery & Care (ACTIVE)
**Period**: 2026.01.17 ~ (2 Weeks)
**Goal**: Implement the "Hospital All-in-One" core experience (Surgery -> Admission -> Discharge).

### Milestone 2.1: Surgery Management (Backend)
- [x] **API**: `POST /surgeries` (Register Surgery)
- [x] **API**: `POST /care-plans/:id/items` (Generate daily checklist)
- [x] **Logic**: Care Plan Template Engine (Standard Standard Procedure)

### Milestone 2.2: Admin Web - Surgery Console
- [x] **UI**: Patient Search & Surgery Scheduling.
- [x] **UI**: Care Plan Timeline Editor (Drag & Drop Implemented).

### Milestone 2.3: Patient App - Care Home
- [x] **UI**: D-Day Counter (Surgery/Discharge) - Implemented with Animation.
- [x] **UI**: Daily "To-Do" List (Medication, Fasting) - Grouping & Check logic applied.
