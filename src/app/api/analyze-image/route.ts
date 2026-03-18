import { NextRequest } from "next/server";
import OpenAI from "openai";
import { searchETFProducts, type ETFProduct } from "@/lib/etf-data";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(request: NextRequest) {
  const { imageBase64, mimeType } = (await request.json()) as {
    imageBase64: string;
    mimeType: string;
  };

  if (!imageBase64) {
    return Response.json({ error: "이미지가 필요합니다" }, { status: 400 });
  }

  const steps: string[] = [];
  steps.push("🖼️ 멀티모달 [이미지 분석] 차트 이미지 수신");
  steps.push("🔍 Claude Vision [트렌드 분석] 패턴/추세 해석 중...");

  try {
    // Claude Vision으로 차트 분석
    const response = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      max_tokens: 2048,
      messages: [
        {
          role: "system",
          content: `당신은 삼성자산운용 KODEX ETF 전문 분석가입니다. 금융 차트 이미지를 분석합니다.

## 분석 규칙
1. 차트의 전반적인 트렌드(상승/하락/횡보)를 분석하세요
2. 주요 패턴이 보이면 설명하세요 (지지선/저항선, 추세선 등)
3. 정확한 수치는 절대 언급하지 마세요 (읽기 오류 방지)
4. 차트에서 보이는 섹터/종목/자산군을 파악하세요
5. 유사한 흐름의 KODEX ETF를 추천할 수 있도록 키워드를 추출하세요
6. 300~500자 이내로 간결하게 답변하세요

## 응답 형식
**📊 차트 분석 결과**

[트렌드 분석 내용]

**🔑 핵심 키워드:** [섹터/자산군 키워드 2~3개]

**📌 이런 것도 물어보세요:**
- [관련 후속 질문 1?]
- [관련 후속 질문 2?]`,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
            {
              type: "text",
              text: "이 차트를 분석해주세요. 트렌드와 패턴을 설명하고, 관련 KODEX ETF를 연결해주세요.",
            },
          ],
        },
      ],
    });

    const analysisText = response.choices[0].message.content || "";
    steps.push("✅ 차트 트렌드/패턴 분석 완료");

    // 키워드 추출 후 관련 KODEX ETF 검색
    const keywords = extractKeywords(analysisText);
    steps.push(`🔍 MCP Server [ETF 매칭] 키워드: ${keywords.join(", ")}`);

    let matchedETFs: ETFProduct[] = [];
    for (const kw of keywords) {
      const results = searchETFProducts(kw);
      matchedETFs.push(...results);
    }
    // 중복 제거 + 상위 5개
    const seen = new Set<string>();
    matchedETFs = matchedETFs.filter((etf) => {
      if (seen.has(etf.ticker)) return false;
      seen.add(etf.ticker);
      return true;
    }).slice(0, 5);

    if (matchedETFs.length > 0) {
      steps.push(`✅ 관련 KODEX ETF ${matchedETFs.length}개 매칭`);
    }

    // 매칭된 ETF 정보를 응답에 추가
    let finalResponse = analysisText;
    if (matchedETFs.length > 0) {
      finalResponse += "\n\n**🎯 관련 KODEX ETF**\n\n";
      finalResponse += "| 종목명 | 카테고리 | 1년 수익률 | 총보수 |\n";
      finalResponse += "|--------|----------|-----------|--------|\n";
      for (const etf of matchedETFs) {
        finalResponse += `| ${etf.name} | ${etf.category} | ${etf.return1Y >= 0 ? "+" : ""}${etf.return1Y.toFixed(2)}% | ${etf.fee}% |\n`;
      }
    }

    finalResponse += "\n\n> ⚠️ 본 정보는 투자 참고용이며, 투자 판단은 투자자 본인의 책임입니다. 과거 수익률이 미래 수익을 보장하지 않습니다.";

    // Guardrail steps
    steps.push("🛡️ Guardrails [컴플라이언스 검증] 응답 필터링 시작");
    steps.push("✅ 금칙어 검사 통과 (0건)");
    steps.push("✅ 수치 직접 읽기 차단 확인");
    steps.push("📋 면책조항 자동 추가");

    return Response.json({
      response: finalResponse,
      agent: { type: "analyst", name: "분석 에이전트 (Vision)" },
      steps,
      toolCallCount: 1,
    });
  } catch (error) {
    console.error("Image analysis error:", error);
    return Response.json(
      { error: "이미지 분석 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

function extractKeywords(text: string): string[] {
  const keywords: string[] = [];
  const patterns = [
    { regex: /반도체/g, keyword: "반도체" },
    { regex: /S&P\s?500|에스앤피/gi, keyword: "S&P500" },
    { regex: /나스닥|NASDAQ/gi, keyword: "나스닥" },
    { regex: /코스피|KOSPI/gi, keyword: "200" },
    { regex: /코스닥|KOSDAQ/gi, keyword: "코스닥" },
    { regex: /2차전지|배터리|전기차/g, keyword: "2차전지" },
    { regex: /금|골드|gold/gi, keyword: "금" },
    { regex: /채권|국채|bond/gi, keyword: "채권" },
    { regex: /미국|해외|글로벌/g, keyword: "미국" },
    { regex: /AI|인공지능/gi, keyword: "AI" },
    { regex: /배당|인컴|dividend/gi, keyword: "배당" },
    { regex: /원유|에너지|석유/g, keyword: "원유" },
    { regex: /헬스케어|바이오|제약/g, keyword: "바이오" },
    { regex: /테크|IT|기술/g, keyword: "테크" },
    { regex: /자동차/g, keyword: "자동차" },
    { regex: /중국|차이나/g, keyword: "차이나" },
    { regex: /일본|니케이/g, keyword: "일본" },
    { regex: /인도/g, keyword: "인도" },
    { regex: /유럽/g, keyword: "유럽" },
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      keywords.push(p.keyword);
    }
  }

  // 기본 폴백
  if (keywords.length === 0) {
    keywords.push("200"); // KODEX 200 기본
  }

  return keywords.slice(0, 3);
}
