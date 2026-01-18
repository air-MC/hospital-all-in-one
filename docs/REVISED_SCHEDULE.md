# Revised Project Schedule (Parallel Tracks)

Based on the request for a "Perfect App" with parallel development tracks, the schedule has been compressed and optimized.

## 🏃 Sprint 1: Backend Core Foundation (Weeks 1-2)
**Goal**: Establish the "Constitution" of the system (DB & Booking Engine).
- **Backend**: 
  - NestJS Setup + Prisma Migration.
  - **Booking Engine**: Atomic Transactions, Optimistic Locking, Idempotency.
  - **The Lucky 3 Test**: Prove concurrency safety (10 requests -> 3 successes).
  - Auth System (JWT).
- **Deliverables**: Swagger API Docs, Concurrency Test Report, DB Schema.

## 🚀 Sprint 2: Feature Integration (Weeks 3-4)
**Goal**: First End-to-End Demo (Booking Flow).
- **Track A (Backend)**: 
  - Implement Care Plan APIs.
  - Setup Push Notification Infrastructure (FCM).
- **Track B (Patient App - Flutter)**: 
  - Login/Auth Screens.
  - **Booking Slot UI**: Connect to live API.
  - Care Home Skeleton (Mock data -> Real data).
- **Track C (Admin Web - React)**: 
  - Operating Hours (ScheduleRule) Settings.
  - Slot Management (Batch Generation UI).
- **Milestone**: **Integrated Demo** (Admin sets slots -> Patient books slot).

## 💎 Sprint 3: Care & Surgery Logic (Weeks 5-6)
**Goal**: Complete the Surgery Care Lifecycle.
- **Track A (Backend)**: 
  - Surgery Case State Machine.
  - Batch Jobs (Auto-close PAST slots).
- **Track B (Patient App - Flutter)**: 
  - **Care Details**: Checklist, Meal View, Medication logic.
  - Push Notification Handling.
- **Track C (Admin Web - React)**: 
  - **Care Plan Editor**: Timeline Drag & Drop.
  - Surgery Confirmation Interface.
- **Milestone**: **Full Feature Demo** (Surgery Confirm -> Care Plan appears on App).

## 🛡️ Sprint 4: Stabilization & QA (Weeks 7-8)
**Goal**: Production Readiness.
- **QA**: End-to-End Testing, Edge Case validation.
- **Stress Test**: Re-run "The Lucky 3" with higher load (1000+ VUs).
- **Security**: Audit Log review, Penetration testing.
- **Launch Prep**: App Store/Play Store submission.

---

## Communication & Review
- **Weekly Demo**: Every Friday (Integrated flow).
- **Weekly Report**: API/DB Changes + Risk Assessment.
