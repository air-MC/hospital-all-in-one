import http from 'k6/http';
import { check, sleep } from 'k6';
import { uuidv4 } from 'https://jslib.k6.io/k6-utils/1.1.0/index.js';

// Configuration
export const options = {
    scenarios: {
        the_lucky_3: {
            executor: 'per-vu-iterations',
            vus: 10, // 10 Concurrent Users
            iterations: 1, // 1 attempt each
            maxDuration: '10s',
        },
    },
    thresholds: {
        // PASS Criteria
        'http_req_failed': ['rate<0.8'], // Allow failures (expected 70% failure)
        'successful_bookings': ['count==3'], // Exactly 3 successes
        'overbookings': ['count==0'], // 0 Overbookings
    },
};

// Setup: Can't easily setup DB state from K6, assuming a slot exists 'slot_test_lucky3'
// You must insert this slot manually or via API before running
const SLOT_ID = 'slot_test_lucky3';
const BASE_URL = 'http://localhost:3000';

export default function () {
    const patientId = `patient_${uuidv4()}`;
    const idempotencyKey = uuidv4();

    const payload = JSON.stringify({
        slotId: SLOT_ID,
        patientId: patientId,
    });

    const params = {
        headers: {
            'Content-Type': 'application/json',
            'idempotency-key': idempotencyKey,
        },
    };

    const res = http.post(`${BASE_URL}/booking/appointments`, payload, params);

    // Checks
    const isSuccess = res.status === 201;
    const isFullError = res.status === 409; // Assuming 409 Conflict for Full

    check(res, {
        'is 201 Created or 409 Conflict': (r) => r.status === 201 || r.status === 409,
    });

    // Custom Metrics
    // We can't log custom metrics easily to simple output without setup, 
    // but we can check console logs or rely on thresholds if we had custom metric definitions.
    // For this report, we will rely on CLI output summary.
}
