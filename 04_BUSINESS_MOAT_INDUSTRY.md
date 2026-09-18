# 04_BUSINESS_MOAT_INDUSTRY.md

## 0. V1 저장 정책 (중요 — 반드시 먼저 읽을 것)

이 문서(§57~§70)에는 business_profiles 등 8개 테이블과 repository.py CRUD, 분석 버전관리까지 포함한 **영구 저장 설계**가 상세히 정의되어 있다. 그러나 실제 V1 제품 요구사항은 다음과 같다.

```text
V1: 04(비즈니스분석)는 Cloudflare D1에 저장하지 않는다.
    사용자가 조회할 때마다 Gemini API를 실시간 호출하여
    화면에만 표시한다 (브라우저 세션 범위, 새로고침하면 사라짐).
```

이유:

- Gemini 응답(사업모델/해자/산업/경쟁사/리스크/Thesis 전체)은 텍스트 양이 많고 가변적이어서, 개인용 무료 Cloudflare D1 용량을 빠르게 소모한다.
- 시장 스크리닝(02)·재무분석(03)·Valuation(05)과 달리 04는 "새로 계산할 수 없는 원천 데이터"가 아니라 "다시 생성 가능한 AI 해석"이므로, 매번 재호출해도 정보 손실이 없다.
- 자세한 탭 간 흐름과 저장 정책 비교표는 `07_PRODUCT_SPEC.md` §3.3, §4를 참고한다.

**따라서 아래 §57~§70에 정의된 DB 스키마/Repository 함수/분석 버전관리(§82)는 V1에서 구현하지 않는다.** 이 내용은 "나중에 저장 기능이 필요해지면 이렇게 설계하면 된다"는 **V2 설계 자료**로 보존한다. V1 완료 기준(§95)에서도 DB 저장 관련 항목은 제외한다.

AI(antigravity)가 코드를 생성할 때는 다음과 같이 구현한다.

```text
V1 실제 구현 흐름:

사용자가 회사명 입력 (또는 03에서 더블클릭으로 전달받은 stock_code)
        ↓
03 재무데이터(D1) + 02 시장데이터(D1) 조회 → 프롬프트 컨텍스트 구성
        ↓
Gemini API 호출 (§70 prompts.py, §71 JSON 스키마 그대로 사용)
        ↓
§72 AI 출력 검증 (JSON 필드/타입 체크)
        ↓
화면에 표시 (DB 저장 없음)
```

## 1. 문서 목적

본 문서는 02 시장 스크리닝과 03 재무분석을 통과한 기업에 대해 다음을 분석하고 저장하기 위한 구현 명세다.

1. 사업모델
2. 고객 및 제품
3. 수익구조
4. 가격결정력
5. 가치사슬
6. 경쟁우위
7. 경제적 해자(Moat)
8. 산업구조
9. 시장규모 및 성장
10. 경쟁사
11. 사업 리스크
12. Business Thesis

### 핵심 원칙

이 모듈은 기업을 자동으로 "좋은 기업/나쁜 기업"으로 판정하지 않는다.

목표는 다음 질문에 답할 수 있는 자료를 구조화하는 것이다.

> 이 회사는 어떻게 돈을 벌고, 고객은 왜 이 회사에서 구매하며, 경쟁사가 같은 사업을 하려고 할 때 무엇 때문에 쉽게 따라오지 못하는가?

04의 결과는 05 Valuation으로 전달한다.

```text
02 Market Screening
        ↓
03 Financial Analysis
        ↓
04 Business / Moat / Industry
        ↓
05 Valuation
        ↓
06 Portfolio / Kelly
```

---

# 2. 구현 범위

## 2.1 V1 필수 기능

- 종목 선택
- 기업 기본정보 조회
- 사업부문 조회
- 제품/서비스 조회
- 고객 유형 조회
- 수익모델 조회
- 가격결정력 분석
- 가치사슬 분석
- 경쟁우위 분석
- 해자 근거/반대근거 관리
- 산업정보 조회
- 경쟁사 관리
- 리스크 관리
- 분석 출처 관리
- Business Thesis 작성/수정
- 03 재무지표 연결

V1에서는 분석 결과/이력을 DB에 저장하지 않는다 (§0 참고). "분석 결과 저장"과 "분석 이력 저장"은 V2 항목이다.

## 2.2 V1 제외

- DB 영구 저장 및 분석 버전관리 (V2로 이동, §0 참고)

다음은 구현하지 않는다.

- 해자 0~100점
- 산업 0~100점
- 기업 종합점수
- 자동 매수/매도 판단
- 미래 성장률 자동 예측
- 성공확률 자동 산출
- DCF
- 목표주가
- 애널리스트 컨센서스 기반 전망
- 자동 투자등급
- 자동 포트폴리오 비중 결정

---

# 3. 분석 정보의 신뢰도 체계

모든 분석 정보는 다음 상태 중 하나를 갖는다.

```text
FACT
COMPANY_CLAIM
ANALYSIS
CHECK_REQUIRED
UNKNOWN
CONFLICTING
```

## FACT

공시나 신뢰할 수 있는 자료에서 직접 확인되는 사실.

## COMPANY_CLAIM

회사가 IR/홈페이지/보고서에서 주장하는 내용.

## ANALYSIS

확인된 사실을 바탕으로 시스템 또는 사용자가 해석한 내용.

## CHECK_REQUIRED

추가적인 검증이 필요한 내용.

## UNKNOWN

공개 자료로 확인할 수 없는 내용.

## CONFLICTING

자료 간 내용이 서로 다른 경우.

---

# 4. 출처 우선순위

정보 수집 시 기본 우선순위:

```text
1. DART
2. 회사 사업보고서
3. 회사 IR 자료
4. 회사 공식 홈페이지
5. 정부/공공기관
6. 신뢰할 수 있는 산업자료
7. 신뢰할 수 있는 뉴스
8. 기타
```

출처를 찾았더라도 내용 자체를 검증하지 않고 FACT로 지정하지 않는다.

---

# 5. 기업 기본정보

03의 companies 테이블을 재사용한다.

필수:

```text
stock_code
stock_name
market
industry
```

04에서 추가적으로 관리:

```text
business_summary
main_products
customer_type
major_regions
fiscal_year_end
```

---

# 6. 사업모델 분석

## 6.1 핵심 질문

각 기업에 대해 다음 질문에 답한다.

```text
무엇을 파는가?
누구에게 파는가?
왜 고객이 사는가?
누가 구매를 결정하는가?
누가 가격을 결정하는가?
매출은 어떻게 발생하는가?
반복매출인가?
일회성 매출인가?
매출 증가에 필요한 비용은 무엇인가?
매출 증가에 필요한 자본은 얼마나 되는가?
```

---

# 7. Business Model Canvas 수준의 구조

기업을 다음 9개 요소로 구조화할 수 있도록 한다.

```text
Customer Segments
Value Proposition
Channels
Customer Relationships
Revenue Streams
Key Resources
Key Activities
Key Partners
Cost Structure
```

DB에서는 지나치게 복잡하게 분리하지 않고 business_profiles에 핵심 요약을 저장하고, 필요하면 business_analysis_versions에 전체 분석을 저장한다.

---

# 8. 제품/서비스

사업부문별로 제품을 기록한다.

예:

```text
사업부문: 반도체 장비
제품: 검사장비
고객: 반도체 제조사
사용목적: 공정 검사
수익모델: 장비 판매 + 유지보수
```

필드:

```text
segment_name
product_name
product_description
customer_type
use_case
revenue_model
recurring_type
geography
revenue_share
```

---

# 9. 고객 분석

고객 유형:

```text
B2C
B2B
B2G
B2B2C
PLATFORM
MARKETPLACE
MIXED
```

가능하면 다음을 기록한다.

```text
customer_count
top1_customer_ratio
top5_customer_ratio
top10_customer_ratio
major_customer_names
customer_concentration_note
```

공개 자료가 없으면 NULL/N/A를 사용한다.

추정치를 사실처럼 저장하지 않는다.

---

# 10. 구매 의사결정자

B2B 기업은 특히 구매 의사결정자를 구분한다.

```text
USER
ENGINEER
PURCHASING
CEO
CFO
GOVERNMENT
CONSUMER
DEVELOPER
OTHER
```

예:

```text
실사용자 = 생산기술팀
구매결정 = 구매팀
최종승인 = 경영진
```

---

# 11. 고객이 구매하는 이유

가능한 이유를 다음처럼 구조화한다.

```text
PRICE
QUALITY
PERFORMANCE
RELIABILITY
BRAND
TECHNOLOGY
SAFETY
REGULATION
COMPATIBILITY
DELIVERY
SERVICE
SWITCHING_COST
NETWORK
OTHER
```

최종 분석에는 실제 구매 이유를 설명한다.

---

# 12. 수익모델

수익모델 유형:

```text
PRODUCT_SALE
SUBSCRIPTION
TRANSACTION_FEE
LICENSE
ADVERTISEMENT
COMMISSION
MAINTENANCE
SERVICE
PROJECT
ROYALTY
MIXED
```

예:

```text
장비 판매: PRODUCT_SALE
유지보수: MAINTENANCE
소프트웨어 구독: SUBSCRIPTION
```

---

# 13. 반복매출

반복매출은 다음으로 구분한다.

```text
RECURRING
REPEAT_PURCHASE
ONE_OFF
PROJECT
MIXED
UNKNOWN
```

가능하면:

```text
recurring_revenue_ratio
```

를 저장한다.

단, 공개 자료가 없으면 임의 계산하지 않는다.

---

# 14. 이익공식

사업의 경제성을 수식으로 표현한다.

예:

```text
매출 = 판매수량 × 평균판매가격

영업이익 = 매출 - 변동비 - 고정비

플랫폼 매출 = 거래액 × 수수료율

구독 매출 = 가입자 수 × ARPU
```

필드:

```text
revenue_formula
profit_formula
key_driver
```

핵심 변수는 최대 5개 이내로 정리한다.

---

# 15. 핵심 사업 Driver

기업별 핵심 driver를 정의한다.

예:

```text
판매량
ASP
고객수
ARPU
시장점유율
가동률
수율
환율
원재료가격
가입자수
거래액
수수료율
```

향후 03/05와 연결하기 위한 기반 데이터다.

---

# 16. 가격결정력

가격결정력을 별도의 항목으로 관리한다.

## 질문

```text
회사가 가격을 인상할 수 있는가?
원가 상승을 고객에게 전가할 수 있는가?
가격 인상 후 판매량이 유지되는가?
경쟁사의 가격 대응이 쉬운가?
장기계약 때문에 가격 변경이 어려운가?
고객에게 대체재가 있는가?
```

## 재무 증거

03의 다음 지표와 연결한다.

```text
매출성장률
영업이익률
ROIC
FCF
원가율
```

단순히 영업이익률이 높다는 이유만으로 가격결정력을 확정하지 않는다.

---

# 17. 가격결정력 데이터 구조

```text
pricing_power_status
pricing_power_evidence
pricing_power_counter_evidence
pricing_power_source
```

status:

```text
SUPPORTED
PARTIAL
UNCLEAR
WEAK_EVIDENCE
UNKNOWN
```

이는 점수가 아니다.

---

# 18. 가치사슬

기업의 위치를 표시한다.

```text
RAW_MATERIAL
COMPONENT
MANUFACTURING
WHOLESALE
DISTRIBUTION
PLATFORM
SERVICE
END_PRODUCT
VERTICALLY_INTEGRATED
```

예:

```text
원재료 → 부품 → 제조 → 유통 → 고객

기업 위치 = 제조
```

---

# 19. 가치사슬 내 이익 위치

다음 질문을 분석한다.

```text
가치사슬에서 어느 단계가 가장 높은 마진을 가져가는가?
회사가 그 단계에 있는가?
회사의 위치가 이동할 가능성이 있는가?
상위/하위 업체의 협상력이 강한가?
```

---

# 20. 공급자 분석

확인 항목:

```text
supplier_count
top_supplier_ratio
key_raw_material
single_source_dependency
substitutability
input_price_volatility
long_term_contract
```

공급자 협상력은 설명형으로 저장한다.

```text
HIGH
MEDIUM
LOW
UNKNOWN
```

이는 투자등급이 아니라 산업구조 태그다.

---

# 21. 구매자 분석

확인:

```text
buyer_count
customer_concentration
switching_cost
substitutability
purchase_frequency
contract_duration
buyer_size
```

---

# 22. 경쟁우위 분류

경쟁우위는 다음 유형으로 분류한다.

```text
SCALE
NETWORK_EFFECT
SWITCHING_COST
BRAND
COST_ADVANTAGE
PATENT_TECHNOLOGY
REGULATORY_BARRIER
DISTRIBUTION
DATA
ECOSYSTEM
PROCESS_POWER
COUNTER_POSITIONING
CORNERED_RESOURCE
OTHER
```

한 기업에 여러 유형이 존재할 수 있다.

---

# 23. Scale Advantage

확인:

```text
생산규모
구매규모
R&D 규모
유통망
고정비
데이터
고객기반
```

재무적 증거:

```text
매출 증가
영업이익률 변화
ROIC 변화
시장점유율 변화
```

단순히 기업 규모가 크다는 사실과 규모의 경제를 구분한다.

---

# 24. Network Effect

다음으로 구분한다.

```text
DIRECT
INDIRECT
NONE
UNCLEAR
```

## Direct

사용자 증가 → 다른 사용자에게 가치 증가

## Indirect

판매자 증가 → 구매자 가치 증가

구매자 증가 → 판매자 가치 증가

플랫폼 기업이라는 이유만으로 network effect를 인정하지 않는다.

---

# 25. Switching Cost

전환비용을 구체적으로 기록한다.

```text
DATA_MIGRATION
TRAINING
INTEGRATION
EQUIPMENT_CHANGE
REGULATORY_APPROVAL
CONTRACT
WORKFLOW
COMPATIBILITY
ECOSYSTEM
HABIT
OTHER
```

핵심 질문:

> 고객이 경쟁사 제품으로 바꾸면 실제로 무엇을 잃는가?

---

# 26. Brand

브랜드의 경제적 효과를 다음과 같이 확인한다.

```text
PRICE_PREMIUM
CUSTOMER_LOYALTY
REPEAT_PURCHASE
DISTRIBUTION_ADVANTAGE
MARKETING_EFFICIENCY
TRUST
```

브랜드 인지도만으로 해자를 판단하지 않는다.

---

# 27. Cost Advantage

원가우위 원천:

```text
SCALE
LOCATION
PROCUREMENT
AUTOMATION
PROCESS
LOGISTICS
RAW_MATERIAL
LEARNING_CURVE
VERTICAL_INTEGRATION
OTHER
```

가능하면 경쟁사 대비 경제적 차이를 확인한다.

---

# 28. Technology / Patent

확인:

```text
핵심 기술
특허
특허 만료
R&D
독점 라이선스
대체기술
경쟁사 기술
```

특허 개수 자체를 해자로 보지 않는다.

핵심 질문:

> 경쟁사가 비슷한 경제적 가치를 가진 제품을 만드는 것이 얼마나 어려운가?

---

# 29. Regulatory Barrier

예:

```text
LICENSE
CERTIFICATION
GOVERNMENT_APPROVAL
EXCLUSIVE_RIGHT
REGULATED_ACCESS
SAFETY_REQUIREMENT
OTHER
```

규제는 두 방향으로 분석한다.

```text
진입장벽
+
기업 자체의 규제비용/리스크
```

---

# 30. Distribution Advantage

확인:

```text
판매점
유통망
물류망
지역 커버리지
직접판매
파트너
고객 접근성
```

유통망 규모 자체보다 경쟁사가 동일한 유통망을 구축하기 어려운지가 중요하다.

---

# 31. Ecosystem

구조:

```text
제품
 ↓
서비스
 ↓
플랫폼
 ↓
사용자
 ↓
데이터
 ↓
추가 서비스
```

고객 락인으로 연결되는지 확인한다.

---

# 32. Process Power

복제하기 어려운 운영능력:

```text
수율
품질관리
납기
생산공정
물류
서비스
조달
R&D
조직 노하우
```

03 재무지표와 연결:

```text
영업이익률
ROIC
재고회전
매출채권회전
FCF
```

---

# 33. Counter-positioning

기존 업체가 사업모델을 쉽게 따라 할 수 없는 이유를 확인한다.

예:

```text
기존 업체가 새로운 사업모델을 채택하면
기존 고객/매출/수익구조가 훼손되는가?
```

AI가 해석할 경우 근거와 가정을 별도로 표시한다.

---

# 34. 해자 증거

각 경쟁우위에 대해 다음을 저장한다.

```text
advantage_type
description
evidence
counter_evidence
threat
sustainability_note
status
```

예:

```text
advantage_type:
SWITCHING_COST

evidence:
기존 고객 시스템과 장기간 통합

counter_evidence:
경쟁사의 호환 제품 출시

threat:
API 표준화로 전환비용 감소 가능

status:
PARTIAL
```

---

# 35. 해자 지속성

각 해자에 대해 다음 질문을 수행한다.

```text
현재 존재하는가?
경쟁사가 복제할 수 있는가?
복제 비용은 얼마인가?
복제 기간은 얼마인가?
기술 변화에 취약한가?
규제 변화에 취약한가?
고객 행동 변화에 취약한가?
```

최종적으로 숫자 점수를 만들지 않는다.

---

# 36. 반대 증거

해자 분석에는 반드시 반대 증거를 기록한다.

예:

```text
해자 근거:
- 높은 시장점유율
- 높은 ROIC
- 고객 전환비용

반대 증거:
- 경쟁사 신규 진입
- 최근 마진 하락
- 특허 만료
```

목적:

```text
확증편향 감소
```

---

# 37. 산업 분석

산업정보:

```text
industry_name
market_definition
market_size
market_currency
market_size_year
growth_rate
growth_period
industry_stage
cyclicality
regulation
technology_change
substitution
```

---

# 38. 시장 정의

시장규모 분석 전에 시장을 명확하게 정의한다.

나쁜 예:

```text
AI 시장
```

좋은 예:

```text
글로벌 데이터센터용 AI 가속기 시장
```

시장 정의가 다른 자료의 시장규모를 단순 합산하지 않는다.

---

# 39. TAM / SAM / SOM

필요한 경우:

```text
TAM = 전체 잠재시장
SAM = 회사가 접근 가능한 시장
SOM = 회사가 실제 확보 가능한 시장
```

회사 자료의 숫자는:

```text
COMPANY_CLAIM
```

으로 표시한다.

AI가 임의로 TAM을 계산해 사실처럼 저장하지 않는다.

---

# 40. 산업 성장

산업 성장률을 가능한 경우 다음으로 분해한다.

```text
시장 성장
=
가격 증가
+
수량 증가
+
점유율 변화
```

기업 성장률과 산업 성장률을 구분한다.

```text
기업 성장
= 산업 성장
+ 시장점유율 변화
+ 제품 믹스
+ 가격
+ 기타
```

정확하게 분해할 수 없으면 설명만 제공한다.

---

# 41. 산업 생애주기

태그:

```text
INTRODUCTION
GROWTH
MATURITY
DECLINE
MIXED
UNKNOWN
```

근거:

```text
시장 성장
침투율
경쟁사 수
CAPEX
가격경쟁
기술변화
```

성장률 하나만으로 판단하지 않는다.

---

# 42. 산업 경쟁구조

다음 요소를 분석한다.

```text
기존 경쟁
신규 진입
공급자
구매자
대체재
```

각 항목:

```text
HIGH
MEDIUM
LOW
UNKNOWN
```

그리고 반드시 설명을 함께 저장한다.

---

# 43. 신규 진입장벽

확인:

```text
CAPEX
TECHNOLOGY
PATENT
REGULATION
BRAND
DISTRIBUTION
CUSTOMER_LOCK_IN
SCALE
DATA
NETWORK
LEARNING_CURVE
```

핵심 질문:

> 신규 경쟁자가 같은 경제성을 가진 사업을 시작하는 데 필요한 비용과 시간이 얼마나 되는가?

---

# 44. 대체재

제품 경쟁사뿐 아니라 다른 해결방법을 조사한다.

```text
직접 경쟁제품
다른 기술
고객의 자체생산
기존 제품 사용연장
전혀 다른 해결방법
```

대체재가 가격 상한을 결정할 수 있다.

---

# 45. 산업 가격구조

가격결정 구조:

```text
PRICE_MAKER
PRICE_TAKER
NEGOTIATED
AUCTION
LONG_TERM_CONTRACT
COST_PLUS
SPOT
SUBSCRIPTION
MIXED
```

기업의 가격결정력과 연결한다.

---

# 46. 산업 CAPEX

산업의 자본집약도를 분석한다.

03 데이터가 있으면:

```text
CAPEX / Sales
CAPEX / CFO
FCF / CFO
ROIC
```

를 계산한다.

경기산업은 다음 구조를 확인한다.

```text
호황
 ↓
CAPEX 증가
 ↓
공급 증가
 ↓
가격 하락
 ↓
마진 하락
 ↓
CAPEX 감소
```

---

# 47. 경기민감도

태그:

```text
DEFENSIVE
CYCLICAL
SECULAR_GROWTH
SECULAR_DECLINE
MIXED
UNKNOWN
```

근거:

```text
GDP
소비
금리
원자재
설비투자
재고
수출
환율
```

---

# 48. 경쟁사 선정

가능하면 3~5개 경쟁사를 등록한다.

선정 기준:

```text
제품 유사성
고객 유사성
지역
시장점유율
사업모델
```

단순히 시가총액이 비슷하다는 이유로 경쟁사로 지정하지 않는다.

---

# 49. 경쟁사 비교

최소 항목:

```text
회사
제품
고객
지역
시장점유율
매출
매출성장률
영업이익률
ROIC
가격전략
경쟁우위
주요 리스크
```

03 재무데이터가 존재하는 기업이면 자동 연결한다.

---

# 50. 시장점유율 변화

가능하면:

```text
현재 점유율
5년 전
10년 전
```

을 비교한다.

점유율 증가 원인을:

```text
시장 자체 성장
경쟁사 점유율 탈취
신규시장 진입
가격효과
M&A
```

로 구분한다.

---

# 51. 사업 리스크

표준 리스크 유형:

```text
CUSTOMER_CONCENTRATION
SUPPLIER_CONCENTRATION
COMPETITION
SUBSTITUTION
TECHNOLOGY
REGULATION
CAPEX
COMMODITY
FX
INTEREST_RATE
CYCLICALITY
COUNTRY
KEY_PERSON
IP
LIQUIDITY
OTHER
```

---

# 52. 리스크 구조

각 리스크:

```text
risk_type
description
financial_impact
leading_indicator
mitigation
severity_note
source
```

확률은 임의로 숫자화하지 않는다.

---

# 53. Leading Indicator

실적 악화보다 먼저 나타나는 지표를 정의한다.

예:

```text
고객 집중
→ 주요 고객 주문 감소

가격경쟁
→ ASP 하락

원재료
→ 원재료 가격 상승

경기민감
→ 재고 증가

현금흐름
→ CFO 감소

기술전환
→ 경쟁사 R&D 증가
```

향후 06 Portfolio 모니터링과 연결할 수 있다.

---

# 54. Business Thesis

최종 결과를 한 문장으로 요약한다.

템플릿:

```text
[기업]은 [고객]에게 [제품/서비스]를 제공하여
[수익방식]으로 돈을 벌며,
핵심 경쟁우위는 [경쟁우위]이고,
주요 성장동력은 [성장동력]이며,
핵심적으로 확인해야 할 리스크는 [리스크]이다.
```

Business Thesis는 투자 판단과 분리한다.

---

# 55. Business Thesis와 Investment Thesis 분리

```text
Business Thesis
= 사업이 어떻게 작동하는가?

Investment Thesis
= 현재 가격에서 기대수익률이 충분한가?
```

좋은 기업과 좋은 투자를 동일시하지 않는다.

04는 Business Thesis까지만 담당한다.

05에서 valuation을 수행한다.

---

# 56. 03 재무분석과 연결

04 화면에서 다음 재무정보를 바로 확인할 수 있어야 한다.

```text
10Y Revenue
10Y Operating Margin
10Y ROIC
10Y ROE
10Y FCF
10Y EPS
```

목적은 다음 관계를 확인하는 것이다.

```text
사업모델
   ↓
경쟁우위
   ↓
경제성
   ↓
ROIC / Margin / FCF
```

재무성과가 경쟁우위의 결과인지 단순한 경기순환인지 구분한다.

---

# 57. 데이터베이스 설계 (V2 설계 — V1에서는 미사용, §0 참고)

## 57.1 business_profiles

```sql
CREATE TABLE business_profiles (
    stock_code TEXT PRIMARY KEY,
    business_summary TEXT,
    customer_type TEXT,
    revenue_model TEXT,
    recurring_type TEXT,
    pricing_model TEXT,
    value_chain_position TEXT,
    industry_stage TEXT,
    cyclicality TEXT,
    key_drivers TEXT,
    business_thesis TEXT,
    updated_at TEXT
);
```

`key_drivers`는 JSON 문자열로 저장한다.

---

# 58. business_segments

```sql
CREATE TABLE business_segments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    segment_name TEXT,
    product_name TEXT,
    product_description TEXT,
    customer_type TEXT,
    use_case TEXT,
    revenue_model TEXT,
    recurring_type TEXT,
    geography TEXT,
    revenue_share REAL,
    source_id INTEGER,
    source_date TEXT,
    created_at TEXT,
    updated_at TEXT
);
```

---

# 59. competitive_advantages

```sql
CREATE TABLE competitive_advantages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    advantage_type TEXT NOT NULL,
    description TEXT,
    evidence TEXT,
    counter_evidence TEXT,
    threat TEXT,
    sustainability_note TEXT,
    status TEXT,
    source_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);
```

`advantage_type`:

```text
SCALE
NETWORK_EFFECT
SWITCHING_COST
BRAND
COST_ADVANTAGE
PATENT_TECHNOLOGY
REGULATORY_BARRIER
DISTRIBUTION
DATA
ECOSYSTEM
PROCESS_POWER
COUNTER_POSITIONING
CORNERED_RESOURCE
OTHER
```

---

# 60. industry_profiles

```sql
CREATE TABLE industry_profiles (
    industry_id TEXT PRIMARY KEY,
    industry_name TEXT NOT NULL,
    market_definition TEXT,
    market_size REAL,
    market_currency TEXT,
    market_size_year INTEGER,
    growth_rate REAL,
    growth_period TEXT,
    industry_stage TEXT,
    cyclicality TEXT,
    regulation TEXT,
    technology_change TEXT,
    substitution TEXT,
    supplier_power TEXT,
    buyer_power TEXT,
    entry_barrier TEXT,
    rivalry TEXT,
    updated_at TEXT
);
```

---

# 61. competitors

```sql
CREATE TABLE competitors (
    stock_code TEXT NOT NULL,
    competitor_stock_code TEXT,
    competitor_name TEXT NOT NULL,
    relationship TEXT,
    products TEXT,
    geography TEXT,
    market_share REAL,
    market_share_year INTEGER,
    note TEXT,
    source_id INTEGER,
    created_at TEXT,
    updated_at TEXT,
    PRIMARY KEY (stock_code, competitor_name)
);
```

---

# 62. business_risks

```sql
CREATE TABLE business_risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    risk_type TEXT NOT NULL,
    description TEXT,
    financial_impact TEXT,
    leading_indicator TEXT,
    mitigation TEXT,
    severity_note TEXT,
    source_id INTEGER,
    created_at TEXT,
    updated_at TEXT
);
```

---

# 63. business_sources

```sql
CREATE TABLE business_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    source_type TEXT NOT NULL,
    title TEXT,
    url TEXT,
    published_date TEXT,
    retrieved_date TEXT,
    source_hash TEXT,
    note TEXT,
    created_at TEXT
);
```

`source_hash`를 이용하면 동일 URL/자료의 중복 저장을 줄일 수 있다.

---

# 64. business_analysis_versions

```sql
CREATE TABLE business_analysis_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    analysis_date TEXT NOT NULL,
    analysis_type TEXT NOT NULL,
    content TEXT NOT NULL,
    source_snapshot TEXT,
    created_at TEXT
);
```

`analysis_type`:

```text
BUSINESS_MODEL
MOAT
INDUSTRY
COMPETITORS
RISKS
THESIS
FULL
```

---

# 65. 데이터 관계

```text
companies
   │
   ├── business_profiles
   │
   ├── business_segments
   │
   ├── competitive_advantages
   │
   ├── competitors
   │
   ├── business_risks
   │
   ├── business_sources
   │
   └── business_analysis_versions
             │
             └── industry_profiles
```

경쟁사와 산업은 기업별 관계를 별도로 저장한다.

---

# 66. Python 모듈

권장:

```text
backend/
├── business/
│   ├── __init__.py
│   ├── models.py
│   ├── repository.py
│   ├── analyzer.py
│   ├── prompts.py
│   ├── source_manager.py
│   ├── competitor.py
│   ├── industry.py
│   └── thesis.py
```

---

# 67. models.py

DB 객체를 표현한다.

```text
BusinessProfile
BusinessSegment
CompetitiveAdvantage
IndustryProfile
Competitor
BusinessRisk
BusinessSource
BusinessAnalysisVersion
```

---

# 68. repository.py

DB CRUD 담당.

필수 함수:

```python
get_business_profile(stock_code)
save_business_profile(profile)

get_business_segments(stock_code)
save_business_segment(segment)

get_competitive_advantages(stock_code)
save_competitive_advantage(item)

get_industry_profile(industry_id)
save_industry_profile(profile)

get_competitors(stock_code)
save_competitor(item)

get_business_risks(stock_code)
save_business_risk(item)

get_sources(stock_code)
save_source(source)

save_analysis_version(version)
```

---

# 69. analyzer.py

분석 결과를 구조화한다.

권장 함수:

```python
def build_business_context(stock_code):
    ...

def build_moat_context(stock_code):
    ...

def build_industry_context(stock_code):
    ...

def build_competitor_context(stock_code):
    ...

def build_risk_context(stock_code):
    ...

def build_full_business_analysis(stock_code):
    ...
```

---

# 70. prompts.py

AI에게 전달할 분석 프롬프트를 분리한다.

예:

```python
BUSINESS_MODEL_PROMPT
MOAT_PROMPT
INDUSTRY_PROMPT
COMPETITOR_PROMPT
RISK_PROMPT
THESIS_PROMPT
```

프롬프트에는 반드시 다음 지침을 포함한다.

```text
FACT와 COMPANY_CLAIM을 구분할 것.
근거 없는 사실을 만들지 말 것.
미래 성장률을 임의로 만들지 말 것.
확인되지 않은 경쟁우위를 확정하지 말 것.
반대 증거를 제시할 것.
출처를 표시할 것.
```

---

# 71. AI 출력 JSON

향후 API에서 구조적으로 처리할 수 있도록 JSON 형식을 권장한다.

```json
{
  "business_model": {
    "summary": "",
    "customers": [],
    "products": [],
    "revenue_model": [],
    "pricing_model": "",
    "key_drivers": []
  },
  "moat": [
    {
      "type": "SWITCHING_COST",
      "status": "PARTIAL",
      "description": "",
      "evidence": [],
      "counter_evidence": [],
      "threats": [],
      "sources": []
    }
  ],
  "industry": {
    "market_definition": "",
    "market_size": null,
    "growth_rate": null,
    "industry_stage": "",
    "supplier_power": "",
    "buyer_power": "",
    "entry_barrier": "",
    "rivalry": "",
    "substitution": ""
  },
  "competitors": [],
  "risks": [],
  "business_thesis": "",
  "check_required": []
}
```

---

# 72. AI 출력 검증

AI 응답을 DB에 저장하기 전에 다음을 검증한다.

```text
필수 JSON 필드 존재
stock_code 일치
advantage_type 유효성
status 유효성
source 존재 여부
숫자 필드 타입
```

실패하면:

```text
ERROR
```

로 처리하고 원문을 별도로 보존한다.

---

# 73. 프론트엔드 구조

```text
frontend/
├── index.html
├── css/
│   └── business.css
└── js/
    └── business.js
```

---

# 74. API

필수 API:

```http
GET /api/business/{stock_code}
GET /api/business/{stock_code}/segments
GET /api/business/{stock_code}/moat
GET /api/business/{stock_code}/industry
GET /api/business/{stock_code}/competitors
GET /api/business/{stock_code}/risks
GET /api/business/{stock_code}/sources
GET /api/business/{stock_code}/history
```

향후:

```http
POST /api/business/{stock_code}
PUT /api/business/{stock_code}
POST /api/business/{stock_code}/moat
POST /api/business/{stock_code}/risks
```

---

# 75. 기업분석 화면

종목 상세 화면에서 다음 탭을 제공한다.

```text
[기업개요]
[사업모델]
[재무]
[경쟁우위]
[산업]
[경쟁사]
[리스크]
[Thesis]
[Valuation]
```

---

# 76. 사업모델 화면

```text
기업명
업종

사업 한줄 요약

주요 제품
주요 고객
구매 의사결정자
수익모델
반복매출
가격결정 구조
핵심 Driver
가치사슬 위치
```

---

# 77. 경쟁우위 화면

예:

```text
경쟁우위

[전환비용]

상태: PARTIAL

근거
- ...
- ...

반대 근거
- ...

위협
- ...

출처
- ...
```

해자 점수는 표시하지 않는다.

---

# 78. 산업 화면

```text
산업명
시장 정의
시장규모
시장성장률
산업단계
경기민감도

경쟁구조
├── 기존 경쟁
├── 신규 진입
├── 공급자
├── 구매자
└── 대체재

기술변화
규제
CAPEX 구조
```

---

# 79. 경쟁사 화면

```text
                대상기업   경쟁사A   경쟁사B
제품
고객
시장
매출
성장률
영업이익률
ROIC
시장점유율
가격전략
경쟁우위
```

03 데이터가 있으면 자동 연결한다.

---

# 80. 리스크 화면

```text
리스크

고객 집중
공급망
경쟁
대체재
기술
규제
CAPEX
원자재
환율
경기
```

각 리스크에:

```text
무엇인가?
재무 영향은?
무엇을 관찰해야 하는가?
```

를 표시한다.

---

# 81. 업데이트 정책 (V2 — V1은 매 조회마다 실시간 재생성, §0 참고)

V1에서는 저장 자체를 하지 않으므로 "갱신 주기"라는 개념이 없다 — 조회할 때마다 최신 데이터로 Gemini가 새로 생성한다. 아래는 V2에서 저장 기능을 추가할 경우의 갱신 정책이다.

시장 데이터와 달리 사업모델 데이터는 매일 갱신하지 않는다.

기본 업데이트 조건:

```text
신규 후보 편입
분기 실적 발표
사업보고서 변경
대규모 신규 계약
M&A
주요 제품 출시
규제 변경
경쟁사 구조 변화
기술 변화
```

---

# 82. 분석 버전관리 (V2 — §0 참고, V1은 저장하지 않으므로 버전관리 대상이 없음)

분석을 덮어쓰지 않고 버전을 남긴다.

예:

```text
2026-09-01
해자 가설:
높은 전환비용

2027-03-01
새로운 경쟁사 등장
→ 기존 해자 가설 재검토
```

이를 통해 투자 당시의 가설과 실제 결과를 사후 비교할 수 있다.

---

# 83. Thesis 변화 감지

향후 V2 기능:

```text
기존 Thesis
     ↓
새로운 공시/실적
     ↓
변화 탐지
     ↓
AI 비교
     ↓
변경된 가정
     ↓
사용자 확인
```

AI가 자동으로 매도 결론을 내리지 않는다.

---

# 84. 자동화 수준

V1의 권장 구조 (§0 정책 반영 — DB 저장 단계 없음):

```text
03/02 D1 데이터 (재무/시장)
        ↓
기업 자료 컨텍스트 구성
        ↓
AI 분석 (Gemini, 실시간 호출)
        ↓
사용자 검토 (화면에서만)
```

V2에서 저장 기능을 추가할 경우 다음과 같이 확장한다.

```text
...
        ↓
AI 분석 초안
        ↓
사용자 검토
        ↓
저장 (V2)
```

사업모델과 해자는 완전 자동화보다 사용자 검토를 필수 단계로 둔다.

---

# 85. 확증편향 방지 규칙

AI 분석에는 반드시 다음 질문을 포함한다.

```text
이 가설을 반박하는 증거는 무엇인가?

현재 경쟁우위가 사라질 수 있는 이유는 무엇인가?

경쟁사가 동일한 제품을 만들면 고객이 이동할 가능성은?

현재 높은 ROIC가 구조적 경쟁우위 때문인가,
아니면 일시적인 산업 호황 때문인가?

산업 성장 없이도 회사가 성장할 수 있는가?
```

---

# 86. 03 재무와 Moat 연결 규칙

다음과 같은 단순 연결은 금지한다.

```text
ROIC 높음
→ 해자 있음
```

대신:

```text
ROIC 높음
+
높은 마진 지속
+
시장점유율 유지/상승
+
가격결정력 근거
+
고객 전환비용
+
경쟁사 진입장벽
```

등을 종합하여 해자 가설을 구성한다.

그리고 반드시 반대 증거를 확인한다.

---

# 87. 산업 성장과 기업 성장 분리

예:

```text
산업 성장률 20%
기업 성장률 20%
```

이면 반드시 회사가 경쟁우위를 통해 성장했다고 판단하지 않는다.

반대로:

```text
산업 성장률 2%
기업 성장률 15%
```

이면 점유율 증가 또는 제품 믹스 변화 등을 확인한다.

---

# 88. 자본효율성 연결

사업모델 분석은 자본투자와 연결한다.

질문:

```text
추가 매출 100억원을 만들기 위해 CAPEX가 얼마나 필요한가?
추가 성장에 운전자본이 얼마나 필요한가?
성장할수록 FCF가 증가하는가?
성장할수록 ROIC가 유지되는가?
```

03의:

```text
CAPEX
CFO
FCF
ROIC
재고
매출채권
매입채무
```

와 연결한다.

---

# 89. 성장의 질

성장은 다음처럼 분해한다.

```text
가격
수량
점유율
M&A
환율
신제품
지역확장
```

가능하면 단순 매출성장률보다 성장 원인을 설명한다.

---

# 90. AI 분석 결과 예시 구조

```text
[사업모델]

한줄:
B2B 제조기업으로 고객사의 생산공정에 필요한 핵심 장비를 공급.

고객:
글로벌 제조사

수익:
장비 판매 + 유지보수

가격:
고객별 협상가격

핵심 Driver:
판매수량 / ASP / 가동률

[경쟁우위]

전환비용
상태: PARTIAL

근거:
...

반대근거:
...

[산업]

시장:
...

성장:
...

경쟁:
...

[리스크]

고객집중:
...

기술:
...

규제:
...

[Business Thesis]

...
```

---

# 91. 구현 순서 (V1 — §0 정책 반영)

개발은 다음 순서로 진행한다. V1은 DB 스키마 구현 없이 Gemini 실시간 호출 + 화면 표시로 완결된다.

## Phase 1

프롬프트/스키마:

```text
prompts.py (§70)
AI 출력 JSON 스키마 (§71)
AI 출력 검증 (§72)
```

## Phase 2

API:

```text
GET /api/business/{stock_code}   ← Gemini를 실시간 호출해 JSON을 그대로 반환 (DB 조회 아님)
```

## Phase 3

Frontend:

```text
사업모델
경쟁우위
산업
경쟁사
리스크
Business Thesis
```

## Phase 4

03 연계:

```text
재무지표 → 사업모델/해자 화면 (더블클릭 진입, 07_PRODUCT_SPEC.md §3.2)
```

## Phase 5

05 Valuation 연계:

```text
Business Thesis
→ Valuation Assumptions
```

단, 04가 valuation 숫자를 생성하지 않는다.

## V2 Phase (참고용 — V1 범위 아님)

§57~§65의 DB 스키마(business_profiles, business_segments, competitive_advantages, industry_profiles, competitors, business_risks, business_sources, business_analysis_versions)와 §68 repository.py CRUD, §82 분석 버전관리는 저장 기능이 실제로 필요해지는 시점에 V2로 구현한다.

---

# 92. 테스트 기준

## Unit Test

### 사업모델

```text
B2B 분류
B2C 분류
Subscription
Product Sale
Mixed
```

### 해자

```text
유효한 advantage_type
잘못된 advantage_type
복수 경쟁우위
반대증거 없음
```

### 산업

```text
시장규모 NULL
성장률 NULL
기간 오류
통화 오류
```

### 경쟁사

```text
동일 기업 중복
자기 자신 경쟁사 등록
종목코드 오류
```

### 출처

```text
URL 중복
source_hash 중복
날짜 형식 오류
```

---

# 93. 데이터 품질 규칙

다음은 금지한다.

```text
공개되지 않은 고객 비중 추정
공개되지 않은 시장점유율 추정
특허 개수만으로 해자 확정
ROIC만으로 해자 확정
매출 성장률만으로 산업 성장성 확정
AI가 만든 숫자를 FACT로 저장
```

---

# 94. 최종 API 응답 예시

```json
{
  "stock_code": "000000",
  "company_name": "Example",
  "business": {
    "summary": "...",
    "customers": ["B2B"],
    "products": ["..."],
    "revenue_model": ["PRODUCT_SALE"],
    "pricing_model": "NEGOTIATED",
    "key_drivers": ["volume", "ASP"]
  },
  "moat": [
    {
      "type": "SWITCHING_COST",
      "status": "PARTIAL",
      "evidence": ["..."],
      "counter_evidence": ["..."]
    }
  ],
  "industry": {
    "name": "...",
    "market_definition": "...",
    "growth_rate": null,
    "industry_stage": "GROWTH"
  },
  "competitors": [],
  "risks": [],
  "business_thesis": "...",
  "updated_at": "2026-09-18"
}
```

---

# 95. 완료 기준

04 모듈은 다음 조건을 만족하면 V1 완료로 본다.

```text
[ ] 종목 입력
[ ] 기업 기본정보 조회
[ ] 사업모델 조회
[ ] 제품/고객 조회
[ ] 수익모델 조회
[ ] 가격결정력 조회
[ ] 가치사슬 조회
[ ] 경쟁우위 조회
[ ] 해자 근거/반대근거 조회
[ ] 산업정보 조회
[ ] 경쟁사 조회
[ ] 리스크 조회
[ ] 출처 조회
[ ] Business Thesis 조회
[ ] 03 재무지표 연결
[ ] Gemini 실시간 호출 및 화면 표시 (DB 저장 없음, §0)
[ ] 프론트엔드 테스트
```

다음 항목은 V2로 이동하며 V1 완료 기준에서 제외한다: 분석 수정/분석 저장/분석 버전 저장/DB API 테스트 (§57~§70 V2 설계 참고).

---

# 96. 04 모듈의 최종 산출물

사용자가 종목 하나를 선택했을 때 다음과 같은 흐름으로 읽을 수 있어야 한다.

```text
① 무엇을 파는 회사인가?
        ↓
② 누구에게 파는가?
        ↓
③ 고객은 왜 사는가?
        ↓
④ 어떻게 돈을 버는가?
        ↓
⑤ 가격을 누가 결정하는가?
        ↓
⑥ 경쟁자는 누구인가?
        ↓
⑦ 경쟁사가 따라 하기 어려운 것은 무엇인가?
        ↓
⑧ 그 해자의 증거는 무엇인가?
        ↓
⑨ 반대 증거는 무엇인가?
        ↓
⑩ 산업은 성장하는가?
        ↓
⑪ 회사 성장은 산업 성장인가 점유율 증가인가?
        ↓
⑫ 추가 성장에 얼마나 많은 자본이 필요한가?
        ↓
⑬ 가장 중요한 사업 리스크는 무엇인가?
        ↓
⑭ 앞으로 무엇을 관찰해야 하는가?
        ↓
⑮ Business Thesis
        ↓
05 Valuation
```

---

# 97. 핵심 설계 철학

이 모듈은 "좋은 회사"를 자동으로 골라주는 기능이 아니다.

사용자가 스스로 판단할 수 있도록:

```text
사업의 구조
+
경제적 해자의 원천
+
해자의 증거
+
반대 증거
+
산업구조
+
경쟁사
+
자본효율성
+
리스크
```

를 한 화면과 하나의 데이터 구조로 연결하는 것이 목적이다.

최종 판단은 05 Valuation에서 가격과 기대수익률을 결합한 후 06 Portfolio/Kelly에서 포트폴리오 관점으로 수행한다.
