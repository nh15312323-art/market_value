# 프로젝트 개발 현황 (PROGRESS.md)

> 기록 규칙: 항목마다 "주요 구현: 무엇을 했는지, 어떤 작업을 하는건지, 프레임워크 구조는 무엇인지"를 비전공자도 이해할 수 있도록 아주 단계별로 자세히 쉽게 적는다. (이 규칙 문구는 기존 템플릿에서 그대로 유지)

## 완료된 작업

- [o] Step 1: 스펙 문서 7종 충돌 정리 및 제품 스펙 신규 작성 (완료일: 2026-09-18)
  - 주요 구현: 기존에 흩어져 있던 01~06 문서 사이의 충돌(기준일 21:00 vs 20:00, KOSPI 상대강도 지표 개수 불일치, Valuation DB 스키마가 PER/PBR과 BPS·ROE 두 가지로 따로 정의되어 있던 문제, 비즈니스분석 DB 저장 여부 미정의)를 찾아서 통일했다.
  - `07_PRODUCT_SPEC.md`를 새로 만들어 실제 앱 화면(시장 스크리닝 / 재무분석 / 비즈니스분석 / Valuation 4개 탭)이 어떻게 서로 연결되는지(더블클릭으로 이동, 각 탭에서 직접 검색), 어떤 데이터가 Cloudflare D1에 저장되고 어떤 데이터(비즈니스분석)는 저장하지 않는지, DB 용량이 찰 때 화면에서 삭제하는 기능(API 포함)을 정의했다.
  - 프레임워크 구조: Cloudflare Workers(웹/API) + Cloudflare D1(SQLite 기반 저장소) + GitHub Actions(Python 배치로 KRX/DART 수집) 조합은 기존 `06_technical_spec.md`(향후 `08_TECHNICAL_SPEC.md`로 개명 권장) 그대로 유지했다.

## 진행 중인 작업

- [ ] Step 2: `06_technical_spec.md` 파일명을 `08_TECHNICAL_SPEC.md`로 변경하고, `07_PRODUCT_SPEC.md`를 리포지토리 docs 폴더에 추가

## 다음 예정 작업

- [ ] Step 3: Cloudflare Workers 프로젝트 뼈대 생성 (`wrangler.toml`, D1 스키마 마이그레이션 파일 — `08_TECHNICAL_SPEC.md` §10, §21 기준)
- [ ] Step 4: 시장 스크리닝 배치(Python, GitHub Actions) 구현 — `02_market_screening.md` 기준
- [ ] Step 5: 재무분석 DART 연동 구현 — `03_financial_analysis.md` 기준
- [ ] Step 6: 프론트엔드 4개 탭 골격 구현 — `07_PRODUCT_SPEC.md` §2~§3 기준, 더블클릭 네비게이션 포함
- [ ] Step 7: 비즈니스분석 Gemini 연동 (DB 저장 없이 실시간 호출) — `04_BUSINESS_MOAT_INDUSTRY.md` §0, §70~§72 기준
- [ ] Step 8: Valuation 계산 로직 구현 — `05_VALUATION.md` 기준
- [ ] Step 9: DB 삭제 기능(관리 화면 + API) 구현 — `07_PRODUCT_SPEC.md` §5 기준
