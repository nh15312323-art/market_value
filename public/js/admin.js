// public/js/admin.js
// 07_PRODUCT_SPEC.md §5 기반 Cloudflare D1 용량 관리 및 삭제 모달

window.initAdminModal = function() {
  const modal = document.getElementById("adminModal");
  const btnOpen = document.getElementById("btnAdminModal");
  const btnClose = document.getElementById("btnCloseAdminModal");

  btnOpen.addEventListener("click", () => {
    modal.style.display = "flex";
    fetchDbStats();
  });

  btnClose.addEventListener("click", () => {
    modal.style.display = "none";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // 스크리닝 삭제
  document.getElementById("btnDeleteScreening").addEventListener("click", async () => {
    if (!confirm("시장 스크리닝 데이터를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/admin/screening", { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    fetchDbStats();
  });

  // 현재 종목 재무데이터 삭제
  document.getElementById("btnDeleteFinancial").addEventListener("click", async () => {
    const code = window.AppState.currentStock.code;
    if (!confirm(`종목(${code})의 재무 데이터를 삭제하시겠습니까?\n삭제 후 재조회 시 DART에서 처음부터 다시 수집합니다.`)) return;
    const res = await fetch(`/api/admin/financial/${code}`, { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    fetchDbStats();
  });

  // 전체 재무데이터 삭제
  document.getElementById("btnDeleteFinancialAll").addEventListener("click", async () => {
    if (!confirm("저장된 모든 종목의 재무 데이터를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/admin/financial", { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    fetchDbStats();
  });

  // Valuation 삭제
  document.getElementById("btnDeleteValuation").addEventListener("click", async () => {
    if (!confirm("저장된 Valuation 계산 결과를 삭제하시겠습니까?")) return;
    const res = await fetch("/api/admin/valuation", { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    fetchDbStats();
  });

  // 전체 초기화
  document.getElementById("btnDeleteAll").addEventListener("click", async () => {
    if (!confirm("⚠️ 주의: Cloudflare D1의 모든 데이터를 완전히 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.")) return;
    const res = await fetch("/api/admin/all", { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    fetchDbStats();
  });
};

async function fetchDbStats() {
  try {
    const res = await fetch("/api/admin/stats");
    const data = await res.json();
    const counts = data.counts || {};

    document.getElementById("statScreeningCount").textContent = `${(counts.screening_results || 0).toLocaleString()}건`;
    document.getElementById("statAnnualCount").textContent = `${(counts.financial_annual || 0).toLocaleString()}건`;
    document.getElementById("statQuarterlyCount").textContent = `${(counts.financial_quarterly || 0).toLocaleString()}건`;
    document.getElementById("statValuationCount").textContent = `${(counts.valuation || 0).toLocaleString()}건`;
  } catch (err) {
    console.warn("DB stats fetch fallback:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.initAdminModal();
});
