// public/js/financial.js
// 03_financial_analysis.md 및 07_PRODUCT_SPEC.md §3.2 재무분석 프론트엔드 모듈

let charts = {};
let currentFinancialData = null;

// 포맷팅 헬퍼 (억원 단위)
function formatToEok(num) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Math.round(num / 100000000).toLocaleString();
}

function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return num.toFixed(1) + "%";
}

function formatWon(num) {
  if (num === null || num === undefined || isNaN(num)) return "-";
  return Math.round(num).toLocaleString() + "원";
}

// 재무데이터 로드 및 렌더링
window.loadFinancialData = async function(stockCode, stockName) {
  const code = stockCode || window.AppState.currentStock.code;
  const name = stockName || window.AppState.currentStock.name;

  // 헤더 업데이트
  document.getElementById("targetCompanyName").innerHTML = `${name} <small id="targetStockCode">${code}</small>`;
  document.getElementById("targetStockCode").textContent = code;

  try {
    const res = await fetch(`/api/financial/${code}?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    currentFinancialData = data;

    if (data.company && data.company.market) {
      document.getElementById("targetMarket").textContent = data.company.market;
    }

    const sourceTag = document.getElementById("financialDataSource");
    sourceTag.textContent = data.source === "DART_OPENAPI" ? "DART OpenDART 실시간 수집" : "D1 DB 캐시 + 정규화";

    renderCharts(data);
    renderAnnualTable(data);
    renderQuarterlyTable(data);

  } catch (err) {
    console.error("Financial load error:", err);
  }
};

// 4대 시계열 차트 렌더링
function renderCharts(data) {
  const annuals = [...(data.annual || [])].reverse(); // 연도 오름차순
  if (annuals.length === 0) return;

  const years = annuals.map(a => `${a.fiscal_year}년`);
  const revenues = annuals.map(a => Math.round((a.revenue || 0) / 100000000));
  const opIncomes = annuals.map(a => Math.round((a.operating_income || 0) / 100000000));
  const netIncomes = annuals.map(a => Math.round((a.net_income || 0) / 100000000));

  const roes = annuals.map(a => a.roe || 0);
  const opMargins = annuals.map(a => a.operating_margin || 0);

  const cfos = annuals.map(a => Math.round((a.cfo || 0) / 100000000));
  const fcfs = annuals.map(a => Math.round((a.fcf || 0) / 100000000));

  const bpss = annuals.map(a => a.bps || 0);

  // 차트 초기화 함수
  const destroyIfExists = (id) => {
    if (charts[id]) charts[id].destroy();
  };

  const chartTheme = {
    color: "#9CA3AF",
    gridColor: "rgba(255, 255, 255, 0.06)"
  };

  // 1. 매출 / 영업이익 / 당기순이익
  destroyIfExists("revProfit");
  const ctxRev = document.getElementById("chartRevenueProfit").getContext("2d");
  charts["revProfit"] = new Chart(ctxRev, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        { label: "매출액", data: revenues, backgroundColor: "rgba(59, 130, 246, 0.6)" },
        { label: "영업이익", data: opIncomes, backgroundColor: "rgba(16, 185, 129, 0.7)" },
        { label: "당기순이익", data: netIncomes, backgroundColor: "rgba(139, 92, 246, 0.7)" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: chartTheme.color }, grid: { display: false } },
        y: { ticks: { color: chartTheme.color }, grid: { color: chartTheme.gridColor } }
      }
    }
  });

  // 2. ROE 및 영업이익률
  destroyIfExists("marginRoe");
  const ctxMargin = document.getElementById("chartMarginRoe").getContext("2d");
  charts["marginRoe"] = new Chart(ctxMargin, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        { label: "ROE (%)", data: roes, borderColor: "#10B981", backgroundColor: "rgba(16, 185, 129, 0.1)", tension: 0.3, fill: true },
        { label: "영업이익률 (%)", data: opMargins, borderColor: "#3B82F6", tension: 0.3 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: chartTheme.color }, grid: { display: false } },
        y: { ticks: { color: chartTheme.color }, grid: { color: chartTheme.gridColor } }
      }
    }
  });

  // 3. CFO vs FCF
  destroyIfExists("cashFlow");
  const ctxCash = document.getElementById("chartCashFlow").getContext("2d");
  charts["cashFlow"] = new Chart(ctxCash, {
    type: "bar",
    data: {
      labels: years,
      datasets: [
        { label: "영업현금흐름(CFO)", data: cfos, backgroundColor: "rgba(99, 102, 241, 0.6)" },
        { label: "잉여현금흐름(FCF)", data: fcfs, backgroundColor: "rgba(245, 158, 11, 0.7)" }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: chartTheme.color }, grid: { display: false } },
        y: { ticks: { color: chartTheme.color }, grid: { color: chartTheme.gridColor } }
      }
    }
  });

  // 4. BPS 성장
  destroyIfExists("bps");
  const ctxBps = document.getElementById("chartBps").getContext("2d");
  charts["bps"] = new Chart(ctxBps, {
    type: "line",
    data: {
      labels: years,
      datasets: [
        { label: "BPS (원)", data: bpss, borderColor: "#8B5CF6", backgroundColor: "rgba(139, 92, 246, 0.1)", tension: 0.3, fill: true }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { color: chartTheme.color }, grid: { display: false } },
        y: { ticks: { color: chartTheme.color }, grid: { color: chartTheme.gridColor } }
      }
    }
  });
}

// 10개년 연간 재무제표 렌더링
function renderAnnualTable(data) {
  const annuals = data.annual || [];
  const thead = document.querySelector("#tableFinancialAnnual thead tr");
  const tbody = document.getElementById("tableFinancialAnnualBody");

  if (annuals.length === 0) {
    tbody.innerHTML = `<tr><td class="text-center py-4">연간 재무데이터가 없습니다.</td></tr>`;
    return;
  }

  // 헤더 컬럼 설정 (연도)
  thead.innerHTML = `<th>항목 / 연도</th>` + annuals.map(a => `<th class="text-right">${a.fiscal_year}</th>`).join("");

  const rows = [
    { name: "매출액", key: "revenue", format: formatToEok },
    { name: "영업이익", key: "operating_income", format: formatToEok },
    { name: "당기순이익", key: "net_income", format: formatToEok },
    { name: "영업이익률", key: "operating_margin", format: formatPercent },
    { name: "ROE (자기자본이익률)", key: "roe", format: formatPercent, highlight: true },
    { name: "주당순자산(BPS)", key: "bps", format: formatWon, highlight: true },
    { name: "주당순이익(EPS)", key: "eps", format: (v) => v ? v.toLocaleString() + "원" : "-" },
    { name: "영업활동현금흐름(CFO)", key: "cfo", format: formatToEok },
    { name: "설비투자(CAPEX)", key: "capex", format: formatToEok },
    { name: "잉여현금흐름(FCF)", key: "fcf", format: formatToEok },
    { name: "부채비율", key: "debt_ratio", format: formatPercent }
  ];

  tbody.innerHTML = rows.map(r => {
    const cells = annuals.map(a => `<td class="text-right ${r.highlight ? 'text-emerald font-bold' : ''}">${r.format(a[r.key])}</td>`).join("");
    return `<tr><td><strong>${r.name}</strong></td>${cells}</tr>`;
  }).join("");
}

// 분기별 재무제표 렌더링
function renderQuarterlyTable(data) {
  const quarterlies = (data.quarterly || []).slice(0, 8); // 최근 8개 분기
  const thead = document.querySelector("#tableFinancialQuarterly thead tr");
  const tbody = document.getElementById("tableFinancialQuarterlyBody");

  if (quarterlies.length === 0) {
    tbody.innerHTML = `<tr><td class="text-center py-4">분기 재무데이터가 없습니다.</td></tr>`;
    return;
  }

  thead.innerHTML = `<th>항목 / 분기</th>` + quarterlies.map(q => `<th class="text-right">${q.fiscal_year} Q${q.quarter}</th>`).join("");

  const rows = [
    { name: "매출액", key: "revenue", format: formatToEok },
    { name: "영업이익", key: "operating_income", format: formatToEok },
    { name: "당기순이익", key: "net_income", format: formatToEok },
    { name: "영업이익률", key: "operating_margin", format: formatPercent },
    { name: "주당순자산(BPS)", key: "bps", format: formatWon, highlight: true },
    { name: "영업현금흐름(CFO)", key: "cfo", format: formatToEok },
    { name: "잉여현금흐름(FCF)", key: "fcf", format: formatToEok }
  ];

  tbody.innerHTML = rows.map(r => {
    const cells = quarterlies.map(q => `<td class="text-right ${r.highlight ? 'text-emerald font-bold' : ''}">${r.format(q[r.key])}</td>`).join("");
    return `<tr><td><strong>${r.name}</strong></td>${cells}</tr>`;
  }).join("");
}

// 이벤트 초기화
document.addEventListener("DOMContentLoaded", () => {
  // 검색 버튼
  const btnSearch = document.getElementById("btnFinancialSearch");
  const inputSearch = document.getElementById("financialSearchInput");

  const executeSearch = () => {
    const q = inputSearch.value.trim();
    if (q) {
      window.loadFinancialData(q, q);
    }
  };

  if (btnSearch) btnSearch.addEventListener("click", executeSearch);
  if (inputSearch) inputSearch.addEventListener("keypress", (e) => {
    if (e.key === "Enter") executeSearch();
  });

  // 추천 종목 칩 클릭
  const quickChips = document.querySelectorAll("#financialQuickChips .stock-chip");
  quickChips.forEach(chip => {
    chip.addEventListener("click", () => {
      const code = chip.getAttribute("data-code");
      const name = chip.getAttribute("data-name");
      window.loadFinancialData(code, name);
    });
  });

  // 우측 바로가기 버튼
  document.getElementById("btnGoToBusiness").addEventListener("click", () => {
    window.switchTab("business", {
      stockCode: window.AppState.currentStock.code,
      stockName: window.AppState.currentStock.name
    });
  });

  document.getElementById("btnGoToValuation").addEventListener("click", () => {
    window.switchTab("valuation", {
      stockCode: window.AppState.currentStock.code,
      stockName: window.AppState.currentStock.name
    });
  });

  // 회사명 더블클릭 시 팝오버 메뉴 표시 (07_PRODUCT_SPEC.md §3.2 요구사항)
  const targetCompanyEl = document.getElementById("targetCompanyName");
  const popover = document.getElementById("companyActionPopover");

  targetCompanyEl.addEventListener("dblclick", (e) => {
    e.preventDefault();
    document.getElementById("popoverStockName").textContent = window.AppState.currentStock.name;
    
    // 마우스 위치에 팝오버 배치
    popover.style.display = "block";
    popover.style.left = `${e.pageX + 10}px`;
    popover.style.top = `${e.pageY + 10}px`;
  });

  document.getElementById("btnClosePopover").addEventListener("click", () => {
    popover.style.display = "none";
  });

  document.getElementById("popoverGoBusiness").addEventListener("click", () => {
    popover.style.display = "none";
    window.switchTab("business", {
      stockCode: window.AppState.currentStock.code,
      stockName: window.AppState.currentStock.name
    });
  });

  document.getElementById("popoverGoValuation").addEventListener("click", () => {
    popover.style.display = "none";
    window.switchTab("valuation", {
      stockCode: window.AppState.currentStock.code,
      stockName: window.AppState.currentStock.name
    });
  });
});
