// functions/api/gemini.js
// 04_BUSINESS_MOAT_INDUSTRY.md 및 07_PRODUCT_SPEC.md 기반 Gemini AI 실시간 기업분석 모듈
// ★ V1 원칙: D1 용량 절약을 위해 DB에 저장하지 않고 실시간 호출 결과만 브라우저 세션에 반환 (§0 정책)

export async function analyzeBusinessWithGemini(apiKey, stockCode, stockName, financialContext) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다. Cloudflare 변수 또는 환경변수를 확인해주세요.");
  }

  // Gemini REST API 엔드포인트 (Gemini 2.5 Flash / Flash 최신 모델 사용)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // 04_BUSINESS_MOAT_INDUSTRY.md §70, §71 프롬프트 규격
  const systemInstruction = `
당신은 엄격한 가치투자 철학(버핏, 멍거, 팻 도시의 경제적 해자 모형)을 바탕으로 기업의 비즈니스 모델, 경쟁우위, 산업구조, 리스크를 분석하는 전문 애널리스트입니다.

다음 지침을 철저히 준수하세요:
1. FACT(객관적 사실/실적)와 COMPANY_CLAIM(회사 측 주장/홍보)을 명확히 구분할 것.
2. 미래 성장률이나 목표주가를 임의로 추정하거나 확정적인 100점 점수를 매기지 말 것.
3. 확인되지 않은 경쟁우위를 과장하지 말고, 반드시 "반대 증거(counter_evidence)"와 "현재 우위가 사라질 수 있는 이유"를 함께 제시할 것.
4. 모든 분석은 반드시 아래에 명시된 순수 JSON 형식으로만 반환할 것 (마크다운 백틱 \`\`\`json 없이 순수 JSON만 반환).
`;

  const prompt = `
대상 종목: ${stockName} (${stockCode})
참고 재무 컨텍스트:
${financialContext ? JSON.stringify(financialContext, null, 2) : "최근 재무 실적 참조"}

다음 04_BUSINESS_MOAT_INDUSTRY.md 스펙에 부합하는 JSON 구조로 분석해주세요:

{
  "stock_code": "${stockCode}",
  "stock_name": "${stockName}",
  "business_model": {
    "summary": "회사가 어떻게 돈을 버는지 1~2줄 핵심 요약",
    "customers": ["주요 고객군 2~3개 (예: 글로벌 IT 제조사, 완성차 OEM)"],
    "products": ["주요 제품/서비스 및 매출 비중 추정"],
    "revenue_model": ["수익 창출 모델 (예: B2B 장비 수주, 소프트웨어 구독, 원자재 가공마진)"],
    "pricing_model": "가격결정력 수준 및 가격 협상 구조 (고객 맞춤 협상 / 원가연동 / 시장가격 추종)",
    "key_drivers": ["핵심 수익 결정 요인 (ASP, 판매량, 가동률, 환율 등)"]
  },
  "moat": [
    {
      "type": "SWITCHING_COST (또는 NETWORK_EFFECT, COST_ADVANTAGE, INTANGIBLE_ASSET 중 택1)",
      "status": "STRONG 또는 PARTIAL 또는 NONE",
      "description": "해당 경쟁우위에 대한 핵심 설명",
      "evidence": ["경쟁우위를 뒷받침하는 구체적 근거/숫자/실적"],
      "counter_evidence": ["해당 우위를 반박하거나 제한하는 반대 증거"],
      "threats": ["경쟁사나 기술 변화로 인해 우위가 침식될 수 있는 위협 요인"]
    }
  ],
  "industry": {
    "market_definition": "해당 기업이 속한 주력 산업 정의",
    "market_size": "시장 규모 또는 성장 단계 추정",
    "growth_rate": "산업 전체의 구조적 성장률 수준 (고성장/성숙기/정체기)",
    "industry_stage": "GROWTH / MATURE / DECLINING / CYCLICAL 중 택1",
    "supplier_power": "공급자의 교섭력 (높음/중간/낮음 및 사유)",
    "buyer_power": "구매자의 교섭력 (높음/중간/낮음 및 사유)",
    "entry_barrier": "신규 진입장벽 수준 및 사유",
    "rivalry": "기존 경쟁사 간 경쟁 강도",
    "substitution": "대체재의 위협"
  },
  "competitors": [
    {
      "name": "주요 국내외 경쟁사명",
      "comparison": "대상 기업과의 경쟁 강도 및 비교 포인트"
    }
  ],
  "risks": [
    {
      "category": "고객집중 / 기술변화 / 원자재 / 규제 / 매크로 중 택1",
      "description": "위험 내용 및 예상 영향"
    }
  ],
  "business_thesis": "투자자가 이 기업을 소유해야 하는 핵심 투자 논거(Thesis) 3~4줄 요약",
  "check_required": ["투자 전 추가로 모니터링해야 할 핵심 질문 2~3가지"]
}
`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    systemInstruction: {
      parts: [{ text: systemInstruction }]
    },
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 3000,
      responseMimeType: "application/json"
    }
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API 호출 실패 (${response.status}): ${errorText}`);
  }

  const result = await response.json();
  const rawText = result?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

  try {
    const parsed = JSON.parse(rawText.trim());
    return parsed;
  } catch (parseErr) {
    // 마크다운 블록이 섞여 있을 경우 정제
    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  }
}
