# Sprint 2 Plan (Parallel Tracks)

**Start Date**: Immediate
**Goal**: First Integrated Demo (App connects to Backend)

## 🏗️ Track A: Backend (NestJS)
**Owner**: Backend Dev
- [x] **Core API**: `POST /appointments`, `GET /slots`, `POST /slots/generate` (Sprint 1 Complete)
- [ ] **Auth API**: Implement Login/Register logic (Stub in S1, Real in S2)
- [ ] **Care Plan API**: CRUD for `CarePlan` and `CarePlanItem`.

## 📱 Track B: Patient App (Flutter)
**Owner**: Mobile Dev
- [ ] **Setup**: Initialize Flutter Project in `apps/patient-mobile` (if not already done).
- [ ] **Login Screen**: Simple phone number input.
- [ ] **Booking Screen**: 
  - Fetch Slots via `GET /booking/slots`.
  - Display Grid (White=OPEN, Gray=FULL).
  - Book via `POST /booking/appointments`.

## 🖥️ Track C: Admin Web (React)
**Owner**: Frontend Dev
- [ ] **Setup**: Initialize React Project in `apps/admin-web`.
- [ ] **Slot Manager**: UI to trigger `POST /slots/generate`.
- [ ] **Reservation List**: View booked appointments.

---

## 📅 Weekly Milestones
| Week | Focus | Deliverable |
|---|---|---|
| Week 3 | UI Skeleton & Connection | Booking flow works (App -> API -> DB) |
| Week 4 | Care Plan Integration | Surgery Care Home populated with mock data |
