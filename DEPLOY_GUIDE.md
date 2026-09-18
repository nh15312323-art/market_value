# 비전공자를 위한 Cloudflare 웹앱 1분 배포 가이드 🚀

> 이 가이드는 프로그래밍 지식이 없는 분도 마우스 클릭 몇 번으로 개인 가치투자 분석 웹앱(`VALUE LAB`)을 인터넷에 무료로 배포하고 사용할 수 있도록 작성되었습니다.

---

## 💡 전체 배포 흐름 한눈에 보기

```text
[ 내 컴퓨터의 코드 ]
        ↓ (1. GitHub로 올리기)
[ GitHub 저장소 ]
        ↓ (2. Cloudflare Pages 연결 - 마우스 클릭 4번)
[ Cloudflare Pages 배포 완료! ] 
        ↓ (3. D1 데이터베이스 1분 연결)
[ 나만의 주식 분석 웹앱 접속 (https://xxxx.pages.dev) ]
```

---

## 사전 확인 (이미 완료하신 항목)
- [x] Cloudflare 계정 가입 완료
- [x] Cloudflare 환경 변수(비밀번호)에 `DART_API_KEY` 및 `GEMINI_API_KEY` 설정 완료

---

## Step 1: GitHub에 코드 올리기 (Git Push)

컴퓨터 터미널(PowerShell 또는 명령 프롬프트)에서 아래 명령어를 한 줄씩 실행하여 새로 개발된 웹앱 코드를 본인의 GitHub 저장소에 올립니다.

```powershell
# 1. 파일 추가
git add .

# 2. 커밋 메시지 작성
git commit -m "feat: Cloudflare Pages 가치투자 웹앱 풀스택 구현 완료"

# 3. GitHub로 푸시 (저장소에 업로드)
git push origin main
```

*(GitHub Desktop 프로그램을 사용하시는 경우, 변경된 파일들을 체크하고 'Commit to main' 버튼을 누른 뒤 'Push origin'을 클릭하시면 됩니다.)*

---

## Step 2: Cloudflare Pages에서 웹앱 배포하기 (마우스 클릭)

1. [Cloudflare 대시보드(dash.cloudflare.com)](https://dash.cloudflare.com/)에 로그인합니다.
2. 왼쪽 메뉴에서 **Workers & Pages (Workers 및 Pages)** 를 클릭합니다.
3. 파란색 **Create application (애플리케이션 생성)** 버튼을 클릭합니다.
4. 상단 탭에서 **Pages**를 선택하고, **Connect to Git (Git에 연결)** 버튼을 클릭합니다.
5. 본인의 GitHub 계정을 연동하고 **`market_value`** 저장소를 선택한 뒤 **Begin setup (설정 시작)** 을 클릭합니다.
6. **빌드 설정(Build settings)** 입력창이 나오면 아래와 같이 그대로 입력합니다:
   - **Project name (프로젝트 이름)**: `market-value` (원하는 이름 아무거나)
   - **Production branch (프로덕션 브랜치)**: `main`
   - **Framework preset (프레임워크 프리셋)**: `None` (기본값)
   - **Build command (빌드 명령)**: *(비워둡니다)*
   - **Build output directory (빌드 출력 디렉터리)**: **`public`**  ⚠️ 중요! `public`으로 입력해주세요.
7. 맨 아래 **Save and Deploy (저장 및 배포)** 버튼을 클릭합니다.
8. 1~2분 정도 기다리면 축하 화면과 함께 나만의 웹사이트 주소(예: `https://market-value.pages.dev`)가 생성됩니다! 🎉

---

## Step 3: Cloudflare D1 데이터베이스 연결 (1분 컷)

데이터를 무료 SQLite 데이터베이스에 영구 저장하기 위한 단계입니다.

### 1) D1 데이터베이스 만들기
1. Cloudflare 대시보드 왼쪽 메뉴에서 **Workers & Pages** > **D1 SQL Database**를 클릭합니다.
2. **Create database (데이터베이스 생성)** 버튼을 클릭합니다.
3. Database name에 **`market-value-db`** 를 입력하고 **Create**를 클릭합니다.

### 2) 데이터베이스 테이블 초기화
1. 방금 생성된 `market-value-db`를 클릭하여 들어갑니다.
2. 상단의 **Console (콘솔)** 탭을 클릭합니다.
3. 본 프로젝트의 `migrations/0001_initial.sql` 파일의 내용을 전체 복사하여 콘솔 창에 붙여넣고, **Execute (실행)** 버튼을 클릭합니다.
   - *(단 한 번 실행으로 10개의 데이터 테이블이 자동 생성됩니다)*

### 3) Pages 웹앱에 데이터베이스 바인딩(연결)
1. 다시 왼쪽 메뉴의 **Workers & Pages** > **Pages** 목록에서 방금 배포한 프로젝트(`market-value`)를 클릭합니다.
2. 상단 메뉴에서 **Settings (설정)** > 왼쪽 메뉴에서 **Functions (함수)** 를 클릭합니다.
3. 화면을 아래로 스크롤하여 **D1 database bindings (D1 데이터베이스 바인딩)** 섹션을 찾고, **Add binding (바인딩 추가)** 버튼을 클릭합니다.
4. 다음과 같이 입력합니다:
   - **Variable name (변수 이름)**: **`DB`** ⚠️ (반드시 대문자 `DB`로 입력해야 합니다!)
   - **D1 database**: 드롭다운에서 방금 만든 **`market-value-db`** 선택
5. **Save (저장)** 버튼을 클릭합니다.

---

## Step 4: API 키(환경 변수) 최종 확인

이미 Cloudflare에 설정해 두신 `DART_API_KEY`와 `GEMINI_API_KEY`가 Pages 프로젝트에 잘 연결되어 있는지 확인합니다:

1. Pages 프로젝트의 **Settings** > **Environment variables (환경 변수)** 로 이동합니다.
2. 변수 이름이 정확히 일치하는지 확인합니다:
   - `DART_API_KEY`: OpenDART에서 발급받은 인증키
   - `GEMINI_API_KEY`: Google AI Studio에서 발급받은 Gemini API 키
   *(만약 소문자로 되어 있다면 `DART_API_KEY`, `GEMINI_API_KEY`처럼 대문자로 한 번 더 추가해주시면 안전합니다)*

---

## Step 5: 웹앱 사용 방법 (07_PRODUCT_SPEC.md UX 가이드)

배포된 웹사이트 주소(예: `https://market-value.pages.dev`)를 열면 즉시 시작할 수 있습니다.

### 1. 탭 02 - 시장 스크리닝
- 오늘 시장의 거래대금 급증(Z10/Z20), 모멘텀, KOSPI 상대강도, 52주 최고가 Top 20을 확인합니다.
- 관심 있는 종목을 **더블클릭**하면 자동으로 [03 재무분석] 탭으로 넘어가며 해당 종목을 조회합니다.

### 2. 탭 03 - 재무분석
- 상단 검색창에 종목명을 직접 입력하거나 스크리닝에서 넘어온 종목의 10년 재무제표와 4대 추세 차트(매출/이익, ROE, 현금흐름/FCF, BPS)를 확인합니다.
- 상단 기업명을 **더블클릭**하면 팝오버 창이 열려 [비즈니스분석] 또는 [Valuation]으로 즉시 이동할 수 있습니다.

### 3. 탭 04 - 비즈니스분석 (Gemini AI)
- Gemini AI가 실시간으로 사업모델, 해자(Moat), 반대 증거, 산업구조, 경쟁사, 핵심 리스크, 투자 Thesis를 분석하여 카드 형태로 보여줍니다.
- *(D1 무료 용량 보존을 위해 DB에 저장하지 않고 실시간 세션으로 쾌적하게 제공됩니다)*

### 4. 탭 05 - Valuation (가치평가)
- 최근 분기 BPS(BPS₀)와 과거 10개년 연간 ROE 평균을 바탕으로 **미래 BPS, 상승배수, 연환산 기대수익률**을 계산합니다.
- 하단의 ROE 슬라이더를 마우스로 움직여가며 다양한 미래 시나리오에 따른 기대수익률 변화를 실시간으로 시뮬레이션할 수 있습니다.

### 5. DB 용량 관리 (우측 상단 '⚙️ DB 용량 관리' 버튼)
- Cloudflare D1 무료 용량을 아끼기 위해 언제든지 시장 스크리닝 데이터나 개별 기업 재무데이터를 선택하여 삭제할 수 있습니다.

---

## 💻 컴퓨터에서 로컬로 먼저 테스트해보고 싶을 때

컴퓨터의 터미널에서 다음 명령어만 실행하면 됩니다:
```powershell
npm run dev
```
브라우저에서 `http://localhost:8788`로 접속하시면 배포 전에도 동일하게 테스트하실 수 있습니다!
