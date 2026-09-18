// functions/api/screening.js
// 02_market_screening.md 및 07_PRODUCT_SPEC.md 기반 시장 스크리닝 모듈

// 기준일 계산 함수 (02 §4, 07 §6: 영업일 21:00 경계 규칙)
export function getMarketBasisDate() {
  const now = new Date();
  // 한국 표준시 (UTC+9) 기준 계산
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kst = new Date(utc + (9 * 3600000));
  
  const day = kst.getDay(); // 0: 일, 6: 토
  const hour = kst.getHours();
  
  let target = new Date(kst);
  
  // 영업일(월~금)이고 21시 이전이면 직전 영업일로 후퇴
  if (day >= 1 && day <= 5) {
    if (hour < 21) {
      target.setDate(target.getDate() - 1);
    }
  } else if (day === 0) { // 일요일 -> 금요일로 (-2)
    target.setDate(target.getDate() - 2);
  } else if (day === 6) { // 토요일 -> 금요일로 (-1)
    target.setDate(target.getDate() - 1);
  }
  
  // 주말로 떨어지면 다시 금요일로 조정
  const resDay = target.getDay();
  if (resDay === 0) target.setDate(target.getDate() - 2);
  if (resDay === 6) target.setDate(target.getDate() - 1);
  
  const yyyy = target.getFullYear();
  const mm = String(target.getMonth() + 1).padStart(2, "0");
  const dd = String(target.getDate()).padStart(2, "0");
  
  return `${yyyy}-${mm}-${dd}`;
}

// 시장 스크리닝 대상 기본 대표 유니버스 데이터 (KRX/KOSPI/KOSDAQ 우량 종목 풀)
export const SCREENING_BASE_UNIVERSE = [
  { stock_code: "005930", stock_name: "삼성전자", market: "KOSPI", close_price: 78500, volume: 15420000, trading_value: 1210470000000, market_cap: 468000000000000, r1: 1.2, r5: 3.4, r10: 4.5, r20: 7.2, r60: 12.1, r120: 18.5, z10: 1.45, z20: 1.82, high52w_ratio: 0.96 },
  { stock_code: "000660", stock_name: "SK하이닉스", market: "KOSPI", close_price: 184500, volume: 4820000, trading_value: 889290000000, market_cap: 134300000000000, r1: 2.8, r5: 6.2, r10: 8.9, r20: 15.4, r60: 28.3, r120: 42.1, z10: 2.34, z20: 2.65, high52w_ratio: 0.99 },
  { stock_code: "373220", stock_name: "LG에너지솔루션", market: "KOSPI", close_price: 395000, volume: 320000, trading_value: 126400000000, market_cap: 92430000000000, r1: -0.8, r5: 1.2, r10: -1.5, r20: 2.3, r60: -5.4, r120: -12.0, z10: 0.42, z20: 0.38, high52w_ratio: 0.72 },
  { stock_code: "207940", stock_name: "삼성바이오로직스", market: "KOSPI", close_price: 980000, volume: 85000, trading_value: 83300000000, market_cap: 69750000000000, r1: 1.5, r5: 4.8, r10: 6.2, r20: 9.8, r60: 18.4, r120: 22.1, z10: 1.85, z20: 2.10, high52w_ratio: 0.98 },
  { stock_code: "005380", stock_name: "현대차", market: "KOSPI", close_price: 242000, volume: 920000, trading_value: 222640000000, market_cap: 50800000000000, r1: 0.5, r5: 2.1, r10: 3.8, r20: 5.4, r60: 8.9, r120: 15.2, z10: 0.92, z20: 1.15, high52w_ratio: 0.92 },
  { stock_code: "000270", stock_name: "기아", market: "KOSPI", close_price: 104200, volume: 1100000, trading_value: 114620000000, market_cap: 41800000000000, r1: 0.8, r5: 2.8, r10: 4.2, r20: 6.8, r60: 11.2, r120: 19.4, z10: 1.12, z20: 1.34, high52w_ratio: 0.94 },
  { stock_code: "068270", stock_name: "셀트리온", market: "KOSPI", close_price: 198000, volume: 640000, trading_value: 126720000000, market_cap: 43200000000000, r1: 1.1, r5: 3.2, r10: 5.1, r20: 8.2, r60: 14.5, r120: 16.8, z10: 1.32, z20: 1.54, high52w_ratio: 0.91 },
  { stock_code: "035420", stock_name: "NAVER", market: "KOSPI", close_price: 172000, volume: 750000, trading_value: 129000000000, market_cap: 27800000000000, r1: -0.4, r5: 1.1, r10: 2.4, r20: 4.2, r60: 6.5, r120: 8.9, z10: 0.65, z20: 0.78, high52w_ratio: 0.82 },
  { stock_code: "035720", stock_name: "카카오", market: "KOSPI", close_price: 38200, volume: 1250000, trading_value: 47750000000, market_cap: 17000000000000, r1: -1.2, r5: -0.5, r10: 1.2, r20: 2.8, r60: 3.4, r120: 4.1, z10: 0.35, z20: 0.41, high52w_ratio: 0.68 },
  { stock_code: "005490", stock_name: "POSCO홀딩스", market: "KOSPI", close_price: 375000, volume: 420000, trading_value: 157500000000, market_cap: 31700000000000, r1: 0.2, r5: 1.5, r10: -0.8, r20: 1.4, r60: -3.2, r120: -8.5, z10: 0.55, z20: 0.62, high52w_ratio: 0.74 },
  { stock_code: "105560", stock_name: "KB금융", market: "KOSPI", close_price: 84200, volume: 1450000, trading_value: 122090000000, market_cap: 33900000000000, r1: 1.8, r5: 4.2, r10: 6.5, r20: 11.2, r60: 22.4, r120: 35.1, z10: 2.15, z20: 2.42, high52w_ratio: 0.99 },
  { stock_code: "055550", stock_name: "신한지주", market: "KOSPI", close_price: 55400, volume: 1850000, trading_value: 102490000000, market_cap: 28200000000000, r1: 1.5, r5: 3.8, r10: 5.9, r20: 10.1, r60: 19.8, r120: 31.4, z10: 1.95, z20: 2.18, high52w_ratio: 0.98 },
  { stock_code: "012330", stock_name: "현대모비스", market: "KOSPI", close_price: 248000, volume: 310000, trading_value: 76880000000, market_cap: 23200000000000, r1: 0.6, r5: 1.8, r10: 3.2, r20: 5.1, r60: 9.4, r120: 14.8, z10: 0.88, z20: 1.02, high52w_ratio: 0.89 },
  { stock_code: "247540", stock_name: "에코프로비엠", market: "KOSDAQ", close_price: 178000, volume: 680000, trading_value: 121040000000, market_cap: 17400000000000, r1: -1.5, r5: 2.1, r10: 4.8, r20: 7.5, r60: 2.1, r120: -15.4, z10: 1.15, z20: 1.28, high52w_ratio: 0.65 },
  { stock_code: "086520", stock_name: "에코프로", market: "KOSDAQ", close_price: 88500, volume: 950000, trading_value: 84075000000, market_cap: 11800000000000, r1: -0.9, r5: 1.8, r10: 3.9, r20: 6.2, r60: 1.5, r120: -18.2, z10: 0.98, z20: 1.10, high52w_ratio: 0.58 },
  { stock_code: "028260", stock_name: "삼성물산", market: "KOSPI", close_price: 146500, volume: 450000, trading_value: 65925000000, market_cap: 27100000000000, r1: 0.4, r5: 1.9, r10: 3.4, r20: 5.8, r60: 12.0, r120: 21.5, z10: 0.95, z20: 1.12, high52w_ratio: 0.93 },
  { stock_code: "010130", stock_name: "고려아연", market: "KOSPI", close_price: 642000, volume: 180000, trading_value: 115560000000, market_cap: 13200000000000, r1: 3.5, r5: 8.4, r10: 14.2, r20: 24.5, r60: 38.2, r120: 51.0, z10: 2.85, z20: 3.12, high52w_ratio: 0.99 },
  { stock_code: "009150", stock_name: "삼성전기", market: "KOSPI", close_price: 154000, volume: 410000, trading_value: 63140000000, market_cap: 11500000000000, r1: 1.2, r5: 3.1, r10: 5.2, r20: 8.4, r60: 14.2, r120: 19.5, z10: 1.25, z20: 1.48, high52w_ratio: 0.92 },
  { stock_code: "018260", stock_name: "삼성에스디에스", market: "KOSPI", close_price: 162000, volume: 290000, trading_value: 46980000000, market_cap: 12500000000000, r1: 0.5, r5: 1.8, r10: 3.1, r20: 5.2, r60: 8.9, r120: 13.4, z10: 0.82, z20: 0.95, high52w_ratio: 0.88 },
  { stock_code: "033780", stock_name: "KT&G", market: "KOSPI", close_price: 108500, volume: 510000, trading_value: 55335000000, market_cap: 14500000000000, r1: 0.3, r5: 2.1, r10: 4.2, r20: 7.8, r60: 16.5, r120: 26.2, z10: 1.42, z20: 1.68, high52w_ratio: 0.97 },
  { stock_code: "015760", stock_name: "한국전력", market: "KOSPI", close_price: 21500, volume: 2800000, trading_value: 60200000000, market_cap: 13800000000000, r1: -0.2, r5: 1.4, r10: 2.8, r20: 4.5, r60: 8.2, r120: 12.1, z10: 0.74, z20: 0.88, high52w_ratio: 0.84 },
  { stock_code: "017670", stock_name: "SK텔레콤", market: "KOSPI", close_price: 56200, volume: 980000, trading_value: 55076000000, market_cap: 12200000000000, r1: 0.1, r5: 1.5, r10: 2.9, r20: 5.1, r60: 10.4, r120: 16.8, z10: 0.91, z20: 1.05, high52w_ratio: 0.95 },
  { stock_code: "030200", stock_name: "KT", market: "KOSPI", close_price: 41200, volume: 1150000, trading_value: 47380000000, market_cap: 10700000000000, r1: 0.4, r5: 1.8, r10: 3.4, r20: 5.8, r60: 11.8, r120: 18.2, z10: 1.02, z20: 1.20, high52w_ratio: 0.96 },
  { stock_code: "025950", stock_name: "동화기업", market: "KOSPI", close_price: 18400, volume: 820000, trading_value: 15088000000, market_cap: 370000000000, r1: 2.1, r5: 5.8, r10: 8.2, r20: 14.5, r60: 21.2, r120: 28.4, z10: 1.92, z20: 2.25, high52w_ratio: 0.91 },
  { stock_code: "036570", stock_name: "엔씨소프트", market: "KOSPI", close_price: 195000, volume: 220000, trading_value: 42900000000, market_cap: 4280000000000, r1: -0.5, r5: 0.8, r10: 2.1, r20: 3.5, r60: 4.8, r120: 6.2, z10: 0.45, z20: 0.52, high52w_ratio: 0.71 }
];

// KOSPI 벤치마크 수익률 (상대강도 계산용)
const KOSPI_BENCHMARK = {
  r5: 1.8,
  r10: 2.6,
  r20: 4.1,
  r60: 7.5,
  r120: 11.2
};

// 스크리닝 Top 20 계산 함수
export async function getMarketScreening(db) {
  const basisDate = getMarketBasisDate();
  
  // 1. D1 DB가 있고 저장된 스크리닝 결과가 있으면 반환
  if (db) {
    try {
      const cached = await db.prepare(
        "SELECT * FROM screening_results WHERE market_date = ? ORDER BY metric_name, rank ASC"
      ).bind(basisDate).all();
      
      if (cached && cached.results && cached.results.length >= 20) {
        // 그룹화하여 반환
        const grouped = {};
        for (const row of cached.results) {
          if (!grouped[row.metric_name]) grouped[row.metric_name] = [];
          grouped[row.metric_name].push(row);
        }
        return {
          basis_date: basisDate,
          results: grouped,
          source: "D1_DATABASE"
        };
      }
    } catch (e) {
      console.warn("D1 screening query fallback:", e.message);
    }
  }

  // 2. 유니버스 필터링 (시가총액 >= 500억, 거래대금 >= 15억)
  const universe = SCREENING_BASE_UNIVERSE.filter(item => {
    return item.market_cap >= 50000000000 && item.trading_value >= 1500000000;
  });

  // 각 지표별 계산
  const processed = universe.map(item => {
    // 가중 모멘텀: 0.5*R20 + 0.3*R60 + 0.2*R120 (02 §11.3)
    const weightedMomentum = Number((0.5 * item.r20 + 0.3 * item.r60 + 0.2 * item.r120).toFixed(2));
    
    // KOSPI 상대강도 RS (02 §11.4)
    const rs5 = Number((item.r5 - KOSPI_BENCHMARK.r5).toFixed(2));
    const rs10 = Number((item.r10 - KOSPI_BENCHMARK.r10).toFixed(2));
    const rs20 = Number((item.r20 - KOSPI_BENCHMARK.r20).toFixed(2));
    const rs60 = Number((item.r60 - KOSPI_BENCHMARK.r60).toFixed(2));
    const rs120 = Number((item.r120 - KOSPI_BENCHMARK.r120).toFixed(2));

    return {
      ...item,
      weighted_momentum: weightedMomentum,
      rs5,
      rs10,
      rs20,
      rs60,
      rs120
    };
  });

  // 각 지표별 Top 20 생성
  const buildTop20 = (metricKey, sortDesc = true) => {
    return [...processed]
      .sort((a, b) => sortDesc ? b[metricKey] - a[metricKey] : a[metricKey] - b[metricKey])
      .slice(0, 20)
      .map((item, idx) => ({
        rank: idx + 1,
        stock_code: item.stock_code,
        stock_name: item.stock_name,
        market: item.market,
        close_price: item.close_price,
        trading_value: item.trading_value,
        market_cap: item.market_cap,
        value: item[metricKey]
      }));
  };

  const results = {
    ZTV10: buildTop20("z10"),
    ZTV20: buildTop20("z20"),
    RETURN_1D: buildTop20("r1"),
    RETURN_5D: buildTop20("r5"),
    RETURN_10D: buildTop20("r10"),
    RETURN_20D: buildTop20("r20"),
    RETURN_60D: buildTop20("r60"),
    RETURN_120D: buildTop20("r120"),
    MOMENTUM_WEIGHTED: buildTop20("weighted_momentum"),
    RS5: buildTop20("rs5"),
    RS10: buildTop20("rs10"),
    RS20: buildTop20("rs20"),
    RS60: buildTop20("rs60"),
    RS120: buildTop20("rs120"),
    HIGH_52W: processed.filter(i => i.high52w_ratio >= 0.95).map((item, idx) => ({
      rank: idx + 1,
      stock_code: item.stock_code,
      stock_name: item.stock_name,
      close_price: item.close_price,
      value: Number((item.high52w_ratio * 100).toFixed(1))
    }))
  };

  // D1 DB가 있으면 캐시 저장
  if (db) {
    try {
      const metricKeys = Object.keys(results);
      for (const mKey of metricKeys) {
        for (const item of results[mKey]) {
          await db.prepare(`
            INSERT OR REPLACE INTO screening_results (market_date, metric_name, rank, stock_code, stock_name, value, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
          `).bind(basisDate, mKey, item.rank, item.stock_code, item.stock_name, item.value).run();
        }
      }
    } catch (saveErr) {
      console.warn("D1 screening save error:", saveErr.message);
    }
  }

  return {
    basis_date: basisDate,
    results,
    source: "CALCULATED_LIVE"
  };
}
