-- 08_TECHNICAL_SPEC.md §10 및 07_PRODUCT_SPEC.md 기준 Cloudflare D1 SQLite 스키마

-- 1. 상장 기업 기본 정보
CREATE TABLE IF NOT EXISTS companies (
    corp_code TEXT PRIMARY KEY,
    stock_code TEXT UNIQUE,
    stock_name TEXT NOT NULL,
    market TEXT,
    listed_date TEXT,
    updated_at TEXT
);

-- 2. 일별 시장 데이터 (KRX/네이버 시세)
CREATE TABLE IF NOT EXISTS market_daily (
    market_date TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    market TEXT,
    close_price REAL,
    volume INTEGER,
    trading_value REAL,
    market_cap REAL,
    PRIMARY KEY (market_date, stock_code)
);

-- 3. 일별 수정주가
CREATE TABLE IF NOT EXISTS adjusted_price_daily (
    market_date TEXT NOT NULL,
    stock_code TEXT NOT NULL,
    adjusted_close REAL,
    adjustment_factor REAL,
    PRIMARY KEY (market_date, stock_code)
);

-- 4. 기업행위 (액면분할, 유무상증자, 배당 등)
CREATE TABLE IF NOT EXISTS corporate_actions (
    stock_code TEXT NOT NULL,
    action_date TEXT NOT NULL,
    action_type TEXT NOT NULL,
    adjustment_factor REAL,
    source TEXT,
    PRIMARY KEY (stock_code, action_date, action_type)
);

-- 5. 재무제표 공시 보고서 메타데이터
CREATE TABLE IF NOT EXISTS financial_periods (
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
);

-- 6. 원천 재무 데이터 (DART OpenDART 원천 계정)
CREATE TABLE IF NOT EXISTS raw_financial (
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
);

-- 7. 분기 재무 데이터 (단독 분기 계산 포함, 정규화)
CREATE TABLE IF NOT EXISTS financial_quarterly (
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
    bps REAL,
    data_status TEXT,
    calculated_at TEXT,
    PRIMARY KEY (corp_code, fiscal_year, quarter)
);

-- 8. 연간 재무 데이터 (10개년 정규화)
CREATE TABLE IF NOT EXISTS financial_annual (
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
    bps REAL,
    data_status TEXT,
    calculated_at TEXT,
    PRIMARY KEY (corp_code, fiscal_year)
);

-- 9. 시장 스크리닝 결과 (Top20 지표별 저장)
CREATE TABLE IF NOT EXISTS screening_results (
    market_date TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    rank INTEGER NOT NULL,
    stock_code TEXT NOT NULL,
    stock_name TEXT,
    value REAL,
    created_at TEXT,
    PRIMARY KEY (market_date, metric_name, rank)
);

-- 10. Valuation 결과 (05_VALUATION.md §16 BPS × ROE 모형)
CREATE TABLE IF NOT EXISTS valuation (
    stock_code TEXT PRIMARY KEY,
    stock_name TEXT,
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

-- 11. 관심 종목 관리
CREATE TABLE IF NOT EXISTS candidates (
    stock_code TEXT PRIMARY KEY,
    stock_name TEXT,
    first_selected_date TEXT,
    latest_selected_date TEXT,
    reason TEXT,
    status TEXT,
    memo TEXT,
    updated_at TEXT
);

-- 12. 배치 및 작업 실행 로그
CREATE TABLE IF NOT EXISTS job_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_name TEXT NOT NULL,
    started_at TEXT,
    finished_at TEXT,
    status TEXT,
    market_date TEXT,
    rows_processed INTEGER,
    error_message TEXT
);
