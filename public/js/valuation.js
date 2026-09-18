// public/js/valuation.js
// 05_VALUATION.md 및 07_PRODUCT_SPEC.md §3.4 BPS × ROE 가치평가 프론트엔드 모듈

let currentValuation = null;

window.loadValuationData = async function(stockCode, stockName, priceOverride = null) {
  const code = stockCode || window.AppState.currentStock.code;
  const name = stockName || window.AppState.currentStock.name;

  document.getElementById("valCompanyName").innerHTML = `${name} <small id="valStockCode">${code}</small>`;
  document.getElementById("valStockCode").textContent = code;

  let url = `/api/valuation/${code}?name=${encodeURIComponent(name)}`;
  if (priceOverride) {
    url += `&price=${priceOverride}`;
  }

  try {
    const res = await fetch(url);
    const data = await res.json();
    currentValuation = data;
    renderValuation(data);
  } catch (err) {
    console.error("Valuation load error:", err);
  }
};

function renderValuation(data) {
  if (!data || data.status !== "SUCCESS") {
    alert(data.error || "Valuation 데이터 계산에 실패했습니다.");
    return;
  }

  document.getElementById("valuationBasisInfo").textContent = `시장 기준일: ${data.price_basis_date}`;
  document.getElementById("valBps0").textContent = data.bps ? data.bps.toLocaleString() + "원" : "-";
  document.getElementById("valBpsPeriod").textContent = `기준기간: ${data.bps_basis_period || '최근 분기'}`;
  
  document.getElementById("valRoeAvg").textContent = `${data.roe_avg}%`;
  document.getElementById("valRoeYears").textContent = `적용 기간: ${data.roe_years_used}개년 (${data.roe_start_year}~${data.roe_end_year}년)`;

  document.getElementById("valFutureBps").textContent = data.future_bps ? data.future_bps.toLocaleString() + "원" : "-";
  document.getElementById("valUpside").textContent = data.upside_multiple ? `${data.upside_multiple}배` : "-";
  
  const expReturnEl = document.getElementById("valExpectedReturn");
  if (data.expected_return !== null && data.expected_return !== undefined) {
    expReturnEl.textContent = `${data.expected_return}%`;
    expReturnEl.className = data.expected_return >= 15 ? "val-value big-text text-emerald" : "val-value big-text text-blue";
  }

  const priceInput = document.getElementById("valOverridePrice");
  if (data.current_price) {
    priceInput.value = data.current_price;
  }

  // 슬라이더 초기화
  const slider = document.getElementById("roeSlider");
  slider.value = data.roe_avg || 12;
  document.getElementById("sliderRoeVal").textContent = `${slider.value}%`;
  updateSimulation(data.bps, parseFloat(slider.value), data.roe_years_used, data.current_price);
}

// ROE 시뮬레이션 계산
function updateSimulation(bps0, simRoe, n, price) {
  if (!bps0 || !n || !price) return;
  const roeDec = simRoe / 100;
  const futureBps = Math.round(bps0 * Math.pow(1 + roeDec, n));
  const upside = Number((futureBps / price).toFixed(2));
  let expReturn = 0;
  if (upside > 0) {
    expReturn = Number(((Math.pow(upside, 1 / n) - 1) * 100).toFixed(2));
  }

  document.getElementById("simFutureBps").textContent = `${futureBps.toLocaleString()}원`;
  document.getElementById("simUpside").textContent = `${upside}배`;
  document.getElementById("simExpectedReturn").textContent = `${expReturn}%`;
}

document.addEventListener("DOMContentLoaded", () => {
  const btnSearch = document.getElementById("btnValuationSearch");
  const inputSearch = document.getElementById("valuationSearchInput");
  const btnRecalc = document.getElementById("btnRecalcValuation");
  const priceInput = document.getElementById("valOverridePrice");
  const slider = document.getElementById("roeSlider");

  const runSearch = () => {
    const q = inputSearch.value.trim();
    if (q) {
      window.loadValuationData(q, q);
    }
  };

  if (btnSearch) btnSearch.addEventListener("click", runSearch);
  if (inputSearch) inputSearch.addEventListener("keypress", (e) => {
    if (e.key === "Enter") runSearch();
  });

  if (btnRecalc) {
    btnRecalc.addEventListener("click", () => {
      const p = parseFloat(priceInput.value);
      window.loadValuationData(window.AppState.currentStock.code, window.AppState.currentStock.name, p);
    });
  }

  if (slider) {
    slider.addEventListener("input", () => {
      const val = slider.value;
      document.getElementById("sliderRoeVal").textContent = `${val}%`;
      if (currentValuation) {
        updateSimulation(
          currentValuation.bps,
          parseFloat(val),
          currentValuation.roe_years_used,
          parseFloat(priceInput.value) || currentValuation.current_price
        );
      }
    });
  }
});
