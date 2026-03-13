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
  type ETFProduct,
} from "@/lib/etf-data";

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChartData {
  type: "performance" | "compare" | "returns";
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

// 도구 실행
function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): { result: unknown; steps: string[]; chartData?: ChartData } {
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
        return { result: detail, steps };
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
        })),
        steps,
        chartData: results.length >= 2
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
          : undefined,
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

    default:
      return { result: { error: "Unknown tool" }, steps: ["❌ 알 수 없는 도구"] };
  }
}

export async function POST(request: NextRequest) {
  const { messages, conversationHistory } = (await request.json()) as {
    messages: ChatMessage[];
    conversationHistory?: ChatMessage[];
  };

  const userMessage = messages[messages.length - 1].content;

  // 1. 에이전트 라우팅
  const agentType: AgentType = classifyIntent(userMessage);
  const agent = AGENTS[agentType];

  // 에이전트가 사용할 도구 필터링
  const agentTools = ETF_TOOLS.filter((t) =>
    agent.tools.includes(t.name)
  );

  // OpenAI function format으로 변환
  const openaiTools = agentTools.length > 0 ? convertToolsToOpenAI(agentTools) : undefined;

  // 2. 대화 히스토리 구성
  const history = (conversationHistory || []).slice(-10).map((m: ChatMessage) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // 3. OpenRouter API 호출
  const allSteps: string[] = [];
  allSteps.push(
    `🤖 에이전트 라우팅 → ${agent.displayName} (${agent.description})`
  );

  let openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: agent.systemPrompt },
    ...history,
    { role: "user", content: userMessage },
  ];

  let finalResponse = "";
  let toolCallCount = 0;
  const maxToolCalls = 15;
  const allCharts: ChartData[] = [];

  // Tool use loop
  while (toolCallCount < maxToolCalls) {
    const response = await openai.chat.completions.create({
      model: "stepfun/step-3.5-flash",
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
        const toolInput = JSON.parse(toolCall.function.arguments);
        const { result, steps, chartData } = executeTool(
          toolCall.function.name,
          toolInput
        );
        allSteps.push(...steps);
        if (chartData) allCharts.push(chartData);

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
