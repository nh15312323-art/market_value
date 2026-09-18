// functions/api/admin.js
// 07_PRODUCT_SPEC.md §5 기반 Cloudflare D1 용량 관리 및 데이터 삭제 모듈

export async function getDbStats(db) {
  if (!db) {
    return {
      status: "NO_DB_BINDING",
      message: "D1 데이터베이스가 아직 바인딩되지 않았습니다. Cloudflare Settings > Functions > D1 Database Bindings에서 'DB'를 연결해주세요.",
      counts: {
        screening_results: 0,
        companies: 0,
        financial_annual: 0,
        financial_quarterly: 0,
        valuation: 0
      }
    };
  }

  try {
    const qScreening = await db.prepare("SELECT COUNT(*) as cnt FROM screening_results").first();
    const qCompanies = await db.prepare("SELECT COUNT(*) as cnt FROM companies").first();
    const qAnnual = await db.prepare("SELECT COUNT(*) as cnt FROM financial_annual").first();
    const qQuarterly = await db.prepare("SELECT COUNT(*) as cnt FROM financial_quarterly").first();
    const qValuation = await db.prepare("SELECT COUNT(*) as cnt FROM valuation").first();

    return {
      status: "CONNECTED",
      counts: {
        screening_results: qScreening?.cnt || 0,
        companies: qCompanies?.cnt || 0,
        financial_annual: qAnnual?.cnt || 0,
        financial_quarterly: qQuarterly?.cnt || 0,
        valuation: qValuation?.cnt || 0
      }
    };
  } catch (err) {
    return {
      status: "TABLES_NOT_INITIALIZED",
      message: "D1 테이블이 아직 생성되지 않았습니다. migrations/0001_initial.sql을 적용해주세요.",
      counts: { screening_results: 0, companies: 0, financial_annual: 0, financial_quarterly: 0, valuation: 0 },
      error: err.message
    };
  }
}

export async function deleteScreeningData(db) {
  if (!db) return { success: false, message: "D1 미연결" };
  await db.prepare("DELETE FROM screening_results").run();
  await db.prepare("DELETE FROM market_daily").run();
  return { success: true, message: "시장 스크리닝 데이터가 성공적으로 삭제되었습니다." };
}

export async function deleteFinancialData(db, stockCode) {
  if (!db) return { success: false, message: "D1 미연결" };
  if (stockCode) {
    await db.prepare("DELETE FROM financial_annual WHERE corp_code = ?").bind(stockCode).run();
    await db.prepare("DELETE FROM financial_quarterly WHERE corp_code = ?").bind(stockCode).run();
    await db.prepare("DELETE FROM companies WHERE stock_code = ?").bind(stockCode).run();
    return { success: true, message: `종목(${stockCode}) 재무데이터가 삭제되었습니다.` };
  } else {
    await db.prepare("DELETE FROM financial_annual").run();
    await db.prepare("DELETE FROM financial_quarterly").run();
    await db.prepare("DELETE FROM companies").run();
    return { success: true, message: "전체 재무 데이터가 삭제되었습니다." };
  }
}

export async function deleteValuationData(db, stockCode) {
  if (!db) return { success: false, message: "D1 미연결" };
  if (stockCode) {
    await db.prepare("DELETE FROM valuation WHERE stock_code = ?").bind(stockCode).run();
    return { success: true, message: `종목(${stockCode}) Valuation 결과가 삭제되었습니다.` };
  } else {
    await db.prepare("DELETE FROM valuation").run();
    return { success: true, message: "전체 Valuation 데이터가 삭제되었습니다." };
  }
}

export async function deleteAllData(db) {
  if (!db) return { success: false, message: "D1 미연결" };
  await db.prepare("DELETE FROM screening_results").run();
  await db.prepare("DELETE FROM market_daily").run();
  await db.prepare("DELETE FROM companies").run();
  await db.prepare("DELETE FROM financial_annual").run();
  await db.prepare("DELETE FROM financial_quarterly").run();
  await db.prepare("DELETE FROM valuation").run();
  return { success: true, message: "모든 D1 데이터베이스 내용이 초기화되었습니다." };
}
