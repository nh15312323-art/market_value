# 08_TECHNICAL_SPEC.md

## 1. 목적

본 문서는 1인 개인용 국내주식 투자 분석 시스템을 무료 인프라 중심으로 구축하기 위한 최종 기술구조를 정의한다.

대상 기능:
- KOSPI/KOSDAQ 시장 스크리닝
- 거래대금 Z10/Z20
- 1/5/10/20/60/120일 모멘텀
- KOSPI 상대강도
- 52주/3년/5년/10년 최고가
- DART 기반 10년 분기/연간 재무분석
- BPS × 10년 평균 ROE 기반 기대수익률 계산 (PER/PBR 방식은 사용하지 않음, `05_VALUATION.md` 참고)
- 기업 비즈니스 모델/해자/산업 분석 (Gemini 실시간 호출, DB 미저장 — `04_BUSINESS_MOAT_INDUSTRY.md` §0, `07_PRODUCT_SPEC.md` §4 참고)
- 후보종목 관리
- 포트폴리오 및 매매기록
- 향후 AI 분석 연계

핵심 원칙:
1. 1인 사용
2. 무료 우선
3. 과도한 시스템 구축 금지
4. 원천데이터와 계산데이터 분리
5. 재실행 가능성
6. 향후 확장성

---

## 2. 최종 기술 스택

| 영역 | 기술 | 비용 목표 | 역할 |
|---|---|---:|---|
| 개발 PC | Windows + Python + VS Code | 0원 | 개발/테스트 |
| 소스관리 | GitHub Free | 0원 | 코드/버전관리 |
| 웹 서버/API | Cloudflare Workers | 0원 | 웹 API 및 서비스 |
| 웹 정적파일 | Cloudflare Workers Static Assets | 0원 | HTML/CSS/JS 제공 |
| DB | Cloudflare D1 | 0원 | SQLite 기반 개인 DB |
| 스케줄러 | Cloudflare Cron | 0원 | 정기 작업 트리거 |
| 배치 수집 | GitHub Actions + Python | 0원 목표 | KRX/DART 수집 및 가공 |
| 시장 데이터 | KRX | 0원 API/공개 데이터 범위 | 시장/가격 데이터 |
| 재무 데이터 | DART OpenDART | 0원 API | 재무제표/공시 데이터 |
| AI 분석 | Gemini | 0월 API | 기업/산업/해자/리스크 분석 |

무료 한도와 정책은 변경될 수 있으므로 실제 배포 시 최신 공식 문서를 확인한다.

---

## 3. 전체 기술 구조

```text
                    [사용자 PC/브라우저]
                            |
                            v
                 +--------------------+
                 | Cloudflare Workers |
                 | - Web API          |
                 | - 접근제어         |
                 | - DB 조회          |
                 | - 화면 제공        |
                 +---------+----------+
                           |
                           v
                    +-------------+
                    | Cloudflare  |
                    |     D1      |
                    | SQLite DB   |
                    +-------------+
                           ^
                           |
                +----------+----------+
                |                     |
                | 정기 배치           |
                v                     v
       +----------------+    +----------------+
       | GitHub Actions |    | Cloudflare     |
       | Python         |    | Cron           |
       | KRX/DART 수집  |    | 배치 트리거    |
       | 데이터 정제    |    | API 호출       |
       | 지표 계산      |    |                |
       +-------+--------+    +----------------+
               |
        +------+------+
        v             v
      KRX           DART
   시장 데이터     재무/공시
```

---

## 4. 핵심 역할 분담

### Python = Data Engineering / Batch

- KRX 데이터 수집
- DART 데이터 수집
- 복잡한 데이터 정제
- 재무제표 계정 매핑
- 분기 단독값 계산
- 복잡한 지표 계산
- 대량 데이터 처리
- 테스트

### Cloudflare = Web / API / DB

- 웹 서비스
- API
- DB 조회/저장
- 간단한 계산
- 접근제어
- 배치 트리거

원칙:

```text
Python = 데이터 수집/가공/계산
Cloudflare = 웹/API/DB
```

---

## 5. Python 데이터 수집

### KRX

```text
KRX
 -> 일별 시장 데이터
 -> raw_market_daily
```

수집 대상:
- 기준일
- 시장
- 종목코드
- 종목명
- 종가
- 거래량
- 거래대금
- 시가총액

### DART

```text
종목명
 -> 종목코드
 -> DART corp_code
 -> DART 재무제표
 -> raw_financial
 -> normalized_financial
```

최초 조회:
- 최근 10년 이상 필요한 기간 확보

재조회:
- DB 마지막 기간 확인
- 신규/누락 기간만 수집
- 정정공시는 최신 유효 버전 반영

---

## 6. 재무 데이터 정규화

기업별 계정명을 표준 계정으로 매핑한다.

예:

```text
매출액 / 매출 / 영업수익
        -> REVENUE
```

표준 계정:

```text
REVENUE
COST_OF_REVENUE
OPERATING_INCOME
NET_INCOME
CFO
CAPEX
CURRENT_ASSETS
INVENTORY
TRADE_RECEIVABLES
TRADE_PAYABLES
INTANGIBLE_ASSETS
CURRENT_LIABILITIES
TOTAL_ASSETS
TOTAL_LIABILITIES
TOTAL_EQUITY
INTEREST_EXPENSE
EPS
DIVIDEND
SHARES
```

---

## 7. 분기 데이터 처리

DART에서 누적 기준으로 제공되는 경우 단독 분기를 계산한다.

```text
Q1 = Q1 누적
Q2 = Q2 누적 - Q1 누적
Q3 = Q3 누적 - Q2 누적
Q4 = 연간 - Q3 누적
```

주의:
- 손익/현금흐름의 누적값과 단독값을 구분한다.
- 재무상태표는 분기말 잔액이다.
- 연결/별도 재무제표를 혼합하지 않는다.
- 가능한 경우 연결재무제표를 우선한다.
- 연간 데이터는 DART 연간 데이터를 별도로 보존한다.

---

## 8. 시장 스크리닝 계산

### 거래대금 Z-score

```text
ZTV10 = (오늘 거래대금 - 직전 10개 유효일 평균)
        / 직전 10개 유효일 표준편차

ZTV20 = (오늘 거래대금 - 직전 20개 유효일 평균)
        / 직전 20개 유효일 표준편차
```

원칙:
- 오늘은 기준기간에서 제외
- 거래정지일은 0이 아니라 제외
- Z10은 직전 유효일 10개 미만이면 NA
- Z20은 최대 20개, 최소 10개 필요
- 표준편차가 0이면 NA
- 모집단 표준편차(ddof=0)

### 가격 모멘텀

```text
R_n = 현재 수정주가 / n일 전 수정주가 - 1
```

기간:
- 1D
- 5D
- 10D
- 20D
- 60D
- 120D

가중 모멘텀:

```text
M = 0.5*R20 + 0.3*R60 + 0.2*R120
```

### KOSPI 상대강도

```text
RS5   = 종목 R5   - KOSPI R5
RS10  = 종목 R10  - KOSPI R10
RS20  = 종목 R20  - KOSPI R20
RS60  = 종목 R60  - KOSPI R60
RS120 = 종목 R120 - KOSPI R120
```

(`02_market_screening.md` §11.4와 동일하게 5D/10D/20D/60D/120D 5개 기간을 모두 계산한다. 1D RS는 정의하지 않는다.)

현재 KOSDAQ 종목도 KOSPI를 비교 기준으로 사용한다.

### 최고가

수정주가 기준:
- 52주 = 252 거래일
- 3년 = 약 756 거래일
- 5년 = 약 1,260 거래일
- 10년 = 약 2,520 거래일

각 기간:
- 최고가
- 최고가 날짜
- 현재가/최고가
- 최고가 대비 하락률

---

## 9. 수정주가 계층

```text
raw_price
 -> corporate_action
 -> adjusted_price
 -> return/high calculation
```

배당, 액면분할, 병합, 무상증자 등 기업행위를 별도 계층에서 관리한다.

---

## 10. DB: Cloudflare D1

D1은 SQLite 기반이므로 SQLite 호환 SQL을 기본으로 한다.

### companies

```sql
companies (
    corp_code TEXT PRIMARY KEY,
    stock_code TEXT UNIQUE,
    stock_name TEXT NOT NULL,
    market TEXT,
    listed_date TEXT,
    updated_at TEXT
)
```

### market_daily

```sql
market_daily (
    market_date TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    market TEXT,
    close_price REAL,
    volume INTEGER,
    trading_value REAL,
    market_cap REAL,
    PRIMARY KEY (market_date, stock_code)
)
```

### adjusted_price_daily

```sql
adjusted_price_daily (
    market_date TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    adjusted_close REAL,
    adjustment_factor REAL,
    PRIMARY KEY (market_date, stock_code)
)
```

### corporate_actions

```sql
corporate_actions (
    stock_code TEXT NOT NULL,
    action_date TEXT NOT NULL,
    action_type TEXT NOT NULL,
    adjustment_factor REAL,
    source TEXT,
    PRIMARY KEY (stock_code, action_date, action_type)
)
```

### financial_periods

```sql
financial_periods (
    corp_code TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER,
    period_type TEXT NOT NULL,
    statement_type TEXT NOT NULL,
    report_date TEXT,
    rcept_no TEXT,
    retrieved_at TEXT,
    PRIMARY KEY (
        corp_code, fiscal_year, quarter,
        period_type, statement_type
    )
)
```

### raw_financial

```sql
raw_financial (
    corp_code TEXT NOT NULL,
    stock_code TEXT,
    fiscal_year INTEGER NOT NULL,
    report_period TEXT NOT NULL,
    statement_type TEXT NOT NULL,
    account_code TEXT,
    account_name TEXT,
    value REAL,
    unit TEXT,
    rcept_no TEXT,
    report_date TEXT,
    retrieved_at TEXT,
    version_no INTEGER,
    PRIMARY KEY (
        corp_code, fiscal_year, report_period,
        statement_type, account_code, version_no
    )
)
```

### financial_quarterly

```sql
financial_quarterly (
    corp_code TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    quarter INTEGER NOT NULL,
    revenue REAL,
    cost_of_revenue REAL,
    operating_income REAL,
    net_income REAL,
    revenue_growth REAL,
    operating_margin REAL,
    eps REAL,
    eps_growth REAL,
    cfo REAL,
    capex REAL,
    fcf REAL,
    current_assets REAL,
    inventory REAL,
    trade_receivables REAL,
    trade_payables REAL,
    intangible_assets REAL,
    current_liabilities REAL,
    interest_coverage REAL,
    debt_ratio REAL,
    dividend REAL,
    roe REAL,
    roic REAL,
    data_status TEXT,
    calculated_at TEXT,
    PRIMARY KEY (corp_code, fiscal_year, quarter)
)
```

### financial_annual

```sql
financial_annual (
    corp_code TEXT NOT NULL,
    fiscal_year INTEGER NOT NULL,
    revenue REAL,
    cost_of_revenue REAL,
    operating_income REAL,
    net_income REAL,
    revenue_growth REAL,
    operating_margin REAL,
    eps REAL,
    eps_growth REAL,
    cfo REAL,
    capex REAL,
    fcf REAL,
    current_assets REAL,
    inventory REAL,
    trade_receivables REAL,
    trade_payables REAL,
    intangible_assets REAL,
    current_liabilities REAL,
    interest_coverage REAL,
    debt_ratio REAL,
    dividend REAL,
    roe REAL,
    roic REAL,
    data_status TEXT,
    calculated_at TEXT,
    PRIMARY KEY (corp_code, fiscal_year)
)
```

### screening_results

```sql
screening_results (
    market_date TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    rank INTEGER NOT NULL,
    stock_code TEXT NOT NULL,
    value REAL,
    created_at TEXT,
    PRIMARY KEY (market_date, metric_name, rank)
)
```

metric_name 예:

```text
ZTV10
ZTV20
RETURN_1D
RETURN_5D
RETURN_10D
RETURN_20D
RETURN_60D
RETURN_120D
MOMENTUM_WEIGHTED
RS5
RS10
RS20
RS60
RS120
HIGH_52W
HIGH_3Y
HIGH_5Y
HIGH_10Y
```

### portfolio

```sql
portfolio (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stock_code TEXT NOT NULL,
    quantity REAL NOT NULL,
    average_price REAL,
    target_weight REAL,
    thesis TEXT,
    status TEXT,
    updated_at TEXT
)
```

### trades

```sql
trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trade_date TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    side TEXT NOT NULL,
    quantity REAL NOT NULL,
    price REAL NOT NULL,
    fee REAL,
    tax REAL,
    note TEXT,
    created_at TEXT
)
```

### candidates

```sql
candidates (
    stock_code TEXT PRIMARY KEY,
    first_selected_date TEXT,
    latest_selected_date TEXT,
    reason TEXT,
    status TEXT,
    memo TEXT,
    updated_at TEXT
)
```

### valuation

`05_VALUATION.md` §16의 BPS × 10년 평균 ROE 모형과 동일한 스키마를 사용한다 (PER/PBR 필드는 사용하지 않음 — `05`는 명시적으로 PER/PBR Band 방식을 V1 범위에서 제외한다).

```sql
valuation (
    stock_code TEXT PRIMARY KEY,

    price_basis_date TEXT NOT NULL,
    bps_basis_period TEXT,

    bps REAL,
    roe_avg REAL,
    roe_years_used INTEGER,

    roe_start_year INTEGER,
    roe_end_year INTEGER,

    future_bps REAL,
    current_price REAL,
    upside_multiple REAL,
    expected_return REAL,

    status TEXT NOT NULL,

    calculation_version TEXT NOT NULL,
    updated_at TEXT NOT NULL
)
```

---

## 11. DB 관계

```text
companies
 |
 +-- market_daily
 |      +-- adjusted_price_daily
 |
 +-- financial_periods
 |      +-- raw_financial
 |      +-- financial_quarterly
 |      +-- financial_annual
 |
 +-- screening_results
 +-- candidates
 +-- portfolio
 |      +-- trades
 +-- valuation
```

---

## 12. 데이터 보존

원천 데이터는 장기간 보존한다.

```text
raw_market
raw_financial
corporate_actions
```

정규화 데이터:

```text
market_daily
adjusted_price_daily
financial_quarterly
financial_annual
```

결과 데이터:

```text
screening_results
```

### 10년 데이터 정책

화면 기본 조회범위는 최근 10년이다.

그러나 DB에서 과거 데이터를 자동 삭제하지 않는다.

```text
최초 조회
 -> 최근 10년 확보

시간 경과
 -> 기존 데이터 유지
 -> 신규 기간 추가

결과
 -> DB에는 10년 이상 누적 가능
 -> 화면 기본값은 최근 10년
```

---

## 13. 증분 업데이트

```text
DB 마지막 기간 확인
        ↓
DART 최신 기간 확인
        ↓
신규/누락 기간 수집
        ↓
기존 데이터와 병합
        ↓
파생지표 재계산
```

동일 데이터를 재수집해도 중복되지 않도록 UPSERT/idempotent 처리를 사용한다.

---

## 14. 정정공시

원천 데이터에 다음을 보존한다.

```text
rcept_no
report_date
retrieved_at
version_no
```

화면에는 최신 유효 데이터를 사용한다.

원천 데이터 자체를 덮어쓰지 않고 버전을 보존한다.

---

## 15. 재무지표 계산

### 매출성장률

```text
현재 기간 매출 / 전년 동기 매출 - 1
```

### 영업이익률

```text
영업이익 / 매출액 × 100
```

### FCF

```text
FCF = 영업활동현금흐름 - CAPEX
```

### CAPEX

유형자산 및 무형자산 취득 관련 현금유출을 기본으로 사용한다.

### 이자보상배율

```text
영업이익 / 이자비용
```

이자비용이 0 또는 미확인인 경우 무한대로 표시하지 않고 NA/status 처리한다.

### 부채비율

```text
총부채 / 총자본 × 100
```

### ROE

```text
순이익 / 평균 자기자본 × 100
```

분기:

```text
(직전 분기말 자기자본 + 현재 분기말 자기자본) / 2
```

연간:

```text
(전년말 자기자본 + 당해년말 자기자본) / 2
```

### ROIC

```text
ROIC = NOPAT / Invested Capital
NOPAT = 영업이익 × (1 - 유효세율)
```

기업별 계정 구조 차이가 크므로 V1에서는 필요한 데이터가 부족하면 NA로 처리한다. ROIC 계산은 별도 Python 모듈로 분리한다.

---

## 16. 데이터 상태

```text
RAW
CALCULATED
ESTIMATED
NA
ERROR
```

계산할 수 없는 값을 임의로 0으로 대체하지 않는다.

---

## 17. API

Cloudflare Workers에서 간단한 REST API를 제공한다.

```text
GET /api/companies
GET /api/company/{stock_code}

GET /api/screening
GET /api/screening/{metric}

GET /api/financial/{stock_code}
GET /api/financial/{stock_code}/quarterly
GET /api/financial/{stock_code}/annual

GET /api/candidates
GET /api/portfolio
GET /api/trades
```

DB 용량 관리를 위한 삭제 API (개인 전용, `07_PRODUCT_SPEC.md` §5 참고):

```text
DELETE /api/admin/screening
DELETE /api/admin/financial/{stock_code}
DELETE /api/admin/valuation/{stock_code}
DELETE /api/admin/all
```

비즈니스분석(04)은 애초에 D1에 저장하지 않으므로 삭제 API 대상에 포함하지 않는다.

향후 필요 시:

```text
POST /api/candidates
POST /api/trades
PUT /api/portfolio
```

브라우저가 D1에 직접 접근하지 않고 반드시 Worker API를 통한다.

```text
Browser
 -> Worker API
 -> D1
```

---

## 18. 개인 전용 접근제어

1인 사용이므로 복잡한 회원관리 시스템을 만들지 않는다.

권장:

```text
Cloudflare Access
 -> 사용자 인증
 -> Cloudflare Worker
 -> D1
```

DB/API가 무방비로 외부에 노출되지 않도록 한다.

---

## 19. 프론트엔드

현재 `1.html` 프로토타입을 출발점으로 사용한다.

```text
frontend/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── api.js
│   ├── market.js
│   ├── financial.js
│   ├── portfolio.js
│   └── app.js
└── assets/
```

V1에서는 React/Vue를 필수로 사용하지 않는다.

현재 HTML/JavaScript가 충분하다면 Vanilla JavaScript로 먼저 완성한다.

---

## 20. Python 프로젝트 구조

```text
backend/
├── collectors/
│   ├── krx.py
│   └── dart.py
├── processors/
│   ├── market.py
│   ├── adjusted_price.py
│   ├── financial.py
│   └── account_mapping.py
├── calculations/
│   ├── screening.py
│   ├── momentum.py
│   ├── relative_strength.py
│   ├── highs.py
│   ├── financial_metrics.py
│   └── roic.py
├── db/
│   ├── schema.sql
│   ├── repository.py
│   └── upsert.py
├── config/
│   └── settings.py
└── main.py
```

---

## 21. Cloudflare 프로젝트 구조

```text
worker/
├── src/
│   ├── index.js
│   ├── routes/
│   │   ├── companies.js
│   │   ├── screening.js
│   │   ├── financial.js
│   │   ├── portfolio.js
│   │   └── candidates.js
│   ├── db/
│   │   └── queries.js
│   └── utils/
│       └── response.js
├── migrations/
│   ├── 0001_initial.sql
│   └── ...
└── wrangler.toml
```

---

## 22. GitHub 전체 폴더 구조

```text
AI-Investment/
│
├── README.md
├── AGENTS.md
│
├── docs/
│   ├── 01_INVESTMENT_PHILOSOPHY.md
│   ├── 02_MARKET_SCREENING.md
│   ├── 03_FINANCIAL_ANALYSIS.md
│   ├── 04_BUSINESS_MOAT_INDUSTRY.md
│   ├── 05_VALUATION.md
│   ├── 07_PRODUCT_SPEC.md
│   └── 08_TECHNICAL_SPEC.md
│
├── frontend/
│   ├── index.html
│   ├── css/
│   ├── js/
│   └── assets/
│
├── worker/
│   ├── src/
│   ├── migrations/
│   └── wrangler.toml
│
├── backend/
│   ├── collectors/
│   ├── processors/
│   ├── calculations/
│   ├── db/
│   └── config/
│
├── tests/
│   ├── test_market.py
│   ├── test_momentum.py
│   ├── test_financial.py
│   └── test_roic.py
│
├── data/
│   └── sample/
│
└── .github/
    └── workflows/
        ├── market_daily.yml
        └── financial_update.yml
```

---

## 23. GitHub Actions

### 시장 데이터

```text
정기 실행
 -> Python
 -> KRX 수집
 -> 데이터 검증
 -> D1 저장
 -> 스크리닝 계산
 -> 결과 저장
```

### 재무 데이터

```text
정기 실행
 -> 업데이트 대상 확인
 -> DART 조회
 -> 신규/정정 데이터 처리
 -> D1 저장
```

---

## 24. Cloudflare Cron

Cloudflare Cron은 무거운 계산 자체보다 배치 작업의 트리거로 활용한다.

```text
Cloudflare Cron
 -> Worker endpoint
 -> 배치 작업 시작/상태 확인
```

대량 KRX/DART 처리는 Python/GitHub Actions에 맡긴다.

---

## 25. 배치 처리

```text
시장 마감
  ↓
KRX 데이터 확보
  ↓
GitHub Actions
  ↓
Python
  ↓
원천 데이터 검증
  ↓
D1 raw 저장
  ↓
수정주가 계산
  ↓
모멘텀
  ↓
Z10/Z20
  ↓
상대강도
  ↓
52W/3Y/5Y/10Y High
  ↓
Top20 생성
  ↓
D1 저장
  ↓
Worker API
  ↓
웹 화면
```

---

## 26. 기준일

(`02_market_screening.md` §4, `05_VALUATION.md` §10과 동일한 기준 — 21:00으로 통일)

- 영업일 21:00 이후 → 해당 영업일
- 영업일 21:00 이전 → 직전 영업일
- 토/일/휴일 → 직전 영업일

화면:

```text
기준일: YYYY-MM-DD
```

배치 실행시각과 시장 기준일은 별도로 저장한다.

예:

```text
market_date = 2026-09-11
run_time = 2026-09-12 01:00
market_status = CLOSED
```

---

## 27. 배치 안정성

모든 배치는 재실행 가능해야 한다.

```text
동일 날짜 2회 실행
 -> 중복 데이터 생성 X
 -> 동일 결과
```

사용:
- PRIMARY KEY
- UNIQUE KEY
- UPSERT
- 작업 실행 로그

향후 작업 로그:

```sql
job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    status TEXT,
    market_date TEXT,
    rows_processed INTEGER,
    error_message TEXT
)
```

---

## 28. 데이터 검증

### 시장 데이터

- 종목코드 존재
- 시장 구분 존재
- 가격 > 0
- 거래대금 >= 0
- 중복 여부
- 기준일 일치 여부

### 재무 데이터

- 금액 단위 확인
- 연결/별도 혼합 여부
- 기간 확인
- 계정코드 확인
- 정정공시 확인

검증 실패 시 기존 정상 데이터를 임의로 덮어쓰지 않는다.

---

## 29. V1 화면

```text
① 시장 스크리닝
② 종목 검색
③ 재무분석
④ 기업분석 (비즈니스분석)
⑤ 가치평가
⑥ 후보종목
⑦ 포트폴리오
⑧ 매매기록
```

①③④⑤ 4개 탭 사이의 구체적인 이동 방식(종목/회사명 더블클릭, 각 탭에서의 직접 검색 진입, D1 저장 여부)은 `07_PRODUCT_SPEC.md` §2~§4에 정의되어 있으며, 이 문서(06/08)의 화면 목록은 그 요약이다.

시장 스크리닝은 각 지표별 독립 Top20을 제공한다.

```text
거래대금: Z10 / Z20
모멘텀: 1D / 5D / 10D / 20D / 60D / 120D / 가중
상대강도: RS20 / RS60 / RS120
고가: 52주 / 3년 / 5년 / 10년
```

임의의 종합점수는 만들지 않는다.

---

## 30. 종목 상세

```text
종목명
현재가
시가총액
시장

시장 스크리닝 위치
 ├─ 거래대금 Z
 ├─ 모멘텀
 ├─ 상대강도
 └─ 최고가

재무
 ├─ 분기
 └─ 연간

가치평가
기업분석
포트폴리오
```

---

## 31. 재무분석 화면

분기와 연간을 완전히 구분한다.

### 분기

```text
연도 | 분기 | 매출 | 매출원가 | 영업이익 | 순이익
     | 매출성장률 | 영업이익률 | EPS | EPS성장률
     | CFO | CAPEX | FCF
     | 유동자산 | 재고 | 매출채권 | 매입채무
     | 무형자산 | 유동부채
     | 이자보상배율 | 부채비율 | 배당
     | ROE | ROIC
```

### 연간

동일 항목을 연도별로 표시한다.

---

## 32. 단위

DB는 원천 단위를 가능한 한 보존한다.

화면 기본:
- 금액 = 억원
- 주가 = 원
- 비율 = %
- EPS = 원/주

---

## 33. 오류 처리

오류가 발생했을 때 임의의 숫자를 표시하지 않는다.

```text
N/A
데이터 부족
계산 불가
정정공시 확인 필요
```

등으로 표시한다.

---

## 34. V1 제외 범위

- 복잡한 DCF
- 미래 실적 자동예측
- 애널리스트 컨센서스 자동수집
- 자동 매수/매도 추천
- 종합 0~100점 투자점수
- 자동 승자/패자 판단
- 고급 백테스트
- 자동 뉴스 감성점수
- 실시간 틱 데이터
- 멀티유저 권한관리
- 모바일 네이티브 앱

---

## 35. V2 후보

V1 안정화 후 검토:

```text
DCF
역사적 PER/PBR 밴드
뉴스/공시 변화 감지
경쟁사 자동 비교
실적 발표 변화 감지
투자 Thesis 관리
포트폴리오 위험관리
백테스트
팩터 분석
알림
```

---

## 36. AI 역할

AI는 DB의 숫자를 임의로 생성하지 않는다.

입력:

```text
D1 객관적 데이터
+
DART 공시
+
기업 사업자료
+
사용자 투자철학
```

출력:

```text
사업모델
고객
수익구조
가격결정력
경쟁우위
산업구조
리스크
투자논리의 강점/약점
확인해야 할 사항
```

AI가 임의로 미래 성장률이나 성공확률을 만들어내지 않는다.

---

## 37. 개발 순서

### STEP 1
현재 프로토타입 보존

```text
1.html
python_code.txt
marketscreen.txt
```

### STEP 2
GitHub repository 생성

### STEP 3
Python 모듈화

```text
collectors
processors
calculations
db
tests
```

### STEP 4
시장 데이터 완성

```text
KRX
→ market_daily
→ Z10/Z20
→ momentum
→ RS
→ High
→ Top20
```

### STEP 5
D1 연결

### STEP 6
Worker API 구축

### STEP 7
HTML 연결

### STEP 8
DART 재무분석 추가

### STEP 9
후보종목/포트폴리오 추가

### STEP 10
GitHub Actions 자동화

### STEP 11
Cloudflare 배포 및 개인 접근제어

---

## 38. V1 완료 조건

### 시장
- [ ] KOSPI/KOSDAQ
- [ ] 시가총액 500억원 이상
- [ ] Z10/Z20
- [ ] 1/5/10/20/60/120일 수익률
- [ ] 가중 모멘텀
- [ ] KOSPI 상대강도
- [ ] 52주/3년/5년/10년 최고가
- [ ] 각 지표별 Top20

### 재무
- [ ] 종목명 검색
- [ ] DART corp_code 매핑
- [ ] 최근 10년 분기
- [ ] 최근 10년 연간
- [ ] 요청된 재무항목 전체
- [ ] 분기 단독값
- [ ] 성장률
- [ ] FCF
- [ ] ROE
- [ ] ROIC
- [ ] N/A 처리

### DB
- [ ] 원천/정규화/계산 데이터 분리
- [ ] 중복 방지
- [ ] 증분 업데이트
- [ ] 정정공시 버전관리

### 웹
- [ ] 종목 검색
- [ ] 시장 Top20
- [ ] 재무표
- [ ] 후보종목
- [ ] 포트폴리오
- [ ] 매매기록

### 운영
- [ ] GitHub 저장
- [ ] Cloudflare 배포
- [ ] D1 연결
- [ ] 자동 배치
- [ ] 개인 접근제어

---

## 39. 최종 확정안

기본 운영 구조:

```text
GitHub
  +
Python
  +
GitHub Actions
  +
Cloudflare Workers
  +
Cloudflare D1
  +
KRX
  +
DART
```

역할:

```text
Python
= 수집 + 정제 + 복잡한 계산 + 테스트

GitHub Actions
= Python 정기 실행

D1
= 영구 데이터 저장

Cloudflare Workers
= 웹/API/접근제어

HTML/JS
= 사용자 화면

Gemini api
= 기업/산업/해자/리스크 분석 보조
```

핵심 원칙은 **처음부터 유료 서버를 만들지 않고 1인 사용에 필요한 수준으로 단순하게 구축한 뒤, 데이터와 기능이 커질 때만 확장하는 것**이다.
