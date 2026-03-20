import { NextRequest } from "next/server";
import OpenAI from "openai";
import { searchETFProducts, getETFDetail } from "@/lib/etf-data";
import { getKISPrice } from "@/lib/kis-api";

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

  // 실제 데이터 수집 (검증용)
  const factData: string[] = [];
  for (const ticker of uniqueTickers) {
    const detail = getETFDetail(ticker);
    const kis = await getKISPrice(ticker).catch(() => null);
    if (detail) {
      factData.push(
        `${detail.name}(${ticker}): 1Y수익률=${detail.return1Y}%, 보수=${detail.fee}%, AUM=${detail.aum}억원, MDD=${detail.mdd}%` +
          (kis ? `, 실시간현재가=${kis.price}원(${kis.changeRate}%)` : "")
      );
    }
  }

  // 키워드로도 검색
  const kwMatches = aiResponse.match(/KODEX\s+[^\s,()]+/gi) || [];
  for (const kw of kwMatches.slice(0, 3)) {
    const name = kw.replace(/^KODEX\s+/i, "");
    const results = searchETFProducts(name);
    if (results.length > 0 && !uniqueTickers.includes(results[0].ticker)) {
      const r = results[0];
      factData.push(
        `${r.name}(${r.ticker}): 1Y수익률=${r.return1Y}%, 보수=${r.fee}%, AUM=${r.aum}억원`
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
다른 AI가 생성한 응답을 팩트체크하여 사용자에게 신뢰도를 알려줍니다.

아래 실제 DB 데이터와 실시간 시세를 기준으로 응답을 검증하세요:
${factData.length > 0 ? factData.join("\n") : "(검증용 데이터 없음)"}

검증 형식 (반드시 이 구조로):
**✅ 검증 결과:** (정확/부분정확/주의필요 중 택1)
- 수치 정확성: (수익률/보수/AUM 수치가 DB와 일치하는지)
- 실시간 반영: (현재가 데이터가 있다면 반영 여부)
- 투자 권유 여부: (매수/매도 권유가 있으면 경고)
- 면책조항: (포함 여부)

200자 이내로 간결하게.`,
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
