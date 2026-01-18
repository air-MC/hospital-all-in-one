# 화면별 기능 명세 (UI Functional Specifications)

## 1. 환자용 앱 (Patient App)

### S01. 로그인/회원가입
- **기능**: 휴대폰 본인확인 (최초 1회), PIN/생체인증 로그인
- **API**: `POST /auth/login`, `POST /auth/verify-phone`
- **예외처리**: 인증 실패, 탈퇴 회원, 차단된 회원

### S02. 메인 홈 (예약 전/후 분기)
- **상태 A (예약 없음)**: "진료 예약하기" 버튼 강조
- **상태 B (예약/입원 중)**: "D-Day 카운터", "오늘의 할일" 카드 노출
- **데이터**: `GET /bi/my-summary` (예약상태, 입원정보 등 요약)

### S03. 예약 슬롯 선택 (Booking Slot)
- **UI**: 월간 달력(가로 스크롤) + 오전/오후 슬롯 그리드
- **로직**:
  - 오늘 ~ 30일 후까지 날짜 선택 가능
  - 슬롯 상태:
    - **OPEN (White)**: 예약 가능
    - **FULL (Gray)**: 예약 마감 (클릭 불가)
    - **BLOCKED (Red)**: 휴진
  - 실시간성: 진입 시점 데이터 조회 (Polling 또는 새로고침 버튼)
- **API**: `GET /slots?date=YYYY-MM-DD&deptId=xx`

### S04. 수술 케어 홈 (Care Dashboard)
- **UI**: 타임라인 형태의 하루 일정 (오전/오후/저녁)
- **기능**:
  - 체크리스트 항목 터치 시 "완료" 처리 (토글)
  - 식단 메뉴 사진/텍스트 보기
- **API**: `GET /care-plans/{id}/daily-items`, `PATCH /care-items/{id}/complete`

---

## 2. 관리자 웹 (Admin Web)

### A01. 대시보드
- **주요 지표**: 오늘의 예약 건수, 수술 예정 건수, 노쇼율
- **알림 센터**: 신규 예약, 취소 알림 피드

### A02. 운영시간/슬롯 관리
- **기능**:
  - 요일별 근무시간(Start/End) 및 점심시간 설정
  - "슬롯 일괄 생성" 버튼 (비동기 배치 작업 트리거)
  - 특정 슬롯 수동 차단 (Block)
- **API**: `POST /schedule-rules`, `POST /slots/refresh`, `PATCH /slots/{id}/block`

### A03. 수술 상담 및 확정
- **기능**:
  - 상담 메모 작성 (Rich Text)
  - 수술 확정 시: 입원일/수술일/퇴원예정일 입력 -> `SurgeryCase` 생성
  - 케어플랜 템플릿 로드 (ex. 무릎 수술 표준 플랜)
- **API**: `POST /surgeries`, `POST /care-plans/from-template`
