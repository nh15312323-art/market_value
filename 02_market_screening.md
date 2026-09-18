# Market Screening Specification

> 이 앱에서 시장 스크리닝 탭이 다른 탭(재무분석/비즈니스분석/Valuation)과 어떻게 연결되는지, 결과가 Cloudflare D1에 어떻게 저장·삭제되는지는 `07_PRODUCT_SPEC.md`를 함께 참고한다.

## 1. 목적

시장 전체 종목을 매일 자동으로 스크리닝하여 투자 후보 종목을 빠르게 발견하기 위한 기능이다.

Market Screening은 최종 투자 의사결정 시스템이 아니라 **Research / Discovery Engine**이다.

투자 철학은 다음과 같다.

> Momentum으로 후보를 발견하고, Quality + Growth + Valuation + Business Analysis를 통해 최종 투자 여부를 판단한다.

따라서 시장 스크리닝 단계에서는 특정 종목의 투자 적합성을 임의의 종합점수로 평가하지 않는다.

---

## 2. 기본 원칙

### 2.1 독립적인 Top 20 제공

각 지표별로 독립적인 Top 20 목록을 제공한다.

- Trading Value Z-SCORE 10DAY Top 20
- Trading Value Z-SCORE 20DAY Top 20
- 1D Return Top 20
- 5D Return Top 20
- 10D Return Top 20
- 20D Return Top 20
- 60D Return Top 20
- 120D Return Top 20
- Weighted Momentum Top 20
- KOSPI Relative Strength 5D Top 20
- KOSPI Relative Strength 10D Top 20
- KOSPI Relative Strength 20D Top 20
- KOSPI Relative Strength 60D Top 20
- KOSPI Relative Strength 120D Top 20

52주/3년/5년/10년 최고가 종목은 조건을 충족하는 전체 종목을 제공한다.

### 2.2 종합점수 사용 금지

V1에서는 임의의 0~100점 Composite Score 또는 Attention Score를 만들지 않는다.

각 지표를 독립적으로 보여주고 투자자가 후보를 발견하도록 한다.

향후 충분한 과거 데이터가 축적되면 백테스트를 통해 통계적으로 검증된 Composite Factor를 별도로 개발할 수 있다.

---

# 3. Universe

## 3.1 대상 시장

- KOSPI
- KOSDAQ

## 3.2 시가총액 기준

기준일 현재 시가총액이 500억원 이상인 종목만 포함한다.
기준일 현재 거래대금이 15억원 이상인 종목만 포함한다. 
Market Cap >= KRW 50 billion

## 3.3 기본 제외 대상

다음 종목은 기본적으로 제외한다.

우선주
SPAC
ETF
ETN
기타 일반적인 주식 투자 분석 대상이 아닌 상품

단, 실제 데이터 공급원에서 종목 유형을 안정적으로 구분할 수 있는지 확인한 후 구현한다.


# 4. 기준일(Data Date)

앱은 주로 평일 업무 종료 후 사용하는 것을 전제로 한다.

시장 데이터의 기준일과 프로그램 실행일은 반드시 분리한다.

## 4.1 기준일 결정 규칙
앱 접속 시점	시장 데이터 기준일
영업일 21:00 이후	당일 영업일
영업일 21:00 이전	직전 영업일
토요일	직전 영업일
일요일	직전 영업일
공휴일	직전 영업일

화면에는 반드시 기준일을 표시한다.

기준일: 2026-09-11 (금)

# 5. 데이터 수집 구조

시장 데이터는 가능한 한 KRX를 Primary Source로 또는 파이썬 FINANCEDATAREADER 사용한다.

기본 구조:

KRX
 ↓
Daily Raw Market Data
 ↓
Data Validation
 ↓
Adjusted Price / Corporate Action Layer
 ↓
Derived Indicators
 ↓
Top 20 Generation
 ↓
Database
 ↓
Dashboard

Raw Data

예:

종목코드
종목명
시장구분
거래일
종가
거래량
거래대금
시가총액
KOSPI 지수
기타 원천 데이터
Derived Data

예:

Trading Value Z-SCORE 10DAY
Trading Value Z-SCORE 20DAY
1D Return
5D Return
10D Return
20D Return
60D Return
120D Return
Weighted Momentum
KOSPI Relative Strength
52W High
3Y High
5Y High
10Y High

Raw Data를 보존함으로써 향후 계산방법이 변경되어도
원천 데이터를 다시 수집하지 않고 재계산할 수 있도록 한다.

# 6. Daily Batch

시장 스크리닝 지표는 사용자가 화면을 열 때마다 계산하지 않는다.

매일 장 마감 이후 Batch를 실행하여 사전에 계산한다.

권장 실행 시간: 오전 01:00 ~ 02:00
시장 데이터가 안정적으로 확보된 이후 실행하는 것이 목적이다.

## 6.1 Batch 구조
장 마감
 ↓
KRX Data Collection
 ↓
Raw Data Validation
 ↓
Adjusted Price / Corporate Action Update
 ↓
Trading Value Z10 / Z20
 ↓
1D / 5D / 10D / 20D / 60D / 120D Return
 ↓
KOSPI Relative Strength
 ↓
52W / 3Y / 5Y / 10Y High
 ↓
Top 20 Generation
 ↓
Database Save

## 6.2 Market Date와 Run Time 분리

예:
run_time   = 2026-09-12 01:00
market_date = 2026-09-11
프로그램 실행 날짜가 시장 데이터 날짜를 결정해서는 안 된다.

## 6.3 Batch 특성
Batch는 다음 조건을 만족해야 한다.
Idempotent
재실행 가능
중간 실패 시 재처리 가능
데이터 최신성 확인 가능
데이터 Validation Log 저장
동일 market_date에 대해 중복 데이터가 발생하지 않도록 관리

## 6.4 DB 저장 및 삭제

Batch 결과(원천 데이터, 파생지표, Top20 결과)는 Cloudflare D1에 저장한다.

D1 용량 관리를 위해 사용자가 화면에서 시장 스크리닝 관련 저장 데이터를 직접 삭제할 수 있어야 한다. 삭제 기능의 범위와 API는 `07_PRODUCT_SPEC.md` §5를 따른다. 삭제 후 다음 배치 실행 시 자동으로 재수집되므로 데이터 정합성에는 문제가 없다.

# 7. Trading Value Abnormality
## 7.1 목적
현재 거래대금이 평소보다 얼마나 비정상적으로 증가했는지를 측정한다.
거래량이 아니라 거래대금을 사용한다.

## 7.2 Trading Value Z-score 10D
종목 i의 기준일 t 거래대금을 TV(i,t)라고 한다.
직전 유효 거래일 최대 10일의 거래대금을 이용한다.

ZTV10(i,t) = (TV(i,t) - Mean(TV(i,t-1 ... t-10))) / Std(TV(i,t-1 ... t-10))

중요: 기준일 당일 거래대금은 평균과 표준편차 계산에 포함하지 않는다.

즉, 현재 거래대금  vs  과거 거래대금의 평균 및 표준편차 를 비교한다.

## 7.3 Trading Value Z-score 20D
동일한 방법으로 직전 유효 거래일 최대 20일을 사용한다.

ZTV20(i,t) = (TV(i,t) - Mean(TV(i,t-1 ... t-20))) / Std(TV(i,t-1 ... t-20))

## 7.4 결측 및 거래정지 처리
거래정지일이나 상장이 안 되어 있었던 날은 거래대금 0으로 처리하지 않는다.
거래정지 → 해당 날짜 제외
예: 과거 20일 중 10일 정상 거래, 10일 거래정지 → 실제 거래가 있었던 10일만 사용
예: 과거 10일 중 6일 정상거래, 4일 상장 안 되어 있으면 → 실제 거래가 있었던 6일만 사용
 
최소 유효 관측치가 부족한 경우:
유효 거래일 < 5 → Z-SCORE 10d = NA
유효 거래일 < 10 → Z-SCORE 20D = NA

단, 20D의 경우 계산 안정성을 위해 실제 구현에서는
최소 관측치 기준을 별도로 설정할 수 있다.

V1에서는 다음을 권장한다.

Z10: 최소 5개 유효 관측치
Z20: 최소 10개 유효 관측치

표준편차가 0이면: Z-score = NA

## 7.5 표준편차
V1에서는 Population Standard Deviation을 사용한다.
ddof = 0
향후 백테스트를 통해 다른 방식과 비교할 수 있다.

## 7.6 Output
다음 두 개의 독립적인 Top 20을 제공한다.
Trading Value Z-SCORE 10D Top 20
Trading Value Z-SCORE 20D Top 20
화면에는 최소한 다음을 표시한다.

순위	종목	거래대금	Z-SCROE-10D	Z-SCORE-20D

# 8. Price Momentum
## 8.1 기본 원칙
모멘텀은 일별 수익률의 단순 평균이 아니라
**누적수익률(Cumulative Return)**을 사용한다.

수정주가를 P라고 할 때:
R_n = P_adj(t) / P_adj(t-n) - 1
가능하면 배당 및 권리락 등을 반영한 Adjusted Price를 사용한다.

# 9. Momentum Indicators
다음 기간별 수익률을 각각 계산한다.
1D Return
5D Return
10D Return
20D Return
60D Return
120D Return
각각 독립적인 Top 20을 제공한다.

예:
1D Return Top 20
5D Return Top 20
10D Return Top 20
20D Return Top 20
60D Return Top 20
120D Return Top 20


# 10. Weighted Momentum
단일 기간의 급등보다 중단기 추세가 함께 유지되는 종목을 찾기 위한 보조 지표이다.
초기 버전에서는 다음 가중치를 사용한다.
Weighted Momentum = 0.5 × R20 + 0.3 × R60 + 0.2 × R120


# 11. KOSPI Relative Strength
## 11.1 목적
시장 전체가 상승하는 상황에서 단순히 시장을 따라가는 종목과 시장보다 강한 종목을 구분하기 위한 지표이다.
Relative Strength는 RSI를 의미하지 않는다.
종목 수익률 - KOSPI 수익률로 정의한다.

## 11.2 계산
5D RS20 = Stock Return 5D - KOSPI Return 5D
10D RS20 = Stock Return 10D - KOSPI Return 10D
20D RS20 = Stock Return 20D - KOSPI Return 20D
60D RS60 = Stock Return 60D - KOSPI Return 60D
120D RS120 = Stock Return 120D - KOSPI Return 120D

예:
종목 20D 수익률 = +30%
KOSPI 20D 수익률 = +10%
RS20 = +20%p

## 11.3 비교 기준
KOSDAQ 종목도 현재 버전에서는 KOSPI와 비교한다.

즉, KOSPI 종목 → KOSPI 대비, KOSDAQ 종목 → KOSPI 대비
향후 필요할 경우 KOSDAQ 또는 업종지수 대비 Relative Strength를
별도 Factor로 추가할 수 있다.

## 11.4 Output
각각 Top 20을 제공한다.
KOSPI Relative Strength 5D Top 20
KOSPI Relative Strength 10D Top 20
KOSPI Relative Strength 20D Top 20
KOSPI Relative Strength 60D Top 20
KOSPI Relative Strength 120D Top 20
화면에는 다음을 표시한다.

순위	종목	종목수익률	KOSPI수익률	초과수익률

# 12. 52-Week High
## 12.1 기준
252 trading days를 52주로 정의한다.
H252 = MAX(P_adj(t-251) ... P_adj(t))
수정주가 기준으로 계산한다.

## 12.2 52주 최고가 종목
현재 조정종가가 252거래일 최고가와 동일하면 52주 최고가 달성 종목으로 분류한다.
P_adj(t) = H252

## 12.3 52주 최고가 근접 종목
현재 가격이 52주 최고가의 90% 이상인 종목을 별도로 제공한다.
0.90 × H252 <= P_adj(t) < H252

즉, 현재가 / 52주 최고가 >= 90%
이고 현재가가 최고가보다 낮은 종목이다.

## 12.4 Output
화면에는 최소한 다음 정보를 표시한다.
종목	현재가	52주 최고가	최고가 대비	최고가 기록일

동일한 최고가가 여러 날짜에 발생한 경우
기본적으로 가장 최근 최고가 기록일을 표시한다.

# 13. 3-Year High
Rolling 3-Year High를 사용한다.
약 756 trading days를 기준으로 한다.

H3Y = MAX(P_adj(t-755) ... P_adj(t))

현재가와 최고가의 비율도 계산한다.
Current / H3Y

화면:
종목	현재가	3년 최고가	최고가 대비	최고가 기록일

데이터가 3년 미만인 종목은
상장 이후 전체 기간을 임의로 대체 사용하지 않고 NA 처리한다.

# 14. 5-Year High
약 1,260 trading days를 기준으로 한다.

H5Y = MAX(P_adj(t-1259) ... P_adj(t))

화면:
종목	현재가	5년 최고가	최고가 대비	최고가 기록일
5년 미만의 충분한 데이터가 없으면 NA 처리한다.

# 15. 10-Year High
약 2,520 trading days를 기준으로 한다.

H10Y = MAX(P_adj(t-2519) ... P_adj(t))

화면:
종목	현재가	10년 최고가	최고가 대비	최고가 기록일
10년 미만의 충분한 데이터가 없으면 NA 처리한다.

# 16. High 관련 명칭 원칙
다음과 같이 표시한다.
52주 최고가
3년 최고가
5년 최고가
10년 최고가

이를 일반적인 의미의 "신고가"라고 부르지 않는다.
각각 Rolling Window 내 최고가이기 때문이다.
All-Time High는 V1에서는 사용하지 않는다.

# 17. 최종 Market Screening 목록
V1에서 제공하는 지표는 다음과 같다.

Category	Indicator	Output
Trading Activity	Trading Value Z-score D10	Top 20
Trading Activity	Trading Value Z-score D20	Top 20
Momentum	1D Return	Top 20
Momentum	5D Return	Top 20
Momentum	10D Return	Top 20
Momentum	20D Return	Top 20
Momentum	60D Return	Top 20
Momentum	120D Return	Top 20
Momentum	Weighted Momentum	Top 20
Relative Strength	KOSPI RS 5D	Top 20
Relative Strength	KOSPI RS 10D	Top 20
Relative Strength	KOSPI RS 20D	Top 20
Relative Strength	KOSPI RS 60D	Top 20
Relative Strength	KOSPI RS 120D	Top 20
Price High	52W High	Qualifying Stocks
Price High	52W High Proximity	Qualifying Stocks
Price High	3Y High	Qualifying Stocks
Price High	5Y High	Qualifying Stocks
Price High	10Y High	Qualifying Stocks

# 18. 데이터 부족 처리
충분한 과거 데이터가 없는 경우 임의의 대체값을 사용하지 않는다.
원칙: 데이터 부족 → NA

예:
상장 1년 미만
→ 3Y / 5Y / 10Y High = NA
과거 유효 거래일 부족
→ Z-score = NA
데이터가 부족한 종목을 억지로 계산하여 Ranking에 포함시키지 않는다.


# 19. Adjusted Price 원칙
가격 기반 지표는 가능한 한 Adjusted Price를 사용한다.
적용 대상:
1D Return
5D Return
10D Return
20D Return
60D Return
120D Return
52W High
3Y High
5Y High
10Y High

액면분할, 무상증자, 유상증자, 배당 등 Corporate Action으로 인한 가격 단절이 장기 지표를 왜곡하지 않도록 한다.

단, KRX 원천 데이터가 조정주가를 직접 제공하는지 여부와
조정주가 계산 방법은 실제 구현 단계에서 검증한다.

# 20. Ranking 원칙

각 지표는 내림차순으로 정렬한다.

예: Return → 높은 종목부터
Z-score → 높은 종목부터
Relative Strength → 높은 종목부터
Weighted Momentum → 높은 종목부터

동점 발생 시 별도의 임의 점수를 만들지 않는다.
필요한 경우 다음 순서로 Tie-break한다.

1. 해당 지표 값
2. 거래대금
3. 종목코드

단, 실제 구현 단계에서 일관된 정렬 규칙을 확정한다.


# 21. Market Screening Dashboard

권장 화면 구조:
┌─────────────────────────────────────┐
│ Market Screening                    │
│ 기준일: YYYY-MM-DD                  │
└─────────────────────────────────────┘

[Trading Activity]
- Trading Value Z-score D10 Top 20
- Trading Value Z-socre D20 Top 20

[Momentum]
- 1D Top 20
- 5D Top 20
- 10D Top 20
- 20D Top 20
- 60D Top 20
- 120D Top 20
- Weighted Momentum Top 20

[Relative Strength]
- KOSPI RS 5D Top 20
- KOSPI RS 10D Top 20
- KOSPI RS 20D Top 20
- KOSPI RS 60D Top 20
- KOSPI RS 120D Top 20

[Price High]
- 52W High
- 52W High Proximity
- 3Y High
- 5Y High
- 10Y High

개별 종목을 클릭하면 Market Screening 결과에서 해당 종목의 상세 분석 화면으로 이동한다.
