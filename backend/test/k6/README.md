# How to Run "The Lucky 3" Concurrency Test

Since you have requested the report today, please follow these steps to execute the test logic locally.

## Prerequisites
1. **K6 Installed**: `brew install k6`
2. **Backend Running**: `npm run start:dev` (on port 3000)
3. **DB Ready**: PostgreSQL running and migrations applied.

## Step 1: Seed Test Data
Reset the specific test slot (`slot_test_lucky3`) to clean state (0 bookings).
```bash
# From root directory
npx ts-node backend/test/seed_lucky3.ts
```

## Step 2: Run Concurrency Attack
Simulate 10 users requesting the same slot simultaneously.
```bash
k6 run backend/test/k6/lucky3_test.js
```

## Step 3: Verify Results
Check the console output of k6.
- `http_reqs`: 10
- **Status 201 (Success)**: Should be exactly **3**
- **Status 409 (Fail)**: Should be exactly **7**

## Validation SQL
After test, verify DB integrity:
```sql
SELECT booked_count, status FROM "Slot" WHERE id = 'slot_test_lucky3';
-- Expected: booked_count = 3, status = 'FULL'

SELECT count(*) FROM "Appointment" WHERE slot_id = 'slot_test_lucky3';
-- Expected: 3
```
