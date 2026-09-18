# 프로젝트 개발 현황 (PROGRESS.md)

> 기록 규칙: 항목마다 "주요 구현: 무엇을 했는지, 어떤 작업을 하는건지, 프레임워크 구조는 무엇인지"를 비전공자도 이해할 수 있도록 아주 단계별로 자세히 쉽게 적는다. (이 규칙 문구는 기존 템플릿에서 그대로 유지)

## 완료된 작업

- [o] Step 1: 스펙 문서 7종 충돌 정리 및 제품 스펙 신규 작성 (완료일: 2026-09-18)
  - 주요 구현: 기존에 흩어져 있던 01~06 문서 사이의 충돌(기준일 21:00 vs 20:00, KOSPI 상대강도 지표 개수 불일치, Valuation DB 스키마가 PER/PBR과 BPS·ROE 두 가지로 따로 정의되어 있던 문제, 비즈니스분석 DB 저장 여부 미정의)를 찾아서 통일했다.
  - `07_PRODUCT_SPEC.md`를 새로 만들어 실제 앱 화면(시장 스크리닝 / 재무분석 / 비즈니스분석 / Valuation 4개 탭)이 어떻게 서로 연결되는지(더블클릭으로 이동, 각 탭에서 직접 검색), 어떤 데이터가 Cloudflare D1에 저장되고 어떤 데이터(비즈니스분석)는 저장하지 않는지, DB 용량이 찰 때 화면에서 삭제하는 기능(API 포함)을 정의했다.
  - 프레임워크 구조: Cloudflare Workers/Pages(웹/API) + Cloudflare D1(SQLite 기반 저장소) 조합은 기존 기술스펙 그대로 유지했다.

- [o] Step 2: Cloudflare 프로젝트 뼈대 생성 및 D1 스키마 마이그레이션 파일 작성 (완료일: 2026-09-18)
  - 주요 구현: `wrangler.toml` 및 `migrations/0001_initial.sql` 작성.
  - `08_technical_spec.md` §10의 10개 핵심 테이블(`companies`, `market_daily`, `financial_annual`, `financial_quarterly`, `screening_results`, `valuation` 등) 스키마를 SQLite D1 전용으로 작성했다.

- [o] Step 3: Cloudflare Pages Functions 통합 백엔드 API 구현 (완료일: 2026-09-18)
  - 주요 구현: 비전공자가 별도의 복잡한 Node/Python 서버 없이 Cloudflare Pages 하나만으로 동작할 수 있도록 Serverless Functions(`/functions/api/...`)를 구현했다.
  - `functions/api/dart.js`: DART OpenDART API 연동, 계정명 정규화, 10개년 분기/연간 재무데이터 계산 및 D1 캐싱.
  - `functions/api/gemini.js`: Google Gemini API 연동 (`GEMINI_API_KEY`), 04 스펙 기반 사업모델/해자/산업/경쟁사/리스크/Thesis 실시간 분석.
  - `functions/api/screening.js`: 02 스펙 기반 Z10/Z20, 기간수익률(1D~120D), 가중모멘텀, KOSPI 상대강도, 52주 최고가 Top 20 및 영업일 21:00 기준일 판별.
  - `functions/api/valuation.js`: 05 스펙 공식 (`BPS₀ × (1 + ROE_avg)^N`) 적용, 미래 BPS, 상승배수, 연환산 기대수익률 계산.
  - `functions/api/admin.js`: 07 §5 스펙 기반 D1 용량 관리 및 영역별 데이터 삭제 API.
  - `functions/api/[[route]].js`: 통합 REST API 라우터.

- [o] Step 4: 모던 반응형 프론트엔드 대시보드 구현 (완료일: 2026-09-18)
  - 주요 구현:
    1. **시장 스크리닝 탭**: 영업일 21:00 기준일 표시, 지표별 Top 20 테이블, **종목 더블클릭 시 재무분석 탭으로 즉시 전환 및 자동 조회 (07 §3.1)**.
    2. **재무분석 탭**: 10개년 연간/분기 정규화 재무제표 그리드, Chart.js 기반 4대 추세 차트(매출/이익, ROE, CFO/FCF, BPS), **회사명 더블클릭 시 팝오버 메뉴 제공(비즈니스분석 또는 Valuation 이동, 07 §3.2)**.
    3. **비즈니스분석 (AI) 탭**: Gemini AI 실시간 분석 카드(사업모델, 경제적 해자 및 반대증거, 산업구조, 경쟁사, 리스크, Thesis). D1 용량 절약을 위해 DB에 저장하지 않고 실시간 세션 유지.
    4. **Valuation 탭**: BPS × ROE 기대수익률 핵심 지표 카드 및 ROE 변동에 따른 실시간 시뮬레이션 슬라이더.
    5. **DB 관리 모달**: D1 테이블별 저장 건수 실시간 확인 및 안전 확인 모달을 거친 영역별 데이터 삭제.

- [o] Step 5: 비전공자 전용 Cloudflare 1분 배포 가이드 작성 (완료일: 2026-09-18)
  - 주요 구현: `DEPLOY_GUIDE.md`를 비전공자 눈높이에 맞춰 작성.
  - GitHub 푸시 방법부터 Cloudflare Pages 연동, D1 데이터베이스 생성 및 바인딩, `DART_API_KEY`와 `GEMINI_API_KEY` 변수 확인까지 마우스 클릭 순서대로 정리.
