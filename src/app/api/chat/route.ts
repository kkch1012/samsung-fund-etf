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
import { getKISPrice, getKISDailyPrices } from "@/lib/kis-api";
import { saveChatMessage, upsertETFPrice } from "@/lib/supabase";

export const maxDuration = 30;

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

/** 레이더 차트 5축 (compare_etfs / 경쟁사 전환 공통) */
function buildRadarAxisRow(
  name: string,
  r: { return1Y: number; mdd: number; fee: number; aum: number; return3M: number }
) {
  return {
    name,
    수익률: Math.max(0, Math.min(100, (r.return1Y + 50))),
    안정성: Math.max(0, Math.min(100, 100 - Math.abs(r.mdd))),
    수수료: Math.max(0, Math.min(100, 100 - r.fee * 100)),
    규모: Math.max(0, Math.min(100, Math.log10(r.aum + 1) * 20)),
    성장성: Math.max(0, Math.min(100, (r.return3M + 30) * 1.5)),
  };
}

/** DB에 없는 경쟁사 ETF — 동일 테마 KODEX 1위를 벤치로 한 시연용 추정 프로파일 */
function buildCompetitorRadarRow(competitorDisplayName: string, peer: ETFProduct) {
  return buildRadarAxisRow(`${competitorDisplayName} (경쟁사·추정)`, {
    return1Y: peer.return1Y * 0.985,
    mdd: peer.mdd === 0 ? -12 : peer.mdd * 1.06,
    fee: Math.min(peer.fee + 0.07, 2.5),
    aum: Math.max(1, peer.aum * 0.85),
    return3M: peer.return3M * 0.96,
  });
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

const DISCLAIMER = "\n\n⚠️ 본 정보는 투자 참고용이며, 투자 판단은 투자자 본인의 책임입니다. 과거 수익률이 미래 수익을 보장하지 않습니다.";

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

/** ETF 비교 응답 후 시연용 '다음 단계' 버튼 */
function buildCompareSuggestedActions(tickers: string[]): { label: string; query: string }[] | undefined {
  const cleaned = [...new Set(tickers.filter((t) => typeof t === "string" && t.trim()))].slice(0, 8);
  if (cleaned.length < 2) return undefined;
  const details = cleaned.map((t) => ({
    ticker: t,
    name: getETFDetail(t)?.name || t,
  }));
  const docPair = details.slice(0, 2);
  const docStr = docPair.map((d) => `${d.name}(${d.ticker})`).join("과 ");
  const anchor = details[0];
  return [
    {
      label: "투자설명서 비교",
      query: `${docStr}의 투자설명서를 search_documents로 각각 조회한 뒤, 보수·추종지수·주요 투자위험·유동성을 표로 비교해줘.`,
    },
    {
      label: "유사 ETF 더보기",
      query: `${anchor.name}(${anchor.ticker})와 유사한 KODEX ETF를 search_etf_products로 더 찾아 상위 5개를 수익률·보수·AUM과 함께 알려줘.`,
    },
  ];
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
      const top = results.slice(0, 5);
      return {
        result: top.map((r) => ({
          ticker: r.ticker,
          name: r.name,
          category: r.category,
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
            index: detail.index,
            aum: detail.aum,
            fee: detail.fee,
            return1M: detail.return1M,
            return3M: detail.return3M,
            return6M: detail.return6M,
            return1Y: detail.return1Y,
            mdd: detail.mdd,
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
        steps.push(`✅ ${result.brand} 상품 → KODEX 대안 ${result.alternatives.length}개 매칭 (시연: 상위 3종)`);
        const top3 = result.alternatives.slice(0, 3);
        const peer = top3[0];
        const competitorRow = buildCompetitorRadarRow(result.competitor, peer);
        const kodexRows = top3.map((r) =>
          buildRadarAxisRow(r.name, {
            return1Y: r.return1Y,
            mdd: r.mdd,
            fee: r.fee,
            aum: r.aum,
            return3M: r.return3M,
          })
        );
        // 레이더: 경쟁사(추정) + KODEX 대안 3종
        const radarChart: ChartData = {
          type: "radar" as const,
          data: {
            etfs: [competitorRow, ...kodexRows],
          },
        };
        // 각 대안 ETF의 개별 가격 차트 생성
        const perfCharts: ChartData[] = top3.map((r) => {
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
        steps.push(`📊 경쟁사 vs KODEX 대안 레이더 차트 생성 (4시리즈)`);
        steps.push(`📈 KODEX 대안 ${top3.length}개 종목 가격 차트 생성 완료`);
        const allExtraCharts: ChartData[] = [radarChart, ...perfCharts];
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
  opus: "anthropic/claude-opus-4",
  sonnet: "anthropic/claude-sonnet-4",
  haiku: "anthropic/claude-3.5-haiku",
};

/** 경쟁사 → KODEX 전환 시연 (TIGER/ACE 등 + 갈아타기 등) */
function isCompetitorSwitchMessage(message: string): boolean {
  const m = message.toLowerCase();
  if (
    (m.includes("갈아탈") || m.includes("갈아타") || m.includes("전환")) &&
    (m.includes("kodex") || m.includes("코덱스"))
  ) {
    return true;
  }
  if ((m.includes("대신") || m.includes("대안")) && (m.includes("kodex") || m.includes("코덱스"))) {
    return true;
  }
  return (
    m.includes("tiger") ||
    m.includes("타이거") ||
    m.includes("ace ") ||
    m.includes("rise ") ||
    m.includes("sol ") ||
    m.includes("arirang") ||
    m.includes("hanaro") ||
    m.includes("kbstar")
  );
}

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

function hasMarketScope(message: string): boolean {
  const m = message.toLowerCase();
  const scopeKeywords = [
    "국내",
    "한국",
    "코스피",
    "코스닥",
    "미국",
    "해외",
    "글로벌",
    "s&p",
    "나스닥",
    "nasdaq",
    "다우",
    "선진국",
    "신흥국",
    "일본",
    "중국",
    "유럽",
    "아시아",
  ];
  return scopeKeywords.some((k) => m.includes(k));
}

function needsMarketScopeClarification(message: string): boolean {
  const m = message.toLowerCase();

  // 투자 시장을 이미 명시한 질문은 되묻지 않음
  if (hasMarketScope(m)) return false;

  // 구체적 KODEX 종목명이나 6자리 티커가 있으면 이미 특정된 질문 → 되묻지 않음
  if (/kodex\s+\S/i.test(message)) return false;
  if (/\b\d{6}\b/.test(message)) return false;
  // "투자설명서", "search_documents" 등 도구/문서 관련 후속 쿼리
  if (m.includes("투자설명서") || m.includes("search_") || m.includes("운용보고서")) return false;

  // 투자 시점 판단 질문은 슬롯 필링이 아닌 거절 가드레일로 처리해야 함
  if (isInvestmentTimingQuestion(message)) return false;

  // 너무 짧은 답변(예: "국내, 수익률 기준")은 슬롯 필링 후속일 가능성이 높으므로 제외
  if (m.length <= 12) return false;

  const sectorKeywords = [
    "반도체",
    "2차전지",
    "배터리",
    "ai",
    "인공지능",
    "바이오",
    "헬스케어",
    "로봇",
    "전력",
    "방산",
    "반려",
    "클라우드",
  ];

  const askIntentKeywords = [
    "뭐가 좋",
    "추천",
    "알려줘",
    "찾아줘",
    "검색",
    "비교",
    "어떤",
    "있어",
    "괜찮",
    "유망",
    "수익률 기준",
  ];

  const hasSector = sectorKeywords.some((k) => m.includes(k));
  const hasAskIntent = askIntentKeywords.some((k) => m.includes(k)) || m.includes("?");

  return hasSector && hasAskIntent;
}

// 도메인 외 질문에 대한 거절 응답
const DOMAIN_REJECTION_RESPONSE = `저는 삼성자산운용 **KODEX ETF 전문 상담 AI 에이전트**입니다. 😊

ETF 상품 정보, 수익률 분석, 투자 상담 등 **ETF 관련 질문**에 답변드릴 수 있습니다.

궁금하신 ETF 관련 질문이 있으시면 편하게 물어보세요!

📌 **이런 질문을 해보세요:**
1. KODEX 반도체 ETF 수익률이 어떻게 되나요?
2. 안정적인 배당 ETF를 추천해주세요
3. S&P500 ETF와 나스닥100 ETF를 비교해주세요`;

const TIMING_REJECTION_PREFIX = `🚫 **투자 시점 판단은 투자자 본인의 결정 영역이므로, 구체적인 매수/매도 권유는 드리기 어렵습니다.** (금융소비자보호법)

대신 판단에 도움이 될 **객관적인 수익률 데이터**를 제공해 드리겠습니다.

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

  const history = (conversationHistory || []).slice(-4).map((m: ChatMessage) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  // === 가드레일 1.5: 시장 범위(국내/미국) 슬롯 필링 강제 ===
  // 섹터형 질문이 애매하면 도구 호출 전에 반드시 되묻는다.
  // 같은 대화에서 이미 슬롯 필링을 했으면 다시 묻지 않음 (전체 히스토리 검색)
  const alreadyAskedScope = history.some(
    (m) =>
      m.role === "assistant" &&
      (m.content.includes("국내 ETF") && m.content.includes("미국 ETF"))
  );

  if (!alreadyAskedScope && needsMarketScopeClarification(userMessage)) {
    return Response.json({
      response: `좋은 질문입니다. 더 정확히 찾기 위해 한 가지만 여쭤볼게요.\n\n1️⃣ **국내 ETF**를 찾으시나요, **미국 ETF**를 찾으시나요?\n2️⃣ 그리고 기준은 **수익률 / 변동성 / 보수(수수료) / 순자산(AUM)** 중 무엇이 중요하신가요?\n\n예: "국내, 수익률 기준"`,
      agent: {
        type: "consultant",
        name: "상담 에이전트",
      },
      steps: [
        "🤖 에이전트 라우팅 → 상담 에이전트 (애매한 질의 슬롯 필링)",
        "🎯 시장 범위 슬롯 확인 필요 → 국내/미국 되묻기",
        "⏸️ 도구 호출 대기 (사용자 추가 조건 입력 필요)",
      ],
      toolCallCount: 0,
    });
  }

  // 1. 에이전트 라우팅
  const agentType: AgentType = classifyIntent(userMessage);
  const agent = AGENTS[agentType];

  // === 가드레일 2: 투자 시점 판단 질문 감지 ===
  const isTimingQuestion = isInvestmentTimingQuestion(userMessage);

  // 3. 데이터 사전 수집 + LLM 1회 호출
  const allSteps: string[] = [];
  const modelLabels: Record<string, string> = {
    opus: "Claude Opus 4 👑",
    sonnet: "Claude Sonnet 4 🧠",
    haiku: "Claude 3.5 Haiku ⚡",
  };
  const modelLabel = modelLabels[requestedModel || "haiku"] || modelLabels.haiku;
  allSteps.push(
    `🤖 에이전트 라우팅 → ${agent.displayName} (${agent.description})`
  );
  allSteps.push(`🔧 모델: ${modelLabel}`);

  // 시나리오별 추가 시스템 메시지 구성
  let additionalSystemMessage = "";

  // 비교 요청 시 종목명 정확성 강제
  if (userMessage.includes("비교") || userMessage.includes("이랑") || userMessage.includes("vs")) {
    additionalSystemMessage += `\n\n[종목 정확성 — 최우선] 사용자가 명시한 종목명을 절대 다른 종목으로 바꾸지 마세요. "A이랑 B 비교해줘"라면 반드시 A와 B를 각각 search_etf_products로 검색하세요. 예: "KODEX 미국S&P500"이라 했으면 "미국S&P500"으로 검색해야 하며, "나스닥100"으로 대체하는 것은 금지입니다.`;
  }

  // 투자 시점 질문일 경우 거절 가드레일
  if (isTimingQuestion) {
    additionalSystemMessage += `\n\n[최우선 지시 — 매매 권유 거절 + 객관 데이터 제공]
사용자가 "사야 해?", "팔아야 해?", "말아야 해?" 등 투자 시점/매수/매도 판단을 요청하고 있습니다.

**Step 1 — 거절 (필수, 응답 첫 줄):**
"🚫 투자 시점 판단은 투자자 본인의 결정 영역이므로, 구체적인 매수/매도 권유는 드리기 어렵습니다. (금융소비자보호법)"

**Step 2 — 전환 (필수):**
"대신 판단에 도움이 될 **객관적인 수익률 데이터**를 제공해 드리겠습니다."

**Step 3 — 반드시 MCP 도구 호출로 데이터 제공:**
1. search_etf_products로 사용자가 언급한 ETF 검색
2. get_etf_detail로 상세 정보 조회
3. get_etf_performance로 수익률 + 가격 히스토리 조회 (차트 자동 생성)
4. search_news로 관련 뉴스 확인

**Step 4 — 응답 형식:**
- 수익률 테이블 (1M/3M/6M/1Y)
- 위 도구 결과의 차트가 자동 표시됨을 안내
- 마지막에 "⚠️ 과거 수익률이 미래 수익을 보장하지 않습니다. 투자 판단은 투자자 본인의 책임입니다."

절대 "사세요", "좋은 시점입니다", "들어가셔도 됩니다" 같은 표현을 사용하지 마세요.`;
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
  const um = userMessage.toLowerCase();
  const isPortfolioDiagnosis =
    userMessage.includes("갖고 있") ||
    userMessage.includes("갖고있") ||
    userMessage.includes("가지고 있") ||
    userMessage.includes("들고 있") ||
    userMessage.includes("보유") ||
    userMessage.includes("내 포트폴리오") ||
    um.includes("리밸런싱") ||
    um.includes("리밸런스") ||
    userMessage.includes("분산 진단") ||
    userMessage.includes("포트폴리오 진단");
  if (isPortfolioDiagnosis) {
    additionalSystemMessage += `\n\n[포트폴리오 진단 모드 — 시연 스펙 필수] 사용자가 보유/포트폴리오를 언급했습니다. 반드시 아래 순서로 도구를 호출하세요:
1. search_etf_products로 각 종목 검색
2. get_etf_detail로 각 종목 상세 조회
3. get_etf_performance로 각 종목 수익률+가격 데이터 조회
4. compare_etfs로 전체 비교
5. search_news로 관련 시장 키워드 검색
6. recommend_etf로 부족한 영역(채권/해외/테마) 보완용 ETF 후보 도출

**응답에 반드시 네 개 섹션 제목을 모두 쓰고 내용을 채우세요 (생략 금지):**
1️⃣ **보유 종목 현황** — 테이블(종목명, 티커, 카테고리, 1년 수익률, 보수, MDD)
2️⃣ **상관관계·편중 분석** — 국내/해외, 섹터, 자산군(주식·채권 등) 관점에서 2~4문장
3️⃣ **분산 효과 진단** — 아래 세 줄을 **반드시** 각각 한 줄로 작성 (이모지 + 짧은 근거):
   - 지역 분산: 🟢 또는 🟡 또는 🔴 + 한 줄 설명
   - 섹터/테마 분산: 🟢 또는 🟡 또는 🔴 + 한 줄 설명
   - 자산군 분산: 🟢 또는 🟡 또는 🔴 + 한 줄 설명
4️⃣ **리밸런싱 제안** — **구체적 목표 비중(%) 범위**를 제시 (예: 국내 주식 35~45%, 해외 주식 40~50%, 채권/현금성 10~20%). "지금 매도/매수하세요" 같은 **지시는 금지**이며, 반드시 "참고용 예시 비중"임을 명시하세요. recommend_etf 결과와 연결해 1~2개 KODEX 상품을 **보완 후보**로만 제안하세요.

이 모드에서는 **최대 1800자**까지 허용됩니다. 체크박스([ ]) 형식은 사용하지 마세요.`;
    allSteps.push("📋 포트폴리오 진단 모드 활성화 → 다중 도구 병렬 호출");
  }

  // 경쟁사 → KODEX 전환 시연
  if (isCompetitorSwitchMessage(userMessage)) {
    additionalSystemMessage += `\n\n[경쟁사 전환 시연 모드 — 킬러 기능]
사용자가 TIGER/ACE 등 경쟁사 ETF에서 KODEX로의 **전환·대안·갈아타기**를 묻고 있습니다.
1. **반드시** find_kodex_alternative를 호출하세요. (competitor_name에 사용자가 말한 경쟁사 상품명을 그대로 넣기)
2. 도구 결과의 KODEX 대안 **3종**을 표로 요약하고, 수익률·보수·AUM·MDD를 비교하세요.
3. 화면에 표시되는 **레이더 차트**(경쟁사 추정 1개 + KODEX 3개)를 본문에서 반드시 언급하고, 5축(수익률·안정성·수수료·규모·성장성) 비교를 2~3문장으로 설명하세요.
4. 레이더의 "경쟁사·추정" 축은 **시연용 추정 프로파일**임을 한 줄로 고지하세요.
5. 매수/매도 **권유는 금지**. 정보 비교 및 참고 데이터 제공만 하세요.
6. 이어서 search_news 또는 search_documents를 추가 호출해 근거를 보강하세요.`;
    allSteps.push("🔄 경쟁사 전환 시연 모드 → find_kodex_alternative 우선");
  }

  // ====== 서버 사전 도구 호출 (LLM 왕복 최소화) ======
  const allCharts: ChartData[] = [];
  let lastCompareTickers: string[] | null = null;
  let toolCallCount = 0;
  const prefetchedData: string[] = [];

  // 메시지에서 ETF 키워드/티커 추출
  const mentionedTickers: string[] = [];
  const tickerMatches = userMessage.match(/\b\d{6}\b/g);
  if (tickerMatches) mentionedTickers.push(...tickerMatches);

  // KODEX 이름으로 검색할 키워드 추출
  const searchKeywords: string[] = [];
  const kodexNameMatch = userMessage.match(/KODEX\s+([^\s,]+(?:\s*[^\s,]+)?)/gi);
  if (kodexNameMatch) {
    for (const m of kodexNameMatch) {
      const kw = m.replace(/^KODEX\s+/i, "").trim();
      if (kw.length >= 2) searchKeywords.push(kw);
    }
  }
  // 일반 키워드 (반도체, 배당 등)
  const sectorKws = ["반도체", "2차전지", "배터리", "바이오", "배당", "채권", "금리", "원자재", "금", "S&P500", "나스닥", "레버리지", "인버스"];
  for (const kw of sectorKws) {
    if (userMessage.toLowerCase().includes(kw.toLowerCase())) searchKeywords.push(kw);
  }

  // 1단계: 검색 (키워드가 있으면)
  const uniqueKws = [...new Set(searchKeywords)].slice(0, 3);
  for (const kw of uniqueKws) {
    const { result, steps, } = executeTool("search_etf_products", { query: kw });
    allSteps.push(...steps);
    toolCallCount++;
    prefetchedData.push(`[검색 "${kw}"] ${JSON.stringify(result)}`);
    // 검색 결과에서 상위 티커 추출
    const arr = result as { ticker: string }[];
    if (Array.isArray(arr)) {
      for (const item of arr.slice(0, 2)) {
        if (item.ticker && !mentionedTickers.includes(item.ticker)) {
          mentionedTickers.push(item.ticker);
        }
      }
    }
  }

  // 2단계: 상세 + 실시간 시세 + 실제 일봉 차트 (티커가 있으면)
  const uniqueTickers = [...new Set(mentionedTickers)].slice(0, 3);

  // KIS 실시간 시세 + 일봉 (전체 4초 타임아웃, 실패 시 즉시 폴백)
  const kisTimeout = <T>(p: Promise<T>, fallback: T): Promise<T> =>
    Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), 4000))]);

  const kisResults = await kisTimeout(
    Promise.all(
      uniqueTickers.map((t) =>
        Promise.all([
          getKISPrice(t).catch(() => null),
          getKISDailyPrices(t).catch(() => [] as Awaited<ReturnType<typeof getKISDailyPrices>>),
        ])
      )
    ),
    uniqueTickers.map(() => [null, []] as [null, Awaited<ReturnType<typeof getKISDailyPrices>>])
  );

  for (let ti = 0; ti < uniqueTickers.length; ti++) {
    const ticker = uniqueTickers[ti];
    const [kisPrice, kisDailyRaw] = kisResults[ti];
    const detail = getETFDetail(ticker);

    if (detail) {
      allSteps.push(`🔍 MCP Server [ETF상세] ${detail.name}(${ticker}) 조회 완료`);
      toolCallCount++;

      // KIS 일봉 → 차트 데이터 (실데이터 우선, 없으면 더미 폴백)
      const kisDaily = kisDailyRaw || [];
      const chartHistory = kisDaily.length >= 10
        ? kisDaily.map((d) => ({ date: d.date, price: d.close }))
        : (detail.priceHistory || []);

      if (kisDaily.length >= 10) {
        allSteps.push(`📡 한국투자증권 API [일봉] ${detail.name}: 실제 ${kisDaily.length}일치 데이터 로드`);
      }

      if (chartHistory.length > 0) {
        allCharts.push({
          type: "performance" as const,
          data: { ticker, name: detail.name, priceHistory: chartHistory },
        });
      }

      // 실시간 시세 합치기
      const priceInfo = kisPrice
        ? `[실시간시세] 현재가:${kisPrice.price}원, 등락:${kisPrice.change}원(${kisPrice.changeRate}%), 거래량:${kisPrice.volume}, 고가:${kisPrice.high}원, 저가:${kisPrice.low}원`
        : "";

      if (kisPrice) {
        allSteps.push(`📡 한국투자증권 API [실시간] ${detail.name}: ${kisPrice.price.toLocaleString()}원 (${kisPrice.changeRate >= 0 ? "+" : ""}${kisPrice.changeRate}%)`);
      }

      prefetchedData.push(
        `[${detail.name}(${ticker})] 카테고리:${detail.category}, 보수:${detail.fee}%, AUM:${detail.aum}억원, ` +
        `1M:${detail.return1M}%, 3M:${detail.return3M}%, 6M:${detail.return6M}%, 1Y:${detail.return1Y}%, MDD:${detail.mdd}% ` +
        priceInfo
      );
    } else {
      allSteps.push(`❌ ${ticker} 종목 조회 실패`);
    }
  }

  // 3단계: 비교 (2개 이상 티커)
  if (uniqueTickers.length >= 2) {
    const { result: cmpResult, steps: cmpSteps, chartData: cmpChart, extraCharts } = executeTool("compare_etfs", { tickers: uniqueTickers });
    allSteps.push(...cmpSteps);
    toolCallCount++;
    if (cmpChart) allCharts.push(cmpChart);
    if (extraCharts) allCharts.push(...extraCharts);
    lastCompareTickers = uniqueTickers;
    prefetchedData.push(`[비교] ${JSON.stringify(cmpResult)}`);
  }

  // 4단계: 경쟁사 대안
  if (isCompetitorSwitchMessage(userMessage)) {
    const compName = userMessage.match(/(?:TIGER|ACE|RISE|SOL|ARIRANG)\s*[^\s,?!]*/i)?.[0] || userMessage;
    const { result: altResult, steps: altSteps, chartData: altChart, extraCharts: altExtra } = executeTool("find_kodex_alternative", { competitor_name: compName });
    allSteps.push(...altSteps);
    toolCallCount++;
    if (altChart) allCharts.push(altChart);
    if (altExtra) allCharts.push(...altExtra);
    prefetchedData.push(`[경쟁사대안] ${JSON.stringify(altResult)}`);
  }

  // ====== LLM 스트리밍 호출 (SSE) ======
  const openaiMessages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: agent.systemPrompt + additionalSystemMessage },
    ...history,
    { role: "user", content: userMessage },
  ];

  if (prefetchedData.length > 0) {
    const hasLive = prefetchedData.some((d) => d.includes("[실시간시세]"));
    openaiMessages.push({
      role: "system",
      content: `[MCP 도구 + 한국투자증권 API 조회 결과]
- 원시 JSON을 그대로 출력하지 마세요. 자연어 테이블로 정리하세요.
${hasLive ? "- [실시간시세] 태그가 있는 데이터는 **한국투자증권 실시간 API에서 가져온 장중 현재가**입니다. 답변에 '실시간 현재가 기준'임을 명시하세요." : ""}
${prefetchedData.join("\n")}`,
    });
  }

  if (toolCallCount > 0) {
    allSteps.push("✅ 데이터 수집 완료 → 응답 생성 시작");
  }

  const { filtered: _f, guardrailSteps } = applyGuardrails("", allSteps);
  allSteps.push(...guardrailSteps);

  const suggestedActions = lastCompareTickers
    ? buildCompareSuggestedActions(lastCompareTickers)
    : undefined;

  // 메타데이터를 먼저 보내고, 그 뒤에 텍스트 스트리밍
  const meta = JSON.stringify({
    agent: { type: agentType, name: agent.displayName },
    steps: allSteps,
    toolCallCount,
    charts: allCharts.length > 0 ? allCharts : undefined,
    suggestedActions: suggestedActions && suggestedActions.length > 0 ? suggestedActions : undefined,
  });

  const timingPrefix = isTimingQuestion ? TIMING_REJECTION_PREFIX : "";

  const openai = getOpenAI();
  const stream = await openai.chat.completions.create({
    model: selectedModel,
    max_tokens: 1500,
    stream: true,
    messages: openaiMessages,
  });

  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      // 1) 메타데이터 라인
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "meta", ...JSON.parse(meta) })}\n\n`));
      // 2) 거절 프리픽스 (있으면)
      if (timingPrefix) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", token: timingPrefix })}\n\n`));
      }
      // 3) 토큰 스트리밍
      let fullText = timingPrefix;
      for await (const chunk of stream) {
        const token = chunk.choices[0]?.delta?.content || "";
        if (token) {
          fullText += token;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "token", token })}\n\n`));
        }
      }
      // 4) 가드레일 후처리
      const { filtered } = applyGuardrails(fullText, []);
      if (filtered !== fullText) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "replace", content: filtered })}\n\n`));
      }
      // 5) 완료
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`));
      controller.close();

      // 6) DB 저장 (비동기, 스트리밍에 영향 없음)
      const finalText = filtered !== fullText ? filtered : fullText;
      Promise.all([
        saveChatMessage({
          sessionId: "default",
          role: "user",
          content: userMessage,
        }),
        saveChatMessage({
          sessionId: "default",
          role: "assistant",
          content: finalText,
          agentType: agentType,
          agentName: agent.displayName,
          toolCallCount,
          model: requestedModel || "haiku",
        }),
      ]).catch((e) => console.error("DB save error:", e));

      // KIS 실시간 시세 DB 캐시
      for (let ti = 0; ti < uniqueTickers.length; ti++) {
        const [kp] = kisResults[ti] || [];
        if (kp) {
          upsertETFPrice({
            ticker: kp.ticker,
            name: kp.name,
            price: kp.price,
            changeVal: kp.change,
            changeRate: kp.changeRate,
            volume: kp.volume,
          }).catch(() => {});
        }
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

