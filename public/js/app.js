// public/js/app.js
// 전역 앱 초기화, 라우팅 및 탭 간 네비게이션 관리

window.AppState = {
  currentStock: {
    code: "005930",
    name: "삼성전자"
  },
  activeTab: "market"
};

// 탭 전환 전역 함수 (07_PRODUCT_SPEC.md 탭 연결 규약)
window.switchTab = function(tabName, stockData = null) {
  if (stockData && stockData.stockCode) {
    window.AppState.currentStock.code = stockData.stockCode;
    if (stockData.stockName) {
      window.AppState.currentStock.name = stockData.stockName;
    }
  }

  // 탭 버튼 active 클래스 업데이트
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    if (tab.getAttribute("data-tab") === tabName) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });

  // 탭 컨텐츠 활성화
  const contents = document.querySelectorAll(".tab-content");
  contents.forEach(content => {
    if (content.id === `tab-${tabName}`) {
      content.classList.add("active");
    } else {
      content.classList.remove("active");
    }
  });

  window.AppState.activeTab = tabName;

  // 전환된 탭별 자동 데이터 로드
  if (tabName === "financial" && window.loadFinancialData) {
    window.loadFinancialData(window.AppState.currentStock.code, window.AppState.currentStock.name);
  } else if (tabName === "business" && window.loadBusinessAnalysis) {
    window.loadBusinessAnalysis(window.AppState.currentStock.code, window.AppState.currentStock.name);
  } else if (tabName === "valuation" && window.loadValuationData) {
    window.loadValuationData(window.AppState.currentStock.code, window.AppState.currentStock.name);
  }
};

// 헬스체크 및 환경변수/DB 연결 상태 확인
async function checkSystemHealth() {
  const statusEl = document.getElementById("systemStatus");
  try {
    const res = await fetch("/api/health");
    if (!res.ok) throw new Error("API 응답 없음");
    const data = await res.json();
    
    const dot = statusEl.querySelector(".status-dot");
    const text = statusEl.querySelector(".status-text");

    if (data.configured && data.configured.has_dart_key && data.configured.has_gemini_key) {
      dot.className = "status-dot dot-green";
      text.textContent = "Cloudflare 연결 완료 (DART & Gemini 연동)";
    } else {
      dot.className = "status-dot dot-green";
      text.textContent = "웹앱 구동 중 (API 키 확인 필요)";
    }
  } catch (e) {
    const dot = statusEl.querySelector(".status-dot");
    const text = statusEl.querySelector(".status-text");
    dot.className = "status-dot dot-green";
    text.textContent = "로컬 모드 실행 중";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // 탭 클릭 이벤트 바인딩
  const tabs = document.querySelectorAll(".nav-tab");
  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const tabName = tab.getAttribute("data-tab");
      window.switchTab(tabName);
    });
  });

  // 시스템 연결 상태 확인
  checkSystemHealth();

  // 초기 시장 스크리닝 로드
  if (window.initMarketScreening) {
    window.initMarketScreening();
  }
});
