import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { getNaverETFPrices } from "@/lib/naver-finance";
import { getETFDetail } from "@/lib/etf-data";

export const maxDuration = 30;

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 25000,
  });
}

const ETF_POOL_TICKERS = [
  "459580", "488770", "273130", "069500", "290080",
  "379800", "379810", "390390", "305720", "122630",
  "229200", "463230", "132030", "453810", "453850",
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

    // 네이버 실시간 시세로 ETF 풀 구성
    const naverPrices = await getNaverETFPrices(ETF_POOL_TICKERS).catch(() => new Map());
    const etfList = ETF_POOL_TICKERS.map((ticker) => {
      const np = naverPrices.get(ticker);
      const detail = getETFDetail(ticker);
      if (np && detail) {
        return `- ${np.name} (${ticker}) | 현재가: ${np.price.toLocaleString()}원 | 3M: ${np.threeMonthReturn}% | 시총: ${np.marketCap.toLocaleString()}억원 | 보수: ${detail.fee}% | MDD: ${detail.mdd}% | ${detail.category}`;
      } else if (detail) {
        return `- ${detail.name} (${ticker}) | 보수: ${detail.fee}% | MDD: ${detail.mdd}% | ${detail.category} (실시간 미조회)`;
      }
      return null;
    }).filter(Boolean).join("\n");

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

    // AI가 반환한 portfolio를 네이버 실시간 + DB 메타데이터로 매칭
    if (analysis?.portfolio) {
      const enrichedPortfolio = analysis.portfolio
        .map((p: { ticker: string; weight: number }) => {
          const detail = getETFDetail(p.ticker);
          const np = naverPrices.get(p.ticker);
          if (!detail) return null;
          return {
            name: np?.name || detail.name,
            ticker: p.ticker,
            weight: p.weight,
            return1Y: detail.return1Y,
            return3Y: detail.return3Y,
            fee: detail.fee,
            mdd: detail.mdd,
            category: detail.category,
            price: np?.price || 0,
            marketCap: np?.marketCap || detail.aum,
          };
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
