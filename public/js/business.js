// public/js/business.js
// 04_BUSINESS_MOAT_INDUSTRY.md 및 07_PRODUCT_SPEC.md §3.3 Gemini 실시간 비즈니스/해자 분석 프론트엔드 모듈

window.loadBusinessAnalysis = async function(stockCode, stockName) {
  const code = stockCode || window.AppState.currentStock.code;
  const name = stockName || window.AppState.currentStock.name;

  // 배너 업데이트
  document.getElementById("businessTargetName").textContent = `${name} (${code})`;

  const loadingEl = document.getElementById("businessLoading");
  const resultsEl = document.getElementById("businessResults");

  loadingEl.style.display = "block";
  resultsEl.style.display = "none";

  try {
    const res = await fetch(`/api/business/${code}?name=${encodeURIComponent(name)}`);
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || errJson.notice || "Gemini 분석 실패");
    }

    const data = await res.json();
    renderBusinessAnalysis(data);

    loadingEl.style.display = "none";
    resultsEl.style.display = "block";
  } catch (err) {
    loadingEl.style.display = "none";
    alert(`Gemini AI 분석 실패:\n${err.message}\n\nCloudflare 대시보드 변수(GEMINI_API_KEY) 설정을 확인해주세요.`);
  }
};

function renderBusinessAnalysis(data) {
  // 1. 사업 모델
  const bm = data.business_model || {};
  document.getElementById("bmSummary").textContent = bm.summary || "사업 모델 요약 정보 없음";
  
  renderList("bmCustomers", bm.customers || []);
  renderList("bmProducts", bm.products || []);
  renderList("bmRevenueModel", bm.revenue_model || []);
  document.getElementById("bmPricingModel").textContent = bm.pricing_model || "-";
  renderList("bmKeyDrivers", bm.key_drivers || []);

  // 2. 경제적 해자 (Moat)
  const moatContainer = document.getElementById("moatContainer");
  const moats = data.moat || [];
  if (moats.length === 0) {
    moatContainer.innerHTML = "<p class='text-muted'>확인된 구조적 경제적 해자가 없습니다.</p>";
  } else {
    moatContainer.innerHTML = moats.map(m => `
      <div class="moat-item">
        <div class="moat-header">
          <strong>${m.type}</strong>
          <span class="moat-status status-${m.status || 'PARTIAL'}">${m.status || 'PARTIAL'}</span>
        </div>
        <p class="mb-2 text-sm">${m.description || ''}</p>
        <div class="grid-2col mt-2">
          <div>
            <h6 class="text-emerald text-xs">우위 근거 (Evidence)</h6>
            <ul class="bullet-list text-xs">${(m.evidence || []).map(e => `<li>${e}</li>`).join('')}</ul>
          </div>
          <div>
            <h6 class="text-danger text-xs">반대 증거 (Counter Evidence)</h6>
            <ul class="bullet-list text-xs">${(m.counter_evidence || []).map(ce => `<li>${ce}</li>`).join('')}</ul>
          </div>
        </div>
      </div>
    `).join('');
  }

  // 3. 산업 구조 (Industry)
  const ind = data.industry || {};
  document.getElementById("indDefinition").textContent = ind.market_definition || "산업 정보";
  document.getElementById("indStage").textContent = `단계: ${ind.industry_stage || '-'}`;
  document.getElementById("indGrowth").textContent = `성장률: ${ind.growth_rate || '-'}`;
  document.getElementById("indSupplier").textContent = ind.supplier_power || "-";
  document.getElementById("indBuyer").textContent = ind.buyer_power || "-";
  document.getElementById("indBarrier").textContent = ind.entry_barrier || "-";
  document.getElementById("indRivalry").textContent = ind.rivalry || "-";

  // 4. 경쟁사
  const compList = document.getElementById("competitorList");
  const comps = data.competitors || [];
  compList.innerHTML = comps.map(c => `
    <li><strong>${c.name}</strong>: <span class="text-muted">${c.comparison}</span></li>
  `).join('') || "<li>비교 경쟁사 정보 없음</li>";

  // 5. 리스크
  const riskList = document.getElementById("riskList");
  const risks = data.risks || [];
  riskList.innerHTML = risks.map(r => `
    <li><span class="pill pill-gray">${r.category || '리스크'}</span> ${r.description}</li>
  `).join('') || "<li>식별된 중대 리스크 없음</li>";

  // 6. Thesis & Check Required
  document.getElementById("thesisContent").textContent = data.business_thesis || "투자 논거 작성 대기";
  const checkList = document.getElementById("checkRequiredList");
  const checks = data.check_required || [];
  checkList.innerHTML = checks.map(c => `<li>🔍 ${c}</li>`).join('') || "<li>추가 확인 사항 없음</li>";
}

function renderList(elementId, items) {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (!items || items.length === 0) {
    el.innerHTML = "<li>-</li>";
    return;
  }
  el.innerHTML = items.map(it => `<li>${it}</li>`).join('');
}

document.addEventListener("DOMContentLoaded", () => {
  const btnRun = document.getElementById("btnRunBusinessAnalysis");
  const inputSearch = document.getElementById("businessSearchInput");
  const btnReanalyze = document.getElementById("btnReanalyzeGemini");

  const runAnalysis = () => {
    const q = inputSearch.value.trim();
    if (q) {
      window.loadBusinessAnalysis(q, q);
    } else {
      window.loadBusinessAnalysis();
    }
  };

  if (btnRun) btnRun.addEventListener("click", runAnalysis);
  if (inputSearch) inputSearch.addEventListener("keypress", (e) => {
    if (e.key === "Enter") runAnalysis();
  });
  if (btnReanalyze) btnReanalyze.addEventListener("click", () => {
    window.loadBusinessAnalysis();
  });
});
