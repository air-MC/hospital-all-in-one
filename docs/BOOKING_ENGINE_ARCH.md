# 2. 예약 엔진 설계 (Booking Engine Architecture)

"완벽한 앱" 기준에 맞춰 **상태 전이(State Transition)**, **동시성 제어**, **Idempotency**를 엄격하게 정의합니다.

## A. 핵심 메커니즘 5가지

### 1. 상태 전이 규칙 (State Transition Machine)
슬롯의 상태는 다음 규칙에 의해서만 변경됩니다.

| Trigger Event | Condition | From Status | To Status | Action |
|:---|:---|:---|:---|:---|
| **Booking** | `bookedCount` reaches `capacity` (3) | **OPEN** | **FULL** | 예약 버튼 비활성화 |
| **Cancellation** | `bookedCount` drops below `capacity` | **FULL** | **OPEN** | 예약 버튼 활성화 |
| **Manual Block** | Doctor unavailable / Lunch | *ANY* | **BLOCKED** | 기존 예약자에게 알림 발송 필요 |
| **Time Lapse** | `CurrentTime` > `SlotTime` | *ANY* | **PAST** | 배치 작업으로 처리 |

### 2. FULL 처리 (Threshold Logic)
- **Lazy Update 방식이 아닌 Eager Check**: 예약 트랜잭션 *내부*에서 `bookedCount` 증가 직후 즉시 체크합니다.
- `if (newCount >= capacity) setStatus('FULL')`

### 3. 중복 예약 방지 (Double Booking Prevention)
- **Optimistic Locking**: 슬롯 데이터 수정 시 `version` 필드를 확인하여, 내가 읽은 시점 이후 다른 트랜잭션이 슬롯을 수정했다면 재시도(Retry)하거나 실패 처리합니다.
- **Atomic Increment**: `update({ data: { bookedCount: { increment: 1 } } })`를 사용하여 DB 레벨의 원자성을 보장합니다.

### 4. Idempotency (멱등성 보장)
- 클라이언트는 예약 요청 시 UUID(`idempotencyKey`)를 생성하여 보냅니다.
- 서버는 `Appointment` 테이블의 `idempotencyKey` 컬럼(Unique)을 통해 중복 요청을 거부합니다.
- 결과: 네트워크 타임아웃으로 유저가 '예약' 버튼을 두 번 눌러도, 실제 예약은 1건만 생성됩니다.

### 5. Audit Log (감사 로그)
- 예약/취소/변경 등 중요한 액션은 트랜잭션 내에서 `AuditLog` 테이블에 기록을 남깁니다.
- **기록 내용**: 누가(Actor), 언제(Time), 무엇을(Appointment ID), 어떻게(Status: BOOKED -> CANCELLED) 변경했는지.

---

## B. 트랜잭션 로직 상세 (Pseudo-Code)

```typescript
async function bookSlot(slotId, patientId, idempotencyKey) {
  return prisma.$transaction(async (tx) => {
    // 1. Idempotency Check (DB Unique constraint will also catch this)
    const existing = await tx.appointment.findUnique({ where: { idempotencyKey } });
    if (existing) return existing;

    // 2. Lock & Increment Slot
    // Using simple increment is safe for count, logic check follows
    const slot = await tx.slot.update({
      where: { id: slotId, status: 'OPEN' }, // Guard clause
      data: { bookedCount: { increment: 1 } } 
    });

    // 3. Criticial Validation
    if (slot.bookedCount > slot.capacity) {
      throw new Error("Overbooking: Rollback transaction"); 
    }

    // 4. Update Status if FULL
    if (slot.bookedCount === slot.capacity) {
      await tx.slot.update({ where: { id: slotId }, data: { status: 'FULL' } });
    }

    // 5. Create Appointment
    const appt = await tx.appointment.create({
      data: { slotId, patientId, idempotencyKey, status: 'BOOKED' }
    });

    // 6. Create Audit Log
    await tx.auditLog.create({
      data: {
        entityTable: 'Appointment',
        entityId: appt.id,
        action: 'CREATE',
        newValue: JSON.stringify(appt)
      }
    });

    return appt;
  });
}
```
