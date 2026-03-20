import { NextRequest } from "next/server";
import OpenAI from "openai";
import { searchETFProducts, getETFDetail } from "@/lib/etf-data";
import { getKISPrice } from "@/lib/kis-api";
import { getNaverETFPrice } from "@/lib/naver-finance";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

export async function POST(request: NextRequest) {
  const { userQuestion, aiResponse } = (await request.json()) as {
    userQuestion: string;
    aiResponse: string;
  };

  if (!userQuestion || !aiResponse) {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }

  // 응답에서 언급된 ETF 티커 추출
  const tickerMatches = aiResponse.match(/\b\d{6}\b/g) || [];
  const uniqueTickers = [...new Set(tickerMatches)].slice(0, 3);

  // 실제 데이터 수집 (네이버 실시간 우선 + KIS 보조)
  const factData: string[] = [];
  for (const ticker of uniqueTickers) {
    const detail = getETFDetail(ticker);
    const naver = await getNaverETFPrice(ticker).catch(() => null);
    const kis = !naver ? await getKISPrice(ticker).catch(() => null) : null;
    if (detail) {
      const price = naver ? `현재가=${naver.price.toLocaleString()}원(${naver.changeRate}%) [네이버실시간]` : (kis ? `현재가=${kis.price.toLocaleString()}원 [KIS]` : "현재가=조회불가");
      const aum = naver ? `시총=${naver.marketCap.toLocaleString()}억원 [네이버실시간]` : `AUM=${detail.aum}억원 [DB]`;
      factData.push(
        `${detail.name}(${ticker}): ${price}, ${aum}, 보수=${detail.fee}% [DB]`
      );
    }
  }

  const kwMatches = aiResponse.match(/KODEX\s+[^\s,()]+/gi) || [];
  for (const kw of kwMatches.slice(0, 3)) {
    const name = kw.replace(/^KODEX\s+/i, "");
    const results = searchETFProducts(name);
    if (results.length > 0 && !uniqueTickers.includes(results[0].ticker)) {
      const r = results[0];
      const naver = await getNaverETFPrice(r.ticker).catch(() => null);
      factData.push(
        `${r.name}(${r.ticker}): ${naver ? `현재가=${naver.price.toLocaleString()}원 [실시간]` : "현재가=조회불가"}, 보수=${r.fee}% [DB]`
      );
    }
  }

  const openai = getOpenAI();
  const res = await openai.chat.completions.create({
    model: "anthropic/claude-3.5-haiku",
    max_tokens: 800,
    messages: [
      {
        role: "system",
        content: `당신은 KODEX ETF AI 어시스턴트의 **검증 에이전트**입니다.
다른 AI가 생성한 응답을 아래 [FACT DATA]와 대조하여 팩트체크합니다.

[FACT DATA] — 실제 DB + 실시간 API 조회 결과:
${factData.length > 0 ? factData.join("\n") : "(검증용 데이터 없음)"}

검증 항목:
1. **수치 정확성**: 응답의 가격/수익률/AUM이 [FACT DATA]와 ±5% 이내인지
2. **존재하지 않는 상품**: [FACT DATA]에 없는 ETF를 AI가 만들어냈는지
3. **브랜드-운용사 매칭**: KODEX=삼성, TIGER=미래에셋 등 올바른지
4. **투자 권유**: "사세요/파세요" 등 금지 표현 여부
5. **면책조항**: 포함 여부

형식: **✅/⚠️/❌ 검증 결과** + 항목별 1줄. 200자 이내.`,
      },
      {
        role: "user",
        content: `[사용자 질문] ${userQuestion}\n\n[AI 응답 검증 대상]\n${aiResponse.slice(0, 1500)}`,
      },
    ],
  });

  const verification = res.choices[0]?.message?.content || "검증 실패";
  return Response.json({ verification });
}
