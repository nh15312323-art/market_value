# VALUE LAB - 개인 가치투자 분석 웹앱 (Cloudflare Edition)

> 00~08 스펙 문서를 바탕으로 구축된 1인 개인 투자자 전용 가치투자 웹 애플리케이션입니다.  
> Cloudflare Pages 및 D1 무료 인프라 위에서 동작하며, 비전공자도 쉽게 배포하고 사용할 수 있습니다.

---

## 🧭 핵심 투자 분석 파이프라인

```text
[ 02 시장 스크리닝 ]
       ↓ (종목명 더블클릭)
[ 03 장기 재무분석 (DART) ]
       ↓ (회사명 더블클릭)
[ 04 비즈니스/해자 분석 (Gemini) ]  또는  [ 05 Valuation (BPS×ROE) ]
```

1. **02 시장 스크리닝 (Discovery Engine)**:
   - 거래대금 Z10/Z20, 기간수익률(1D~120D), 가중 모멘텀, KOSPI 상대강도(RS5~RS120), 52주 최고가 Top 20 제공.
   - 영업일 21:00 경계 규칙을 통한 정확한 시장 기준일 반영.
   - **종목 더블클릭 시 [재무분석] 탭으로 즉시 자동 이동 및 조회**.

2. **03 장기 재무분석 (Quality & Growth)**:
   - DART OpenDART API 연동을 통한 10개년 정규화 재무제표(연간/분기).
   - 단독 분기 계산 및 4대 시계열 차트(매출/이익, ROE/마진, CFO/FCF, BPS).
   - **회사명 더블클릭 시 팝오버 메뉴로 [비즈니스분석] 또는 [Valuation] 선택 이동**.

3. **04 비즈니스 & 해자 분석 (Gemini 2.5 AI)**:
   - 실시간 Gemini API 호출을 통한 정밀 분석 (사업모델, 경제적 해자 및 반대증거, 산업구조, 경쟁사, 리스크, Thesis).
   - **D1 용량 절약을 위해 DB에 저장하지 않고 실시간 세션으로 쾌적하게 제공**.

4. **05 Valuation (BPS × ROE 모형)**:
   - `Future BPS = BPS₀ × (1 + ROE_avg)^N`
   - `Upside Multiple = Future BPS / Current Price`
   - `Expected Return = (Upside Multiple^(1/N)) - 1`
   - BPS와 10년 평균 ROE 기반 연환산 기대수익률 계산 및 ROE 시뮬레이션 슬라이더 제공.

5. **07 DB 용량 관리 (Admin)**:
   - Cloudflare D1 무료 한도 보존을 위한 영역별(스크리닝, 재무, Valuation) 원클릭 삭제 기능.

---

## 🚀 빠른 배포 방법 (비전공자 가이드)

상세한 사진/단계별 안내는 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md)를 참고하세요!

1. 본 저장소의 코드를 GitHub에 푸시합니다:
   ```powershell
   git add .
   git commit -m "feat: deploy ready"
   git push origin main
   ```
2. Cloudflare 대시보드에서 `Workers & Pages` > `Create application` > `Pages` > `Connect to Git`을 선택합니다.
3. 빌드 설정에서 **Build output directory**를 **`public`** 으로 입력하고 배포합니다.
4. `Workers & Pages` > `D1 SQL Database`에서 `market-value-db`를 생성하고 `migrations/0001_initial.sql`을 실행합니다.
5. Pages 프로젝트의 `Settings` > `Functions`에서 D1 바인딩(`DB`)을 연결합니다.
6. 배포 완료된 주소(`https://xxxx.pages.dev`)로 접속하여 사용합니다.

---

## 💻 로컬 개발 및 테스트

```powershell
# 개발 서버 실행
npm run dev
# 브라우저에서 http://localhost:8788 접속
```
