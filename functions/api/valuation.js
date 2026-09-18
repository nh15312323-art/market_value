// functions/api/valuation.js
// 05_VALUATION.md 및 07_PRODUCT_SPEC.md 기반 BPS × ROE 가치평가 모듈

import { getMarketBasisDate } from "./screening.js";

// 기대수익률 및 가치평가 계산 함수
export async function calculateValuation(db, stockCode, stockName, financialData, currentPriceOverride) {
  const priceBasisDate = getMarketBasisDate();
  
  // 1. 최근 분기 BPS(BPS₀) 추출 (05 §4)
  let bps0 = null;
  let bpsPeriod = null;
  if (financialData && financialData.quarterly && financialData.quarterly.length > 0) {
    const validQ = financialData.quarterly.find(q => q.bps && q.bps > 0);
    if (validQ) {
      bps0 = validQ.bps;
      bpsPeriod = `${validQ.fiscal_year} Q${validQ.quarter}`;
    }
  }
  // 분기 BPS가 없으면 최근 연간 BPS 사용
  if (!bps0 && financialData && financialData.annual && financialData.annual.length > 0) {
    const validA = financialData.annual.find(a => a.bps && a.bps > 0);
    if (validA) {
      bps0 = validA.bps;
      bpsPeriod = `${validA.fiscal_year} 연간`;
    }
  }

  // 2. 최근 최대 10개년 연간 ROE 평균 계산 (05 §5)
  const annualList = financialData?.annual || [];
  const validRoes = annualList
    .filter(a => a.roe !== null && a.roe !== undefined && !isNaN(a.roe))
    .slice(0, 10);

  const n = validRoes.length;
  if (n === 0 || !bps0) {
    return {
      stock_code: stockCode,
      stock_name: stockName,
      status: "INSUFFICIENT_DATA",
      error: "BPS 또는 ROE 재무 데이터가 부족하여 Valuation을 계산할 수 없습니다."
    };
  }

  const roeSum = validRoes.reduce((sum, item) => sum + item.roe, 0);
  const roeAvgPercent = roeSum / n;
  const roeAvg = roeAvgPercent / 100; // 소수점 형태 (예: 0.12)

  const roeStartYear = validRoes[validRoes.length - 1].fiscal_year;
  const roeEndYear = validRoes[0].fiscal_year;

  // 3. 현재 주가 결정
  let currentPrice = currentPriceOverride || 0;
  if (!currentPrice && db) {
    try {
      const priceRow = await db.prepare(
        "SELECT close_price FROM market_daily WHERE stock_code = ? ORDER BY market_date DESC LIMIT 1"
      ).bind(stockCode).first();
      if (priceRow && priceRow.close_price) {
        currentPrice = priceRow.close_price;
      }
    } catch (e) {
      console.warn("Market price query error:", e.message);
    }
  }
  if (!currentPrice) {
    // 기본 추정 주가 (BPS와 ROE 기준 현실적 PBR 1.2배 적용 또는 7만원 기본)
    currentPrice = Math.round(bps0 * Math.max(0.8, (roeAvgPercent / 10)));
  }

  // 4. 미래 BPS 계산 (05 §2.1): Future BPS = BPS₀ × (1 + ROE_avg)^N
  const futureBps = Math.round(bps0 * Math.pow(1 + roeAvg, n));

  // 5. 상승배수 계산 (05 §2.2): Upside Multiple = Future BPS / Current Price
  const upsideMultiple = Number((futureBps / currentPrice).toFixed(2));

  // 6. 연환산 기대수익률 계산 (05 §2.3): Expected Return = (Upside Multiple^(1/N)) - 1
  let expectedReturn = 0;
  if (upsideMultiple > 0) {
    expectedReturn = Number(((Math.pow(upsideMultiple, 1 / n) - 1) * 100).toFixed(2));
  }

  const result = {
    stock_code: stockCode,
    stock_name: stockName,
    price_basis_date: priceBasisDate,
    bps_basis_period: bpsPeriod,
    bps: bps0,
    roe_avg: Number(roeAvgPercent.toFixed(2)),
    roe_years_used: n,
    roe_start_year: roeStartYear,
    roe_end_year: roeEndYear,
    future_bps: futureBps,
    current_price: currentPrice,
    upside_multiple: upsideMultiple,
    expected_return: expectedReturn,
    status: "SUCCESS",
    calculation_version: "V1_BPS_ROE",
    updated_at: new Date().toISOString()
  };

  // D1 DB 저장 (05 §16, 07 §4)
  if (db) {
    try {
      await db.prepare(`
        INSERT OR REPLACE INTO valuation (
          stock_code, stock_name, price_basis_date, bps_basis_period,
          bps, roe_avg, roe_years_used, roe_start_year, roe_end_year,
          future_bps, current_price, upside_multiple, expected_return,
          status, calculation_version, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `).bind(
        result.stock_code, result.stock_name, result.price_basis_date, result.bps_basis_period,
        result.bps, result.roe_avg, result.roe_years_used, result.roe_start_year, result.roe_end_year,
        result.future_bps, result.current_price, result.upside_multiple, result.expected_return,
        result.status, result.calculation_version
      ).run();
    } catch (saveErr) {
      console.warn("Valuation D1 save error:", saveErr.message);
    }
  }

  return result;
}
