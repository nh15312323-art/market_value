// functions/api/[[route]].js
// Cloudflare Pages Functions 통합 REST API 라우터

import { findCompany, getCompanyFinancialHistory, POPULAR_STOCKS } from "./dart.js";
import { analyzeBusinessWithGemini } from "./gemini.js";
import { getMarketScreening } from "./screening.js";
import { calculateValuation } from "./valuation.js";
import { getDbStats, deleteScreeningData, deleteFinancialData, deleteValuationData, deleteAllData } from "./admin.js";

// CORS 및 JSON 응답 헬퍼
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // OPTIONS 프리플라이트 처리
  if (method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }

  const db = env.DB || null;
  const dartApiKey = env.DART_API_KEY || env.dart_api_key || "";
  const geminiApiKey = env.GEMINI_API_KEY || env.gemini_api_key || "";

  try {
    // 1. 헬스체크 및 환경 설정 점검 API (비전공자 연결 상태 확인용)
    if (path === "/api/health" || path === "/api/status") {
      return jsonResponse({
        status: "ok",
        configured: {
          has_dart_key: !!dartApiKey,
          has_gemini_key: !!geminiApiKey,
          has_d1_db: !!db
        },
        notice: !dartApiKey || !geminiApiKey
          ? "Cloudflare 환경변수에 DART_API_KEY와 GEMINI_API_KEY가 연결되어 있는지 확인해주세요."
          : "API 키가 성공적으로 설정되었습니다."
      });
    }

    // 2. 종목 검색 / 목록 API
    if (path === "/api/companies") {
      const q = url.searchParams.get("q");
      if (!q) {
        return jsonResponse({ list: POPULAR_STOCKS });
      }
      const found = findCompany(q);
      return jsonResponse({
        list: found ? [found] : POPULAR_STOCKS.filter(s => s.stock_name.includes(q) || s.stock_code.includes(q))
      });
    }

    // 3. 시장 스크리닝 API (02_market_screening.md)
    if (path === "/api/screening") {
      const screeningData = await getMarketScreening(db);
      return jsonResponse(screeningData);
    }

    // 4. 재무분석 API (03_financial_analysis.md)
    // 경로 패턴: /api/financial/:stockCode
    if (path.startsWith("/api/financial")) {
      const parts = path.split("/").filter(Boolean);
      const stockCode = parts[2] || url.searchParams.get("code");
      
      if (!stockCode) {
        return jsonResponse({ error: "종목코드가 필요합니다. (예: /api/financial/005930)" }, 400);
      }

      const company = findCompany(stockCode) || {
        stock_code: stockCode,
        stock_name: url.searchParams.get("name") || `종목(${stockCode})`,
        corp_code: null,
        market: "KOSPI"
      };

      const financialHistory = await getCompanyFinancialHistory(db, dartApiKey, company);
      return jsonResponse(financialHistory);
    }

    // 5. 비즈니스분석 API (04_BUSINESS_MOAT_INDUSTRY.md, Gemini 실시간 호출)
    // 경로 패턴: /api/business/:stockCode
    if (path.startsWith("/api/business")) {
      const parts = path.split("/").filter(Boolean);
      const stockCode = parts[2] || url.searchParams.get("code");

      if (!stockCode) {
        return jsonResponse({ error: "종목코드가 필요합니다. (예: /api/business/005930)" }, 400);
      }

      const company = findCompany(stockCode) || { stock_code: stockCode, stock_name: url.searchParams.get("name") || stockCode };

      // 재무 컨텍스트 추출
      let financialContext = null;
      try {
        const finData = await getCompanyFinancialHistory(db, dartApiKey, company);
        if (finData && finData.annual && finData.annual.length > 0) {
          const recent3 = finData.annual.slice(0, 3);
          financialContext = recent3.map(a => ({
            year: a.fiscal_year,
            revenue_krw: a.revenue,
            operating_margin_pct: a.operating_margin,
            roe_pct: a.roe,
            fcf_krw: a.fcf,
            debt_ratio_pct: a.debt_ratio
          }));
        }
      } catch (err) {
        console.warn("Context build error:", err);
      }

      if (!geminiApiKey) {
        return jsonResponse({
          error: "GEMINI_API_KEY가 없습니다.",
          notice: "Cloudflare 대시보드 > Settings > Variables에서 GEMINI_API_KEY를 설정해주세요."
        }, 400);
      }

      const analysis = await analyzeBusinessWithGemini(geminiApiKey, stockCode, company.stock_name, financialContext);
      return jsonResponse(analysis);
    }

    // 6. Valuation API (05_VALUATION.md BPS × ROE 모형)
    // 경로 패턴: /api/valuation/:stockCode
    if (path.startsWith("/api/valuation")) {
      const parts = path.split("/").filter(Boolean);
      const stockCode = parts[2] || url.searchParams.get("code");

      if (!stockCode) {
        return jsonResponse({ error: "종목코드가 필요합니다. (예: /api/valuation/005930)" }, 400);
      }

      const company = findCompany(stockCode) || { stock_code: stockCode, stock_name: url.searchParams.get("name") || stockCode };
      const finData = await getCompanyFinancialHistory(db, dartApiKey, company);

      const priceOverride = parseFloat(url.searchParams.get("price")) || 0;
      const valResult = await calculateValuation(db, stockCode, company.stock_name, finData, priceOverride);
      return jsonResponse(valResult);
    }

    // 7. DB 관리 및 데이터 삭제 API (07_PRODUCT_SPEC.md §5)
    if (path === "/api/admin/stats" && method === "GET") {
      const stats = await getDbStats(db);
      return jsonResponse(stats);
    }

    if (path === "/api/admin/screening" && method === "DELETE") {
      const res = await deleteScreeningData(db);
      return jsonResponse(res);
    }

    if (path.startsWith("/api/admin/financial") && method === "DELETE") {
      const parts = path.split("/").filter(Boolean);
      const stockCode = parts[3] || null;
      const res = await deleteFinancialData(db, stockCode);
      return jsonResponse(res);
    }

    if (path.startsWith("/api/admin/valuation") && method === "DELETE") {
      const parts = path.split("/").filter(Boolean);
      const stockCode = parts[3] || null;
      const res = await deleteValuationData(db, stockCode);
      return jsonResponse(res);
    }

    if (path === "/api/admin/all" && method === "DELETE") {
      const res = await deleteAllData(db);
      return jsonResponse(res);
    }

    // 404 처리
    return jsonResponse({ error: "알 수 없는 API 경로입니다.", path }, 404);

  } catch (globalErr) {
    console.error("API Global Error:", globalErr);
    return jsonResponse({
      error: globalErr.message || "서버 내부 오류가 발생했습니다.",
      stack: globalErr.stack
    }, 500);
  }
}
