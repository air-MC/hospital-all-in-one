# 병원 확장 (Multi-Tenancy) 가이드

시스템을 단위 병원(Single Tenant)에서 다중 병원(Multi-Tenant) 플랫폼으로 확장하기 위한 기술적/운영적 프로세스를 안내합니다.

## 1. 데이터베이스 구조 변경 (Schema Update)
현재 데이터 모델은 `Hospital`이 최상위 엔티티로 존재하지만, 하위 모델들이 `Hospital`을 엄격하게 참조하지 않는 경우가 있습니다. 확장을 위해서는 모든 데이터가 **"어느 병원의 데이터인가?"**를 명확히 해야 합니다.

- **필수 변경 사항:**
    - `Patient` (환자): `hospitalId` 필드 추가 필요. 환자가 여러 병원을 이용할 수 있으므로 N:M 관계(PatientHospital 매핑 테이블)가 더 적합할 수 있습니다.
    - `Appintment`, `SurgeryCase`, `CarePlan`: 현재는 간접적으로 연결되거나 연결이 느슨합니다. 조회 성능과 보안(Data Isolation)을 위해 `hospitalId`를 인덱스로 추가하는 것을 권장합니다.
    - `SurgeryType` (수술 종류): 현재 전역(Global) 설정입니다. 병원마다 수술 종류가 다를 수 있으므로 `hospitalId`를 추가하여 병원별 커스텀 수술 항목을 지원해야 합니다.

## 2. 백엔드 로직 변경 (Backend Context)
현재 백엔드 서비스(`HospitalService`, `CareService`)는 주로 `findFirst()`를 사용하여 **"첫 번째 병원"**을 기본값으로 사용하고 있습니다.

- **Context 기반 요청 처리:**
    - 모든 API 요청 헤더(Header)에 `X-Hospital-ID`를 포함하거나, 로그인 토큰(JWT)에 `hospitalId`를 포함시켜야 합니다.
    - **Before:** `prisma.doctor.findMany()` (모든 의사 반환)
    - **After:** `prisma.doctor.findMany({ where: { department: { hospitalId: context.hospitalId } } })` (해당 병원 의사만 반환)

## 3. 관리자 웹 (Admin Web) 확장
- **슈퍼 어드민 (Super Admin) 도입:**
    - 기존 '병원 관리자' 위에 '플랫폼 관리자' 계층이 필요합니다.
    - 기능: 신규 병원 생성(`Create Hospital`), 병원별 초기 관리자 계정 생성.
- **로그인 프로세스:**
    - 로그인 시 소속 병원을 선택하거나, 계정에 연결된 병원 대시보드로 자동 리다이렉트 되는 로직이 필요합니다.

## 4. 환자용 앱 (Patient App) 확장
- **병원 선택/검색 기능:**
    - 앱 실행 시 **"어떤 병원"**을 이용할지 선택하는 화면이 필요합니다.
    - 또는, 앱 자체가 '플랫폼'화 되어 내 주변 병원을 검색하고 예약하는 구조로 변경되어야 합니다.

## 5. 인프라 및 배포 (Infrastructure)
- **데이터 격리 (Data Isolation):**
    - **논리적 분리 (Logical Separation):** 현재 방식. 모든 병원 데이터가 하나의 DB에 있고 `hospitalId`로 구분. (비용 효율적)
    - **물리적 분리 (Physical Separation):** 병원마다 별도의 DB 스키마나 데이터베이스 인스턴스 사용. (보안성 최상, 비용 높음)

- **확장 로드맵 (Evolution Strategy):**
    - 초기에는 **논리적 분리**로 시작하여 운영 비용을 최소화합니다.
    - 특정 병원의 데이터가 방대해지거나(Big Tenant), 강력한 보안 규제가 요구될 때 
    - 해당 `hospitalId`에 해당하는 데이터만 추출(Dump)하여 **단독 DB로 이관(Physical Isolation/Sharding)**하는 것이 가능합니다.
    - 이를 위해 애플리케이션 레벨에서 **Token**이나 **Hospital ID**를 보고 적절한 DB 커넥션을 찾아가는 **Routing/Catalog Service** 구조를 미리 고려해야 합니다.

---
### 요약: 즉시 실행 가능한 다음 단계
지금 당장 "병원 2호점"을 내고 싶다면, **1단계(DB 스키마에 hospitalId 전파)**와 **2단계(API 조회 시 hospitalId 필터링 적용)** 작업이 선행되어야 합니다.
