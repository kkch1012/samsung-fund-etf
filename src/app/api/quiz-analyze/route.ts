import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

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

    const prompt = `당신은 삼성자산운용의 전문 투자 성향 분석 AI입니다.
사용자가 투자 성향 진단 퀴즈를 완료했습니다. 아래 응답을 분석하여 맞춤 투자 조언을 생성해주세요.

## 사용자 퀴즈 응답
${answers.map((a, i) => `Q${i + 1}. ${a.question}\n→ 답변: ${a.answer} (점수: ${a.score}/5)`).join("\n\n")}

## 총점: ${totalScore}/25
## 진단 유형: ${investorType}

## 요청사항
다음 JSON 형식으로 응답해주세요 (JSON만 출력, 다른 텍스트 없이):
{
  "personalizedAnalysis": "사용자의 응답 패턴을 분석한 2-3문장의 개인화된 분석 (예: '투자 경험은 풍부하지만 손실 허용도가 보수적인 특징이 있습니다. 이는 안정적인 자산 배분을 선호하면서도 시장 기회를 놓치지 않으려는 현명한 투자자의 모습입니다.')",
  "strengths": ["투자 성향의 강점 3가지"],
  "cautions": ["주의해야 할 점 2가지"],
  "recommendedStrategy": "구체적인 투자 전략 2-3문장",
  "portfolioRationale": "추천 포트폴리오의 근거 설명 2문장",
  "marketInsight": "현재 시장 상황과 연계한 맞춤 조언 1-2문장"
}`;

    const response = await openai.chat.completions.create({
      model: "anthropic/claude-sonnet-4",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "";

    // JSON 파싱
    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      analysis = null;
    }

    if (!analysis) {
      return NextResponse.json({
        analysis: {
          personalizedAnalysis: "AI 분석을 완료했습니다. 귀하의 투자 성향에 맞는 KODEX ETF 포트폴리오를 추천합니다.",
          strengths: ["체계적인 투자 접근", "리스크 인지 능력", "장기적 시각"],
          cautions: ["시장 변동성에 대한 대비 필요", "분산 투자 원칙 준수"],
          recommendedStrategy: "귀하의 성향에 맞는 균형잡힌 포트폴리오를 구성하시길 권합니다.",
          portfolioRationale: "안정성과 수익성의 최적 배분을 고려하여 추천합니다.",
          marketInsight: "현재 시장 상황을 고려한 신중한 접근을 권장합니다.",
        },
      });
    }

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Quiz analyze error:", error);
    return NextResponse.json(
      {
        analysis: {
          personalizedAnalysis: "AI 분석 서비스에 일시적인 문제가 발생했습니다. 기본 분석 결과를 표시합니다.",
          strengths: ["투자 성향 파악 완료", "체계적인 접근", "KODEX ETF 활용 가능"],
          cautions: ["투자 전 충분한 리서치 필요", "분산 투자 권장"],
          recommendedStrategy: "진단 결과에 따른 맞춤 포트폴리오를 참고해주세요.",
          portfolioRationale: "KODEX ETF를 활용한 분산 투자를 추천합니다.",
          marketInsight: "시장 상황을 주시하며 단계적 투자를 고려해보세요.",
        },
      },
      { status: 200 }
    );
  }
}
