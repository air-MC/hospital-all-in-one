# Sprint 0 계획서 (Initial Setup)

**기간**: 2026.01.20 ~ 2026.02.03 (2주간)
**목표**: 개발 환경 셋업 및 핵심 백엔드 기능(API) 구현 완료

## 1. 주요 Deliverables (산출물)

### A. 기술 환경 셋업 (Infrastructure)
- [ ] Monorepo 구축 (NestJS + Flutter + React) - *진행중*
- [ ] PostgreSQL DB 구축 (Local/Cloud)
- [ ] CI/CD 파이프라인 기초 구성 (GitHub Actions)

### B. 백엔드 개발 (Core API)
- [ ] **Auth API**: 회원가입/로그인 (JWT)
- [ ] **Booking API**:
  - `GET /slots`: 날짜별 슬롯 조회
  - `POST /appointments`: 예약 요청 (Idempotency + Transaction 적용)
  - `PATCH /appointments/{id}/cancel`: 예약 취소
- [ ] **Admin API**:
  - `POST /schedule-rules`: 운영시간 설정
  - `POST /slots/refresh`: 슬롯 배치 생성

### C. 문서 및 테스트
- [ ] **API Specification**: Swagger (OpenAPI) 문서
- [ ] **Concurrency Test Report**: k6 또는 JMeter를 이용한 동시 예약 부하 테스트 리포트 (3명 정원에 100명 동시 요청 시나리오)

---

## 2. 동시성 테스트 시나리오 (Concurrency Test Plan)

**목적**: "정원 3명" 슬롯에 10명이 동시(0.1초 차이)에 예약 요청을 보낼 때, 정확히 3명만 성공하고 7명은 실패하는지 검증.

**시나리오 Step**:
1. `OPEN` 상태의 빈 슬롯(ID: `slot_test_01`) 생성 (Capacity: 3).
2. 테스트 스크립트(k6)에서 가상 유저(VU) 10명 생성.
3. 10명이 동시에 `POST /appointments` 요청 (각기 다른 `idempotencyKey`).
4. **기대 결과**:
   - HTTP 201 (Created): **3건**
   - HTTP 409 (Conflict/Full): **7건**
   - DB 최종 상태: `bookedCount` = 3, `status` = FULL
   - AuditLog: 생성 이벤트 3건 기록.

---

## 3. 화면 기능 명세 (UI Specs) - 선행 작업
- [ ] Android/iOS Splash & Login Screen
- [ ] Admin Dashboard Layout
