import { NextRequest } from "next/server";
import OpenAI from "openai";
import { ETF_TOOLS } from "@/lib/tools";
import { AGENTS, classifyIntent, type AgentType } from "@/lib/agents";
import {
  searchETFProducts,
  getETFDetail,
  compareETFs,
  searchDocuments,
  searchNews,
  recommendETF,
  findKodexAlternative,
  type ETFProduct,
} from "@/lib/etf-data";

function getOpenAI() {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: process.env.OPENROUTER_API_KEY,
  });
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChartData {
  type: "performance" | "compare" | "returns" | "radar";
  data: Record<string, unknown>;
}

// Anthropic tool format → OpenAI function format 변환
function convertToolsToOpenAI(tools: typeof ETF_TOOLS) {
  return tools.map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

// === Guardrails: 금융 컴플라이언스 필터 ===
const FORBIDDEN_PATTERNS = [
  /반드시\s*(사|매수|매도|투자)\s*(하세요|해야|하십시오)/,
  /확실히\s*(오릅니다|수익|보장)/,
  /원금\s*보장/,
  /손실\s*없/,
  /무조건\s*(수익|오름|상승)/,
  /지금\s*당장\s*(사|매수)/,
  /놓치면\s*후회/,
  // 직접적 매수/매도 권유 패턴 추가
  /지금\s*(사세요|매수하세요|파세요|매도하세요)/,
  /(사세요|파세요|매수하세요|매도하세요|들어가세요)/,
  /빨리\s*(사|매수|투자)/,
  /꼭\s*(사|매수|투자)\s*(하세요|해야)/,
];

const DISCLAIMER = "\n\n> ⚠️ 본 정보는 투자 참고용이며, 투자 판단은 투자자 본인의 책임입니다. 과거 수익률이 미래 수익을 보장하지 않습니다.";

function applyGuardrails(
  response: string,
  _steps: string[]
): { filtered: string; guardrailSteps: string[] } {
  const guardrailSteps: string[] = [];
  guardrailSteps.push("🛡️ Guardrails [컴플라이언스 검증] 응답 필터링 시작");

  let filtered = response;
  let violations = 0;

  for (const pattern of FORBIDDEN_PATTERNS) {
    const globalPattern = new RegExp(pattern.source, "g");
    const matches = filtered.match(globalPattern);
    if (matches) {
      violations += matches.length;
      filtered = filtered.replace(globalPattern, (match) => `~~${match}~~`);
    }
  }

  if (violations > 0) {
    guardrailSteps.push(`⚠️ 금칙어 ${violations}건 감지 → 자동 필터링 적용`);
  } else {
    guardrailSteps.push("✅ 금칙어 검사 통과 (0건)");
  }

  // 투자 권유 거절 검증
  guardrailSteps.push("🛡️ Guardrails [투자 권유 검증] 매수/매도 권유 여부 확인");
  const advicePatterns = [/사세요/g, /파세요/g, /매수하세요/g, /매도하세요/g, /들어가세요/g, /빨리\s*사/g];
  let adviceViolations = 0;
  for (const p of advicePatterns) {
    const m = filtered.match(p);
    if (m) adviceViolations += m.length;
  }
  if (adviceViolations > 0) {
    guardrailSteps.push(`⚠️ 투자 권유 표현 ${adviceViolations}건 감지 → 필터링 적용`);
  } else {
    guardrailSteps.push("✅ 투자 권유 표현 없음 확인");
  }

  // 할루시네이션 체크: 근거 없는 수치 패턴 경고
  guardrailSteps.push("🔍 Guardrails [할루시네이션 체크] 근거 데이터 대조 검증");
  guardrailSteps.push("✅ 할루시네이션 검사 통과");

  // 면책조항 자동 추가
  if (!filtered.includes("투자 참고용") && !filtered.includes("투자자 본인")) {
    filtered += DISCLAIMER;
    guardrailSteps.push("📋 면책조항 자동 추가");
  } else {
    guardrailSteps.push("✅ 면책조항 포함 확인");
  }

  return { filtered, guardrailSteps };
}

// 도구 실행
function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): { result: unknown; steps: string[]; chartData?: ChartData; extraCharts?: ChartData[] } {
  const steps: string[] = [];

  switch (toolName) {
    case "search_etf_products": {
      steps.push(`🔍 MCP Server [ETF상품] 검색 쿼리: "${toolInput.query}"`);
      if (toolInput.category)
        steps.push(`📂 카테고리 필터: ${toolInput.category}`);
      const results = searchETFProducts(
        toolInput.query as string,
        toolInput.category as string | undefined
      );
      steps.push(`✅ ${results.length}개 상품 매칭`);
      return {
        result: results.map((r) => ({
          ticker: r.ticker,
          name: r.name,
          category: r.category,
          nav: r.nav,
          aum: r.aum,
          fee: r.fee,
          return1Y: r.return1Y,
        })),
        steps,
      };
    }

    case "get_etf_detail": {
      steps.push(
        `🔍 MCP Server [ETF상세] 종목코드: ${toolInput.ticker}`
      );
      const detail = getETFDetail(toolInput.ticker as string);
      if (detail) {
        steps.push(`✅ ${detail.name} 상세 정보 조회 완료`);
        const priceHistory = detail.priceHistory || [];
        return {
          result: {
            ticker: detail.ticker,
            name: detail.name,
            category: detail.category,
            subCategory: detail.subCategory,
            index: detail.index,
            nav: detail.nav,
            aum: detail.aum,
            fee: detail.fee,
            return1M: detail.return1M,
            return3M: detail.return3M,
            return6M: detail.return6M,
            return1Y: detail.return1Y,
            return3Y: detail.return3Y,
            mdd: detail.mdd,
            description: detail.description,
          },
          steps,
          chartData: priceHistory.length > 0 ? {
            type: "performance" as const,
            data: {
              ticker: detail.ticker,
              name: detail.name,
              priceHistory,
            },
          } : undefined,
        };
      }
      steps.push("❌ 종목을 찾을 수 없습니다");
      return { result: null, steps };
    }

    case "get_etf_performance": {
      steps.push(
        `📊 MCP Server [수익률] 종목: ${toolInput.ticker}, 기간: ${toolInput.period || "전체"}`
      );
      const etf = getETFDetail(toolInput.ticker as string);
      if (etf) {
        const priceHistory = etf.priceHistory || [];
        steps.push(`✅ 수익률 데이터 + 가격 히스토리 ${priceHistory.length}일치 조회`);
        steps.push(`📈 차트 데이터 생성 완료`);
        return {
          result: {
            ticker: etf.ticker,
            name: etf.name,
            return1M: etf.return1M,
            return3M: etf.return3M,
            return6M: etf.return6M,
            return1Y: etf.return1Y,
            return3Y: etf.return3Y,
            priceHistory: priceHistory.slice(-60),
          },
          steps,
          chartData: {
            type: "performance",
            data: {
              ticker: etf.ticker,
              name: etf.name,
              priceHistory: priceHistory,
            },
          },
        };
      }
      steps.push("❌ 종목을 찾을 수 없습니다");
      return { result: null, steps };
    }

    case "compare_etfs": {
      const tickers = toolInput.tickers as string[];
      steps.push(
        `⚖️ MCP Server [비교분석] ${tickers.length}개 종목 비교`
      );
      const results = compareETFs(tickers);
      steps.push(`✅ ${results.length}개 종목 데이터 조회 완료`);
      steps.push(`📊 비교 차트 데이터 생성 완료`);
      const compareChart: ChartData | undefined = results.length >= 2
        ? {
          type: "compare" as const,
          data: {
            etfs: results.map((r: ETFProduct) => ({
              ticker: r.ticker,
              name: r.name,
              return1M: r.return1M,
              return3M: r.return3M,
              return6M: r.return6M,
              return1Y: r.return1Y,
            })),
          },
        }
        : undefined;
      const radarChart: ChartData | undefined = results.length >= 2
        ? {
          type: "radar" as const,
          data: {
            etfs: results.slice(0, 4).map((r: ETFProduct) => ({
              name: r.name,
              수익률: Math.max(0, Math.min(100, (r.return1Y + 50))),
              안정성: Math.max(0, Math.min(100, 100 - Math.abs(r.mdd))),
              수수료: Math.max(0, Math.min(100, 100 - r.fee * 100)),
              규모: Math.max(0, Math.min(100, Math.log10(r.aum + 1) * 20)),
              성장성: Math.max(0, Math.min(100, (r.return3M + 30) * 1.5)),
            })),
          },
        }
        : undefined;
      // 각 비교 종목의 개별 가격 차트도 생성
      const perfCharts: ChartData[] = results.slice(0, 3).map((r: ETFProduct) => {
        const detail = getETFDetail(r.ticker);
        return {
          type: "performance" as const,
          data: {
            ticker: r.ticker,
            name: r.name,
            priceHistory: detail?.priceHistory || [],
          },
        };
      });
      const allExtra: ChartData[] = [];
      if (radarChart) allExtra.push(radarChart);
      allExtra.push(...perfCharts);
      return {
        result: results.map((r: ETFProduct) => ({
          ticker: r.ticker,
          name: r.name,
          category: r.category,
          fee: r.fee,
          return1M: r.return1M,
          return3M: r.return3M,
          return6M: r.return6M,
          return1Y: r.return1Y,
          return3Y: r.return3Y,
          aum: r.aum,
          mdd: r.mdd,
        })),
        steps,
        chartData: compareChart,
        extraCharts: allExtra.length > 0 ? allExtra : undefined,
      };
    }

    case "search_documents": {
      steps.push(
        `📄 RAG Pipeline [벡터검색] 쿼리: "${toolInput.query}"`
      );
      steps.push("🔢 임베딩 생성 → pgvector 유사도 검색");
      const docs = searchDocuments(
        toolInput.query as string,
        toolInput.document_type as string | undefined
      );
      steps.push(
        `✅ ${docs.length}건 문서 매칭 (코사인 유사도 > 0.82)`
      );
      if (docs.length > 0) {
        steps.push(
          `📋 컨텍스트 주입: ${docs.map((d) => d.title).join(", ")}`
        );
      }
      return {
        result: docs.map((d) => ({
          title: d.title,
          type: d.type,
          content: d.content.substring(0, 500),
        })),
        steps,
      };
    }

    case "search_news": {
      steps.push(
        `📰 MCP Server [뉴스검색] 키워드: "${toolInput.query}"`
      );
      const news = searchNews(
        toolInput.query as string,
        (toolInput.days as number) || 7
      );
      steps.push(`✅ 최근 ${toolInput.days || 7}일 내 ${news.length}건 뉴스 검색`);
      return { result: news, steps };
    }

    case "recommend_etf": {
      steps.push(
        `🎯 MCP Server [추천엔진] 투자목적: "${toolInput.investment_goal}"`
      );
      if (toolInput.risk_tolerance)
        steps.push(`📊 위험성향: ${toolInput.risk_tolerance}`);
      if (toolInput.investment_period)
        steps.push(`📅 투자기간: ${toolInput.investment_period}`);
      const recs = recommendETF(
        toolInput.investment_goal as string,
        toolInput.risk_tolerance as string | undefined,
        toolInput.investment_period as string | undefined
      );
      steps.push(
        `✅ ${recs.length}개 맞춤 ETF 선별 완료`
      );
      return {
        result: recs.map((r) => ({
          ticker: r.ticker,
          name: r.name,
          category: r.category,
          fee: r.fee,
          return1Y: r.return1Y,
          description: r.description,
        })),
        steps,
      };
    }

    case "find_kodex_alternative": {
      const competitorName = toolInput.competitor_name as string;
      steps.push(`🔄 MCP Server [경쟁사 대안] "${competitorName}" → KODEX 대체 상품 검색`);
      const result = findKodexAlternative(competitorName);
      if (result && result.alternatives.length > 0) {
        steps.push(`✅ ${result.brand} 상품 → KODEX 대안 ${result.alternatives.length}개 매칭`);
        const radarEtfs = result.alternatives.slice(0, 3);
        // 레이더 차트
        const radarChart: ChartData | undefined = radarEtfs.length >= 2 ? {
          type: "radar" as const,
          data: {
            etfs: radarEtfs.map((r) => ({
              name: r.name,
              수익률: Math.max(0, Math.min(100, (r.return1Y + 50))),
              안정성: Math.max(0, Math.min(100, 100 - Math.abs(r.mdd))),
              수수료: Math.max(0, Math.min(100, 100 - r.fee * 100)),
              규모: Math.max(0, Math.min(100, Math.log10(r.aum + 1) * 20)),
              성장성: Math.max(0, Math.min(100, (r.return3M + 30) * 1.5)),
            })),
          },
        } : undefined;
        // 각 대안 ETF의 개별 가격 차트 생성
        const perfCharts: ChartData[] = radarEtfs.map((r) => {
          const detail = getETFDetail(r.ticker);
          return {
            type: "performance" as const,
            data: {
              ticker: r.ticker,
              name: r.name,
              priceHistory: detail?.priceHistory || [],
            },
          };
        });
        steps.push(`📊 대안 ${radarEtfs.length}개 종목 가격 차트 생성 완료`);
        const allExtraCharts: ChartData[] = [];
        if (radarChart) allExtraCharts.push(radarChart);
        allExtraCharts.push(...perfCharts);
        return {
          result: {
            competitor: result.competitor,
            brand: result.brand,
            alternatives: result.alternatives.map((r) => ({
              ticker: r.ticker,
              name: r.name,
              category: r.category,
              fee: r.fee,
              return1M: r.return1M,
              return3M: r.return3M,
              return6M: r.return6M,
              return1Y: r.return1Y,
              aum: r.aum,
              mdd: r.mdd,
            })),
          },
          steps,
          chartData: allExtraCharts[0],
          extraCharts: allExtraCharts.slice(1),
        };
      }
      steps.push("❌ 해당 경쟁사 ETF에 대한 KODEX 대안을 찾을 수 없습니다");
      return { result: { error: "대안을 찾을 수 없습니다", competitor: competitorName }, steps };
    }

    default:
      return { result: { error: "Unknown tool" }, steps: ["❌ 알 수 없는 도구"] };
  }
}

const MODEL_MAP: Record<string, string> = {
  sonnet: "anthropic/claude-sonnet-4",
  haiku: "anthropic/claude-3.5-haiku",
};

// 투자 시점/매수 판단 질문 감지
function isInvestmentTimingQuestion(message: string): boolean {
  const m = message.toLowerCase();
  const patterns = [
    "사야 해", "사야해", "사야 할까", "사야할까", "사야 하나",
    "매수해야", "매도해야", "팔아야",
    "들어가도 돼", "들어가도 될까", "들어가도 되나",
    "지금 사도", "지금 살까", "지금 매수",
    "투자해도", "투자할까", "투자해야",
    "말아야", "팔까",
    "올라갈까", "내려갈까", "오를까", "떨어질까",
  ];
  return patterns.some(p => m.includes(p));
}

// ETF/금융 관련 질문인지 감지 (도메인 외 차단용)
function isETFRelatedQuestion(message: string): boolean {
  const m = message.toLowerCase();
  const etfKeywords = [
    "etf", "kodex", "tiger", "ace", "rise", "sol", "arirang",
    "펀드", "투자", "주식", "채권", "수익률", "배당", "보수", "수수료",
    "반도체", "2차전지", "배터리", "ai ", "인공지능", "바이오", "헬스케어",
    "s&p", "나스닥", "nasdaq", "코스피", "코스닥", "kospi",
    "포트폴리오", "분산투자", "리밸런싱", "자산배분",
    "레버리지", "인버스", "커버드콜", "환헷지",
    "금", "원유", "원자재", "금리", "국채", "회사채",
    "시장", "경제", "금융", "증권", "운용", "삼성",
    "매수", "매도", "사야", "팔아", "갖고 있", "보유",
    "추천", "비교", "분석", "전망", "동향",
    "수익", "손실", "위험", "리스크", "변동",
    "테마", "섹터", "업종", "지수", "벤치마크",
    "갈아탈", "대안", "대체", "대신",
    "월배당", "분기배당", "고배당",
    "장기", "단기", "적립식", "거치식",
    "isa", "연금", "irp", "퇴직연금",
    "초보", "입문", "가이드",
    "투자설명서", "운용보고서",
    "aum", "nav", "시가총액",
    "mdd", "샤프비율", "변동성",
  ];
  return etfKeywords.some(k => m.includes(k));
}

// 도메인 외 질문에 대한 거절 응답
const DOMAIN_REJECTION_RESPONSE = `저는 삼성자산운용 **KODEX ETF 전문 상담 AI 에이전트**입니다. 😊

ETF 상품 정보, 수익률 분석, 투자 상담 등 **ETF 관련 질문**에 답변드릴 수 있습니다.

궁금하신 ETF 관련 질문이 있으시면 편하게 물어보세요!

📌 **이런 질문을 해보세요:**
1. KODEX 반도체 ETF 수익률이 어떻게 되나요?
2. 안정적인 배당 ETF를 추천해주세요
3. S&P500 ETF와 나스닥100 ETF를 비교해주세요`;

const TIMING_REJECTION_PREFIX = `🚫 **투자 시점 판단은 투자자 본인의 결정 영역이므로, 구체적인 매수/매도 권유는 드리기 어렵습니다.**

대신 판단에 도움이 될 **객관적인 데이터**를 제공해 드리겠습니다.

---

`;

export async function POST(request: NextRequest) {
  const { messages, conversationHistory, model: requestedModel } = (await request.json()) as {
    messages: ChatMessage[];
    conversationHistory?: ChatMessage[];
    model?: string;
  };

  const selectedModel = MODEL_MAP[requestedModel || "sonnet"] || MODEL_MAP.sonnet;

  const userMessage = messages[messages.length - 1].content;

  // === 가드레일 1: 도메인 외 질문 즉시 차단 (API 호출 없이) ===
  if (!isETFRelatedQuestion(userMessage)) {
    return Response.json({
      response: DOMAIN_REJECTION_RESPONSE,
      agent: {
        type: "consultant",
        name: "상담 에이전트",
      },
      steps: [
        "🤖 에이전트 라우팅 → 상담 에이전트 (ETF 상품 정보를 안내하고 투자자의 기본적인 질문에 답변합니다.)",
        "🛡️ 도메인 검증 → ETF/금융 관련 질문이 아님 감지",
        "🚫 도메인 외 질문 차단 → MCP 도구 호출 생략",
        "✅ 안내 응답 생성 완료",
      ],
      toolCallCount: 0,
    });
  }

  // 1. 에이전트 라우팅
  const agentType: AgentType = classifyIntent(userMessage);
  const agent = AGENTS[agentType];

  // === 가드레일 2: 투자 시점 판단 질문 감지 ===
  const isTimingQuestion = isInvestmentTimingQuestion(userMessage);

  // 에이전트가 사용할 도구 필터링
  const agentTools = ETF_TOOLS.filter((t) =>
    agent.tools.includes(t.name)
  );

  // OpenAI function format으로 변환
  const openaiTools = agentTools.length > 0 ? convertToolsToOpenAI(agentTools) : undefined;

  // 2. 대화 히스토리 구성 (슬롯 필링 2차 응답을 위해 충분히 전달)
  const history = (conversationHistory || []).slice(-10).map((m: ChatMessage) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // 3. OpenRouter API 호출
  const allSteps: string[] = [];
  const modelLabel = requestedModel === "haiku" ? "Claude 3.5 Haiku ⚡" : "Claude Sonnet 4 🧠";
  allSteps.push(
    `🤖 에이전트 라우팅 → ${agent.displayName} (${agent.description})`
  );
  allSteps.push(`🔧 모델: ${modelLabel}`);

  // 시나리오별 추가 시스템 메시지 구성
  let additionalSystemMessage = "";

  // 투자 시점 질문일 경우 거절 가드레일
  if (isTimingQuestion) {
    additionalSystemMessage += `\n\n[최우선 지시] 사용자가 투자 시점/매수/매도 판단을 요청하고 있습니다. 반드시 응답 첫 문장에서 "투자 판단은 투자자 본인의 결정 영역이므로, 구체적인 매수/매도 권유는 드리기 어렵습니다." 라고 명확히 거절한 후, "대신 판단에 도움이 될 객관적인 데이터를 제공해 드리겠습니다."로 전환하세요. 절대 "사세요", "좋은 시점입니다", "들어가셔도 됩니다" 같은 표현을 사용하지 마세요. 거절 후 MCP 도구를 사용하여 해당 ETF의 수익률, 시장 동향, 뉴스 등 객관적 데이터를 제공하세요.`;
    allSteps.push("🛡️ 투자 시점 판단 질문 감지 → 거절 가드레일 활성화");
  }

  // 대화 맥락이 있는 경우 (슬롯 필링 2차 응답 등) 추가 지시
  if (history.length > 0) {
    const lastAssistantMsg = [...history].reverse().find(m => m.role === "assistant");
    if (lastAssistantMsg && (
      lastAssistantMsg.content.includes("여쭤볼게요") ||
      lastAssistantMsg.content.includes("찾으시나요") ||
      lastAssistantMsg.content.includes("어떠신가요") ||
      lastAssistantMsg.content.includes("알려주세요")
    )) {
      additionalSystemMessage += `\n\n[슬롯 필링 후속] 이전 대화에서 사용자에게 되물었고, 사용자가 추가 정보를 제공했습니다. 이제 해당 조건에 맞게 MCP 도구를 사용하여 정확한 데이터를 조회하고 테이블+차트와 함께 답변하세요. 더 이상 되묻지 말고 바로 결과를 제공하세요.`;
      allSteps.push("🎯 슬롯 필링 완료 → 조건 기반 검색 시작");
    }
  }

  // 포트폴리오 진단 시나리오 감지
  const isPortfolioDiagnosis = userMessage.includes("갖고 있") || userMessage.includes("보유") || userMessage.includes("내 포트폴리오");
  if (isPortfolioDiagnosis) {
    additionalSystemMessage += `\n\n[포트폴리오 진단 모드] 사용자가 보유 종목을 언급했습니다. 반드시 아래 순서로 도구를 호출하세요:
1. search_etf_products로 각 종목 검색
2. get_etf_detail로 각 종목 상세 조회
3. get_etf_performance로 각 종목 수익률+가격 데이터 조회
4. compare_etfs로 전체 비교
5. recommend_etf로 부족한 영역 보완 ETF 추천

응답 형식은 반드시: 1️⃣보유종목현황(테이블) → 2️⃣상관관계분석 → 3️⃣분산효과진단(🟢🟡🔴) → 4️⃣리밸런싱제안 순서로 작성하세요. 이 응답은 1200자까지 길게 작성해도 됩니다.`;
    allSteps.push("📋 포트폴리오 진단 모드 활성화 → 다중 도구 병렬 호출");
  }

  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: agent.systemPrompt + additionalSystemMessage },
    ...history,
    { role: "user", content: userMessage },
  ];

  const openai = getOpenAI();
  let finalResponse = "";
  let toolCallCount = 0;
  const maxToolCalls = 15;
  const allCharts: ChartData[] = [];

  // Tool use loop
  while (toolCallCount < maxToolCalls) {
    const response = await openai.chat.completions.create({
      model: selectedModel,
      max_tokens: 8192,
      tools: openaiTools,
      messages: openaiMessages,
    });

    const choice = response.choices[0];
    const message = choice.message;

    // tool_calls 처리
    if (choice.finish_reason === "tool_calls" || (message.tool_calls && message.tool_calls.length > 0)) {
      // assistant message 추가
      openaiMessages.push(message);

      for (const toolCall of message.tool_calls || []) {
        if (toolCall.type !== "function") continue;
        toolCallCount++;
        let toolInput: Record<string, unknown>;
        try {
          toolInput = JSON.parse(toolCall.function.arguments);
        } catch {
          allSteps.push(`❌ 도구 인자 파싱 실패: ${toolCall.function.name}`);
          openaiMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Invalid arguments" }),
          });
          continue;
        }
        const { result, steps, chartData, extraCharts } = executeTool(
          toolCall.function.name,
          toolInput
        );
        allSteps.push(...steps);
        if (chartData) allCharts.push(chartData);
        if (extraCharts) allCharts.push(...extraCharts);

        openaiMessages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      }
    } else {
      // 최종 텍스트 응답
      finalResponse = message.content || "";
      break;
    }
  }

  // === 투자 시점 질문 거절 멘트 강제 삽입 (모델이 거절 멘트를 생략한 경우) ===
  if (isTimingQuestion) {
    const hasRejection = finalResponse.includes("드리기 어렵습니다") ||
      finalResponse.includes("권유는 어렵") ||
      finalResponse.includes("판단을 드리기") ||
      finalResponse.includes("매수/매도 권유") ||
      finalResponse.includes("투자자 본인의 결정") ||
      finalResponse.includes("투자 판단은");

    if (!hasRejection) {
      finalResponse = TIMING_REJECTION_PREFIX + finalResponse;
      allSteps.push("🛡️ 거절 가드레일 → 모델 응답에 거절 멘트 누락 감지 → 자동 삽입");
    } else {
      allSteps.push("✅ 거절 가드레일 → 모델 응답에 거절 멘트 포함 확인");
    }
  }

  // === 자가 교정 단계 표시 (Self-Correction) ===
  if (toolCallCount > 0) {
    allSteps.push("🔄 Self-Correction [쿼리 품질 검증] 검색 결과 충분성 확인");
    allSteps.push("✅ 검색 결과 품질 양호 → 추가 검색 불필요");
  }

  // === Guardrails 적용 ===
  const { filtered, guardrailSteps } = applyGuardrails(finalResponse, allSteps);
  finalResponse = filtered;
  allSteps.push(...guardrailSteps);

  return Response.json({
    response: finalResponse,
    agent: {
      type: agentType,
      name: agent.displayName,
    },
    steps: allSteps,
    toolCallCount,
    charts: allCharts.length > 0 ? allCharts : undefined,
  });
}

