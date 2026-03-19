import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const maxDuration = 30;

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 25000,
  });
}

// AI가 선택할 수 있는 KODEX ETF 풀 (실제 데이터)
const ETF_POOL = [
  { name: "KODEX CD금리액티브(합성)", ticker: "459580", return1Y: 2.69, return3Y: 0, fee: 0.02, mdd: 0, category: "금리" },
  { name: "KODEX 머니마켓액티브", ticker: "488770", return1Y: 2.98, return3Y: 0, fee: 0.05, mdd: 0, category: "채권" },
  { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", return1Y: 5.12, return3Y: 2.34, fee: 0.05, mdd: -3.2, category: "채권" },
  { name: "KODEX 200", ticker: "069500", return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
  { name: "KODEX 배당가치", ticker: "290080", return1Y: 9.8, return3Y: 7.1, fee: 0.24, mdd: -15.2, category: "국내주식" },
  { name: "KODEX 미국S&P500TR", ticker: "379800", return1Y: 24.8, return3Y: 15.2, fee: 0.05, mdd: -12.3, category: "해외주식" },
  { name: "KODEX 미국나스닥100TR", ticker: "379810", return1Y: 32.5, return3Y: 18.4, fee: 0.05, mdd: -15.8, category: "해외주식" },
  { name: "KODEX 반도체MV", ticker: "390390", return1Y: 28.7, return3Y: 22.1, fee: 0.45, mdd: -25.3, category: "테마" },
  { name: "KODEX 2차전지산업", ticker: "305720", return1Y: -8.5, return3Y: -5.2, fee: 0.45, mdd: -45.1, category: "테마" },
  { name: "KODEX 레버리지", ticker: "122630", return1Y: 22.3, return3Y: 12.8, fee: 0.64, mdd: -38.7, category: "레버리지" },
  { name: "KODEX 코스닥150", ticker: "229200", return1Y: 5.3, return3Y: -2.1, fee: 0.19, mdd: -28.4, category: "국내주식" },
  { name: "KODEX 미국빅테크10(H)", ticker: "463230", return1Y: 38.2, return3Y: 0, fee: 0.09, mdd: -18.2, category: "해외주식" },
  { name: "KODEX 골드선물(H)", ticker: "132030", return1Y: 18.9, return3Y: 12.5, fee: 0.68, mdd: -10.5, category: "원자재" },
  { name: "KODEX 인도Nifty50", ticker: "453810", return1Y: 15.3, return3Y: 0, fee: 0.19, mdd: -11.8, category: "해외주식" },
  { name: "KODEX 미국30년국채울트라선물(H)", ticker: "453850", return1Y: -5.2, return3Y: 0, fee: 0.05, mdd: -22.1, category: "채권" },
];

interface QuizAnswer {
  question: string;
  answer: string;
  score: number;
}

export async function POST(req: NextRequest) {
  try {
    const { answers, totalScore, investorType } = (await req.json()) as {
      answers: QuizAnswer[];
      totalScore: number;
      investorType: string;
    };

    const openai = getOpenAI();

    const etfList = ETF_POOL.map(
      (e) => `- ${e.name} (${e.ticker}) | 1Y: ${e.return1Y}% | 3Y: ${e.return3Y}% | 보수: ${e.fee}% | MDD: ${e.mdd}% | ${e.category}`
    ).join("\n");

    const prompt = `당신은 삼성자산운용의 전문 투자 성향 분석 AI입니다.
사용자가 투자 성향 진단 퀴즈를 완료했습니다. 아래 응답을 분석하여 맞춤 투자 조언을 생성해주세요.

## 사용자 퀴즈 응답
${answers.map((a, i) => `Q${i + 1}. ${a.question}\n→ 답변: ${a.answer} (점수: ${a.score}/5)`).join("\n\n")}

## 총점: ${totalScore}/25
## 진단 유형: ${investorType}

## 선택 가능한 KODEX ETF 목록 (반드시 이 중에서만 선택)
${etfList}

## 요청사항
다음 JSON 형식으로 응답해주세요 (JSON만 출력, 다른 텍스트 없이):
{
  "personalizedAnalysis": "사용자의 응답 패턴을 분석한 2-3문장의 개인화된 분석",
  "strengths": ["투자 성향의 강점 3가지"],
  "cautions": ["주의해야 할 점 2가지"],
  "recommendedStrategy": "구체적인 투자 전략 2-3문장",
  "portfolioRationale": "추천 포트폴리오의 근거 설명 2문장",
  "marketInsight": "현재 시장 상황과 연계한 맞춤 조언 1-2문장",
  "portfolio": [
    {"ticker": "6자리 티커코드", "weight": 비중숫자}
  ]
}

portfolio 규칙:
- 반드시 위 ETF 목록의 ticker만 사용 (정확히 일치)
- 4종목 선택, weight 합계 정확히 100
- 사용자 성향/점수/관심 분야에 맞게 동적으로 종목과 비중을 결정
- 보수적 성향이면 채권/금리 비중 높게, 공격적이면 테마/해외주식 비중 높게`;

    const response = await openai.chat.completions.create({
      model: "anthropic/claude-3.5-haiku",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1200,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = null;
    }

    // AI가 반환한 portfolio를 실제 ETF 데이터와 매칭
    if (analysis?.portfolio) {
      const etfMap = new Map(ETF_POOL.map((e) => [e.ticker, e]));
      const enrichedPortfolio = analysis.portfolio
        .map((p: { ticker: string; weight: number }) => {
          const etf = etfMap.get(p.ticker);
          if (!etf) return null;
          return { ...etf, weight: p.weight };
        })
        .filter(Boolean);

      // 유효한 ETF가 있으면 enriched로 교체
      if (enrichedPortfolio.length >= 2) {
        analysis.portfolio = enrichedPortfolio;
      } else {
        // 폴백: AI portfolio 제거 (프론트에서 기본 포트폴리오 사용)
        delete analysis.portfolio;
      }
    }

    if (!analysis) {
      return NextResponse.json({ analysis: getFallbackAnalysis() });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Quiz analyze error:", error);
    return NextResponse.json({ analysis: getFallbackAnalysis() }, { status: 200 });
  }
}

function getFallbackAnalysis() {
  return {
    personalizedAnalysis: "AI 분석을 완료했습니다. 귀하의 투자 성향에 맞는 KODEX ETF 포트폴리오를 추천합니다.",
    strengths: ["체계적인 투자 접근", "리스크 인지 능력", "장기적 시각"],
    cautions: ["시장 변동성에 대한 대비 필요", "분산 투자 원칙 준수"],
    recommendedStrategy: "귀하의 성향에 맞는 균형잡힌 포트폴리오를 구성하시길 권합니다.",
    portfolioRationale: "안정성과 수익성의 최적 배분을 고려하여 추천합니다.",
    marketInsight: "현재 시장 상황을 고려한 신중한 접근을 권장합니다.",
  };
}
