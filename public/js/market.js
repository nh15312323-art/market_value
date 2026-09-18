// public/js/market.js
// 02_market_screening.md 및 07_PRODUCT_SPEC.md §3.1 시장 스크리닝 프론트엔드 모듈

let cachedScreeningData = null;
let currentMetric = "ZTV10";

const METRIC_NAMES = {
  ZTV10: "거래대금 Z-Score 10일 Top 20",
  ZTV20: "거래대금 Z-Score 20일 Top 20",
  MOMENTUM_WEIGHTED: "가중 모멘텀 (0.5×R20 + 0.3×R60 + 0.2×R120) Top 20",
  RETURN_1D: "1일 수익률 Top 20",
  RETURN_5D: "5일 수익률 Top 20",
  RETURN_10D: "10일 수익률 Top 20",
  RETURN_20D: "20일 수익률 Top 20",
  RETURN_60D: "60일 수익률 Top 20",
  RETURN_120D: "120일 수익률 Top 20",
  RS5: "KOSPI 상대강도 RS 5D Top 20",
  RS10: "KOSPI 상대강도 RS 10D Top 20",
  RS20: "KOSPI 상대강도 RS 20D Top 20",
  RS60: "KOSPI 상대강도 RS 60D Top 20",
  RS120: "KOSPI 상대강도 RS 120D Top 20",
  HIGH_52W: "52주 신고가 근접 종목 (95% 이상)"
};

window.initMarketScreening = async function() {
  await fetchScreeningData();

  // 지표 칩 클릭 바인딩
  const chips = document.querySelectorAll("#screeningMetricChips .chip");
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      currentMetric = chip.getAttribute("data-metric");
      renderScreeningTable();
    });
  });

  // 새로고침 버튼
  const btnRefresh = document.getElementById("btnRefreshScreening");
  if (btnRefresh) {
    btnRefresh.addEventListener("click", () => {
      fetchScreeningData(true);
    });
  }
};

async function fetchScreeningData(forceRefresh = false) {
  const tbody = document.getElementById("screeningTableBody");
  tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">최신 시장 스크리닝 데이터를 불러오는 중...</td></tr>`;

  try {
    const res = await fetch("/api/screening");
    const data = await res.json();
    cachedScreeningData = data;

    // 기준일 표시
    const dateEl = document.getElementById("marketBasisDate");
    if (dateEl && data.basis_date) {
      dateEl.textContent = data.basis_date;
    }

    renderScreeningTable();
  } catch (err) {
    console.error("Screening fetch error:", err);
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4 text-danger">데이터를 불러오지 못했습니다.</td></tr>`;
  }
}

function renderScreeningTable() {
  if (!cachedScreeningData || !cachedScreeningData.results) return;

  const titleEl = document.getElementById("currentMetricTitle");
  if (titleEl) {
    titleEl.textContent = METRIC_NAMES[currentMetric] || currentMetric;
  }

  const thMetric = document.getElementById("thMetricValue");
  if (thMetric) {
    if (currentMetric.startsWith("RETURN") || currentMetric.startsWith("RS") || currentMetric === "MOMENTUM_WEIGHTED") {
      thMetric.textContent = "수익률 / 상대강도 (%)";
    } else if (currentMetric.startsWith("ZTV")) {
      thMetric.textContent = "Z-Score";
    } else if (currentMetric === "HIGH_52W") {
      thMetric.textContent = "52주 최고가 대비 (%)";
    } else {
      thMetric.textContent = "지표값";
    }
  }

  const list = cachedScreeningData.results[currentMetric] || [];
  const tbody = document.getElementById("screeningTableBody");

  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center py-4">해당 조건을 만족하는 종목이 없습니다.</td></tr>`;
    return;
  }

  let html = "";
  list.forEach(item => {
    const isPositive = typeof item.value === "number" && item.value > 0;
    const valClass = isPositive ? "text-emerald font-bold" : (item.value < 0 ? "text-danger" : "");
    const formattedVal = typeof item.value === "number" ? item.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : item.value;
    const formattedPrice = item.close_price ? item.close_price.toLocaleString() + "원" : "-";
    const formattedTradingVal = item.trading_value ? Math.round(item.trading_value / 100000000).toLocaleString() : "-";

    html += `
      <tr class="screening-row" data-code="${item.stock_code}" data-name="${item.stock_name}">
        <td class="text-center font-semibold">${item.rank}</td>
        <td><code>${item.stock_code}</code></td>
        <td><strong>${item.stock_name}</strong></td>
        <td><span class="market-pill">${item.market || "KOSPI"}</span></td>
        <td class="text-right">${formattedPrice}</td>
        <td class="text-right">${formattedTradingVal}</td>
        <td class="text-right ${valClass}">${formattedVal}</td>
        <td class="text-center">
          <button class="btn btn-primary btn-sm btn-jump-fin" data-code="${item.stock_code}" data-name="${item.stock_name}">
            재무분석 &rarr;
          </button>
        </td>
      </tr>
    `;
  });

  tbody.innerHTML = html;

  // 더블클릭 이벤트 바인딩 (07_PRODUCT_SPEC.md §3.1: 종목 더블클릭 시 재무분석 이동)
  const rows = tbody.querySelectorAll(".screening-row");
  rows.forEach(row => {
    row.addEventListener("dblclick", () => {
      const code = row.getAttribute("data-code");
      const name = row.getAttribute("data-name");
      window.switchTab("financial", { stockCode: code, stockName: name });
    });
  });

  // 버튼 클릭 시 이동
  const jumpBtns = tbody.querySelectorAll(".btn-jump-fin");
  jumpBtns.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const code = btn.getAttribute("data-code");
      const name = btn.getAttribute("data-name");
      window.switchTab("financial", { stockCode: code, stockName: name });
    });
  });
}
