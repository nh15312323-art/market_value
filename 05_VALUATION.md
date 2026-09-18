# 05. Valuation

> Valuation 탭 진입 방식(재무분석 탭에서 더블클릭 / 탭에서 직접 회사명 검색)과 DB 삭제 기능은 `07_PRODUCT_SPEC.md` §3.4, §5를 함께 참고한다.

## 1. 목적

본 문서는 AI-Investment 프로젝트의 **단순 Valuation 모형**을 정의한다.

본 Valuation은 복잡한 DCF, PER/PBR Band, 애널리스트 전망치 등을 사용하지 않고, **최근 분기 BPS와 과거 ROE 평균을 이용하여 미래 BPS를 계산하고 현재 주가와 비교**하는 방식으로 구성한다.

핵심 흐름은 다음과 같다.

```text
최근 확인 가능한 분기 BPS
        ↓
최근 최대 10개년 연간 ROE 평균
        ↓
미래 BPS 계산
        ↓
현재 주가와 비교
        ↓
상승배수 계산
        ↓
연환산 기대수익률 계산
```

---

# 2. Valuation 기본 공식

기호는 다음과 같이 정의한다.

| 기호 | 의미 |
|---|---|
| `BPS₀` | 가장 최근에 확인 가능한 유효 분기 BPS |
| `ROE_avg` | 최근 최대 10개년의 유효한 연간 ROE 평균 |
| `N` | ROE 평균에 실제 사용된 연수 |
| `Current Price` | 가장 최근 유효한 시장 종가 |
| `Future BPS` | ROE 평균을 적용하여 계산한 미래 BPS |
| `Upside Multiple` | 미래 BPS / 현재 주가 |
| `Expected Return` | 상승배수의 연환산 수익률 |

## 2.1 미래 BPS

```text
Future BPS
= BPS₀ × (1 + ROE_avg)^N
```

## 2.2 상승배수

```text
Upside Multiple
= Future BPS / Current Price
```

## 2.3 기대수익률

```text
Expected Return
= (Upside Multiple^(1/N)) - 1
```

동일한 식을 합쳐서 표현하면 다음과 같다.

```text
Expected Return
= (Future BPS / Current Price)^(1/N) - 1
```

---

# 3. 데이터 출처 및 연결

Valuation은 새로운 재무 데이터를 별도로 수집하지 않는다.

```text
02 Market Screening
        │
        └── 현재 주가
              │
              ▼
        05 Valuation
              ▲
              │
03 Financial Analysis
        │
        ├── 최근 분기 BPS
        │
        └── 연간 ROE
```

## 3.1 데이터별 출처

| 데이터 | 출처 | 사용 목적 |
|---|---|---|
| 현재 주가 | Market Data | 상승배수 계산 |
| 기준일 | Market Data | Valuation 기준일 |
| 최근 분기 BPS | Financial Analysis | 미래 BPS의 출발점 |
| 연간 ROE | Financial Analysis | 미래 BPS 성장률 |
| ROE 사용연수 | Financial Analysis | 연환산 기간 |

**ROE는 03 Financial Analysis에서 이미 계산된 값을 그대로 사용한다.**

05 Valuation에서는 ROE를 다시 계산하지 않는다.

---

# 4. 최근 분기 BPS

## 4.1 기본 원칙

`BPS₀`은 현재 DB에 저장된 데이터 중 **가장 최근의 유효한 분기말 BPS**를 사용한다.

예:

```text
2026 Q2 BPS 존재
→ 2026 Q2 BPS 사용

2026 Q2 BPS 없음
2026 Q1 BPS 존재
→ 2026 Q1 BPS 사용
```

모든 종목이 반드시 같은 분기를 사용할 필요는 없다.

## 4.2 BPS 기준기간 표시

화면에는 BPS의 기준기간을 반드시 표시한다.

예:

```text
BPS 기준: 2026 Q2
BPS: 58,240원
```

## 4.3 BPS 데이터 출처

BPS는 03 Financial Analysis의 데이터와 연결한다.

가능한 경우 DART에서 제공되는 BPS를 사용하고, 직접 계산이 필요한 경우 03 Financial Analysis의 BPS 산출 규칙을 따른다.

기본적인 계산 개념은 다음과 같다.

```text
BPS
= 지배기업 소유주지분 / 기말 보통주 기준 주식수
```

실제 계정과 주식수의 매핑은 03 Financial Analysis의 계정 매핑 규칙을 따른다.

---

# 5. 10년 평균 ROE

## 5.1 연간 ROE를 사용

10년 평균 ROE는 분기 ROE를 평균하지 않는다.

**최근 연도부터 과거 방향으로 최대 10개의 유효한 연간 ROE**를 사용한다.

예:

```text
2025 ROE 12%
2024 ROE 10%
2023 ROE  8%
...
2016 ROE 11%
```

유효한 연간 ROE가 10개라면 10개를 평균한다.

## 5.2 10년 미만이면 존재하는 만큼만 사용

10개의 연간 ROE가 존재하지 않는 경우에는 실제 확보된 유효 데이터만 사용한다.

예:

```text
유효 ROE 8개 → 8개 평균
유효 ROE 5개 → 5개 평균
유효 ROE 3개 → 3개 평균
```

없는 연도의 ROE를 `0%`로 넣지 않는다.

## 5.3 평균 계산

```text
ROE_avg
= 유효 연간 ROE 합계 / N
```

여기서 `N`은 실제 평균에 사용된 ROE의 개수다.

예:

```text
ROE = 8%, 10%, 12%, 14%, 16%

ROE_avg = 12%
N = 5
```

---

# 6. ROE 유효성 처리

## 6.1 평균에 포함

03 Financial Analysis에서 유효한 연간 ROE로 확인된 값은 평균에 포함한다.

다음과 같은 값은 평균에서 제외한다.

- `NA`
- `ERROR`
- ROE 계산에 필요한 데이터가 없는 경우
- 자기자본이 유효하지 않아 ROE의 경제적 의미가 없는 경우

## 6.2 음수 ROE

정상적인 자기자본을 기준으로 계산된 **음수 ROE는 유효한 값이면 평균에 포함**한다.

예:

```text
ROE = -8%
```

손실이 발생한 해당 연도의 실제 수익성을 반영하므로 임의로 제거하거나 0%로 변경하지 않는다.

## 6.3 극단값

V1에서는 ROE에 임의의 상·하한을 적용하지 않는다.

따라서 유효한 값이라면 다음과 같은 값도 그대로 평균에 반영한다.

```text
ROE = 35%
ROE = -25%
```

Winsorizing, 이상치 제거 등의 별도 조정은 하지 않는다.

---

# 7. 미래 BPS 계산

## 7.1 공식

```text
Future BPS
= BPS₀ × (1 + ROE_avg)^N
```

예를 들어,

```text
BPS₀ = 50,000원
ROE_avg = 10%
N = 10
```

이면,

```text
Future BPS
= 50,000 × (1.10)^10
≈ 129,687원
```

## 7.2 해석

이 계산은 다음과 같은 단순한 가정을 사용한다.

> 기업이 과거 평균 ROE 수준의 자기자본 성장률을 향후 N년간 지속한다고 가정한다.

따라서 `Future BPS`는 실제 미래 BPS의 예측값이라기보다 **과거 ROE를 기계적으로 적용한 계산값**이다.

---

# 8. 상승배수 계산

## 8.1 공식

```text
Upside Multiple
= Future BPS / Current Price
```

예:

```text
Future BPS = 129,687원
Current Price = 80,000원
```

이면,

```text
Upside Multiple
≈ 1.62배
```

화면에는 다음과 같이 표시한다.

```text
상승배수: 1.62배
```

## 8.2 상승배수 해석

```text
1.00배
→ 미래 BPS = 현재 주가

1.00배 초과
→ 미래 BPS > 현재 주가

1.00배 미만
→ 미래 BPS < 현재 주가
```

상승배수는 **실제 주가가 해당 배수만큼 상승한다는 의미가 아니다.**

미래 BPS와 현재 주가를 단순 비교한 값이다.

---

# 9. 기대수익률 계산

## 9.1 공식

```text
Expected Return
= (Upside Multiple^(1/N)) - 1
```

또는,

```text
Expected Return
= (Future BPS / Current Price)^(1/N) - 1
```

예:

```text
Upside Multiple = 1.62배
N = 10
```

이면 약 연 5% 수준의 기대수익률이 계산된다.

## 9.2 연환산

Valuation의 기대수익률은 항상 **연환산 수익률**로 표시한다.

따라서 화면에는 최소한 다음 두 값을 함께 표시한다.

```text
상승배수: 1.62배
기대수익률: 연 5.0%
```

---

# 10. 현재 주가

## 10.1 기본값

현재 주가는 02 Market Screening에서 사용하는 기준일 규칙에 따라 **가장 최근 유효한 시장 종가**를 사용한다.

기본 규칙 (`02_market_screening.md` §4, `07_PRODUCT_SPEC.md` §6과 동일한 기준):

```text
영업일 21:00 이후
→ 당일 종가

영업일 21:00 이전
→ 직전 영업일 종가

주말/휴일
→ 직전 영업일 종가
```

## 10.2 Valuation에서는 실제 종가 사용

Valuation의 현재 주가는 **조정주가가 아닌 실제 시장 종가(raw close)**를 기본값으로 한다.

수익률·모멘텀·52주 고가 등의 분석에서 사용하는 조정주가와 구분한다.

---

# 11. 기준일

Valuation에는 다음 기준일을 명확하게 표시한다.

```text
주가 기준일: 2026-09-11
BPS 기준: 2026 Q2
ROE 평균: 2016~2025
ROE 사용연수: 10년
```

주가 기준일과 BPS 기준일은 서로 다를 수 있다.

이는 재무제표 공시 시점과 시장가격 시점이 다르기 때문에 정상적인 상황이다.

---

# 12. 계산 예시

다음과 같은 데이터가 있다고 가정한다.

```text
최근 분기 BPS = 50,000원

최근 10개년 ROE
= 8%
= 9%
= 10%
= 11%
= 12%
= 10%
= 9%
= 11%
= 12%
= 8%

ROE 평균 = 10%
N = 10

현재 주가 = 80,000원
```

## 12.1 미래 BPS

```text
Future BPS
= 50,000 × (1.10)^10
≈ 129,687원
```

## 12.2 상승배수

```text
Upside Multiple
= 129,687 / 80,000
≈ 1.62배
```

## 12.3 기대수익률

```text
Expected Return
= (1.62^(1/10)) - 1
≈ 5.0%
```

최종 표시:

```text
최근 BPS       50,000원
ROE 평균       10.0%
사용연수        10년
미래 BPS       129,687원
현재 주가       80,000원
상승배수          1.62배
기대수익률        연 5.0%
```

---

# 13. 계산 예외 및 검증 규칙

Valuation 계산 전 다음 조건을 검증한다.

## 13.1 BPS

```text
BPS₀ > 0
```

가 기본 조건이다.

BPS가 `0` 이하이면 일반적인 BPS 기반 Valuation이 의미를 갖기 어려우므로 계산하지 않고 `NA` 처리한다.

## 13.2 현재 주가

```text
Current Price > 0
```

이어야 한다.

주가가 없거나 0 이하이면 계산하지 않는다.

## 13.3 ROE 사용연수

```text
N >= 1
```

이어야 한다.

유효한 연간 ROE가 하나도 없으면 Valuation을 계산하지 않는다.

## 13.4 미래 BPS 계산 가능 여부

```text
1 + ROE_avg > 0
```

이어야 한다.

평균 ROE가 -100% 이하이면 거듭제곱 계산을 정상적인 미래 BPS 성장으로 해석할 수 없으므로 `NA` 처리한다.

## 13.5 데이터 기준일

현재 주가와 BPS의 기준일은 서로 달라도 된다.

단, UI에서 각각의 기준일을 명확하게 표시한다.

---

# 14. 출력 데이터

Valuation 결과는 다음 필드를 기본으로 제공한다.

| 필드 | 설명 |
|---|---|
| `stock_code` | 종목코드 |
| `stock_name` | 종목명 |
| `price_basis_date` | 현재 주가 기준일 |
| `bps_basis_period` | BPS 기준 분기 |
| `bps` | 최근 유효 분기 BPS |
| `roe_avg` | 연간 ROE 평균 |
| `roe_years_used` | ROE 평균에 사용된 연수 N |
| `roe_start_year` | 평균에 사용된 가장 과거 연도 |
| `roe_end_year` | 평균에 사용된 가장 최근 연도 |
| `future_bps` | 계산된 미래 BPS |
| `current_price` | 현재 주가 |
| `upside_multiple` | 상승배수 |
| `expected_return` | 연환산 기대수익률 |
| `status` | 계산 상태 |
| `calculation_version` | 계산식 버전 |
| `updated_at` | 결과 갱신 시각 |

---

# 15. 상태값

Valuation 계산 상태는 다음과 같이 관리한다.

| 상태 | 의미 |
|---|---|
| `CALCULATED` | 정상 계산 |
| `NA_BPS` | 유효한 BPS 없음 |
| `NA_ROE` | 유효한 연간 ROE 없음 |
| `NA_PRICE` | 유효한 현재 주가 없음 |
| `NA_INVALID_ROE` | 평균 ROE로 계산할 수 없는 상태 |
| `ERROR` | 계산 오류 |

---

# 16. DB 설계

기존 `valuation` 테이블을 사용한다.

```sql
CREATE TABLE valuation (
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
);
```

## 16.1 저장 원칙

Valuation 결과는 계산 결과이므로 원천 데이터와 분리한다.

```text
03 Financial Analysis
    └── 원천/정규화 재무데이터
             ↓
05 Valuation
    └── 계산 결과
```

원천 BPS와 ROE는 03의 데이터를 참조하고, 05에는 계산 결과를 저장한다.

`valuation` 테이블은 Cloudflare D1에 저장하며, 용량 관리를 위한 삭제 기능(종목 단위/전체)은 `07_PRODUCT_SPEC.md` §5의 `DELETE /api/admin/valuation/{stock_code}` API를 따른다.

---

# 17. Python 구현 구조

권장 파일 구조:

```text
backend/
├── calculations/
│   ├── valuation.py
│   └── ...
├── processors/
├── collectors/
└── db/
```

`valuation.py`의 핵심 함수는 다음과 같이 구성한다.

```python
def calculate_valuation(
    bps: float,
    roe_values: list[float],
    current_price: float,
) -> dict:
    ...
```

권장 처리 순서:

```text
1. BPS 검증
2. 현재 주가 검증
3. 연간 ROE 유효값 필터링
4. 최근 최대 10개 ROE 선택
5. ROE 평균 계산
6. N 계산
7. Future BPS 계산
8. Upside Multiple 계산
9. Expected Return 계산
10. 결과 및 status 반환
```

---

# 18. ROE 데이터 선택 규칙

연간 ROE 데이터가 다음과 같이 존재한다고 가정한다.

```text
2025: 12%
2024: 10%
2023: NA
2022: 8%
2021: 9%
2020: ERROR
2019: 11%
...
```

`NA`와 `ERROR`를 제외한 유효값 중 최근 순으로 최대 10개를 선택한다.

즉:

```text
2025 12%
2024 10%
2022  8%
2021  9%
2019 11%
...
```

이렇게 선택된 값의 개수가 `N`이다.

따라서 "최근 10개년"이라는 표현은 **달력상 연도 10개를 반드시 채운다는 의미가 아니라, 최근 최대 10개의 유효한 연간 ROE 관측값을 사용한다는 의미**로 구현한다.

---

# 19. 테스트 요구사항

## Test 1. 10년 ROE

```text
BPS = 50,000
ROE = 10개
평균 ROE = 10%
현재 주가 = 80,000
```

기대 결과:

```text
N = 10
Future BPS ≈ 129,687
Upside Multiple ≈ 1.62
Expected Return ≈ 5.0%
```

## Test 2. 8년 ROE

```text
BPS = 50,000
유효 ROE = 8개
평균 ROE = 10%
현재 주가 = 80,000
```

기대 결과:

```text
N = 8
Future BPS = 50,000 × 1.1^8
Expected Return = (Future BPS / 80,000)^(1/8) - 1
```

## Test 3. 중간에 결측 연도 존재

```text
2025: 10%
2024: NA
2023: 12%
2022: 8%
...
```

`NA`는 평균에서 제외한다.

## Test 4. 음수 ROE

```text
ROE = 10%, 8%, -5%, 12%
```

`-5%`도 유효한 ROE라면 평균에 포함한다.

## Test 5. 유효 ROE 없음

```text
roe_values = []
```

결과:

```text
status = NA_ROE
```

## Test 6. BPS 없음

결과:

```text
status = NA_BPS
```

## Test 7. 현재 주가 없음

결과:

```text
status = NA_PRICE
```

## Test 8. BPS <= 0

결과:

```text
status = NA_BPS
```

## Test 9. 평균 ROE <= -100%

결과:

```text
status = NA_INVALID_ROE
```

## Test 10. N 적용 오류 방지

8개의 ROE만 유효한 경우:

```text
N = 8
```

이어야 하며, 임의로 `N = 10`을 사용하면 안 된다.

---

# 20. Frontend 화면

V1에서는 복잡한 Valuation 화면을 만들지 않는다.

종목 상세 화면에 다음 정보를 간결하게 표시한다.

```text
[Valuation]

BPS 기준       2026 Q2
최근 BPS       58,240원

ROE 평균       11.2%
ROE 기간       2016~2025
사용연수        10년

미래 BPS       173,000원

주가 기준일     2026-09-11
현재 주가        120,000원

상승배수          1.44배
기대수익률        연 3.7%
```

핵심 출력은 다음 3개다.

```text
미래 BPS
상승배수
기대수익률
```

---

# 21. 투자판단과의 연결

Valuation의 기대수익률은 **자동 매수/매도 판단을 위한 값이 아니다.**

02 Market Screening에서 추출한 모멘텀 후보와 03 Financial Analysis의 재무 분석, 04 Business/Moat/Industry 분석과 함께 종합적으로 검토한다.

전체 흐름:

```text
02 Market Screening
    ↓
시장 관심 종목 발견
    ↓
03 Financial Analysis
    ↓
재무 상태 및 장기 ROE 확인
    ↓
04 Business / Moat / Industry
    ↓
사업 경쟁력과 위험 분석
    ↓
05 Valuation
    ↓
BPS 기반 미래 BPS / 상승배수 / 기대수익률
    ↓
06 Portfolio / Kelly
```

05 자체에서는 다음 판단을 자동화하지 않는다.

```text
BUY
SELL
HOLD
추천
종합점수
```

---

# 22. 모델의 한계

이 방법은 의도적으로 단순하다.

특히 다음 가정을 포함한다.

### 22.1 ROE 지속 가정

과거 평균 ROE가 향후에도 지속된다고 가정한다.

실제 기업의 ROE는 산업, 경쟁환경, 자본구조, 경기, 성장률 등에 따라 변할 수 있다.

### 22.2 미래 BPS와 현재 주가 비교

`Future BPS / Current Price`를 사용하기 때문에 미래 시점의 주가가 미래 BPS와 비교 가능한 수준에 있다는 단순한 가정이 포함된다.

이는 사실상 미래 P/B를 별도로 추정하지 않고 **1.0 수준으로 놓는 구조**와 같다.

### 22.3 목표주가가 아니다

`Future BPS`는 일반적인 의미의 목표주가가 아니다.

따라서 화면과 문서에서 `목표주가`라는 표현을 사용하지 않는다.

### 22.4 기대수익률은 예측 보장이 아니다

`Expected Return`은 과거 ROE와 현재 주가를 이용한 **기계적 연환산 계산값**이다.

실제 미래 주가수익률을 보장하거나 확률을 의미하지 않는다.

---

# 23. V1 범위

## 포함

- 최근 유효 분기 BPS
- 최대 10개년 연간 ROE 평균
- 실제 사용연수 N
- 미래 BPS
- 현재 주가
- 상승배수
- 연환산 기대수익률
- 계산 상태
- 기준기간 표시
- DB 저장
- Python 계산
- 테스트

## 제외

- DCF
- PER Band
- PBR Band
- 목표 PER
- 목표 PBR
- 애널리스트 컨센서스
- 미래 EPS 추정
- 미래 매출 추정
- 미래 ROE 예측
- AI 성장률 예측
- 성공확률
- 종합 Valuation Score
- 자동 매수/매도 신호

---

# 24. 구현 완료 체크리스트

### 데이터

- [ ] 최근 유효 분기 BPS 연결
- [ ] 연간 ROE 연결
- [ ] 현재 시장 종가 연결
- [ ] 기준일 저장

### 계산

- [ ] 최근 최대 10개 유효 ROE 선택
- [ ] ROE 평균 계산
- [ ] 실제 사용연수 N 계산
- [ ] Future BPS 계산
- [ ] Upside Multiple 계산
- [ ] Expected Return 계산

### 예외

- [ ] BPS 없음 처리
- [ ] BPS <= 0 처리
- [ ] ROE 없음 처리
- [ ] Current Price 없음 처리
- [ ] Current Price <= 0 처리
- [ ] 평균 ROE <= -100% 처리
- [ ] 결측 ROE 처리
- [ ] 음수 ROE 처리

### 화면

- [ ] BPS 기준 표시
- [ ] ROE 평균 표시
- [ ] ROE 사용기간 표시
- [ ] 사용연수 표시
- [ ] 미래 BPS 표시
- [ ] 현재 주가 표시
- [ ] 상승배수 표시
- [ ] 기대수익률 표시

### 품질

- [ ] 계산 단위 테스트
- [ ] 실제 종목 샘플 검증
- [ ] calculation_version 저장
- [ ] 데이터 기준일 검증
