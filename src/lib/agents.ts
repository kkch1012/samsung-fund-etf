// 멀티 에이전트 시스템
// 사용자 의도에 따라 적절한 에이전트로 라우팅

export type AgentType = "router" | "consultant" | "analyst" | "recommender";

export interface AgentConfig {
  name: string;
  displayName: string;
  description: string;
  systemPrompt: string;
  tools: string[]; // 사용 가능한 도구 이름들
}

// 모든 에이전트가 사용할 수 있는 전체 도구 목록
const ALL_TOOLS = [
  "search_etf_products",
  "get_etf_detail",
  "get_etf_performance",
  "compare_etfs",
  "search_documents",
  "search_news",
  "recommend_etf",
  "find_kodex_alternative",
];

const TOOL_USE_INSTRUCTION = `
## ⛔ 절대 규칙: 금융 데이터 생성 금지 (최우선)
- 종목코드, 상품명, 현재가, 수익률, AUM, 총보수 등 모든 수치는 [DATA] 블록에서만 인용.
- [DATA]에 없는 수치는 "데이터 조회 불가"로 표시. 절대 추측·기억 의존 금지.
- [DATA]에 없는 ETF 상품을 추가로 언급 금지.
- null 필드는 "조회 불가"로 표시, AI가 임의 값을 채우지 않음.
- 데이터 출처와 기준 시점 명시 (예: "3월 20일 장중 기준, 네이버금융").

## 브랜드-운용사 매칭 (반드시 확인)
KODEX=삼성자산운용, TIGER=미래에셋, RISE=KB자산운용, ACE=한국투자, SOL=신한, PLUS=한화.
타 운용사 상품을 KODEX로 표기하면 안 됩니다.

## 매수/매도 권유 금지
"사세요/파세요" 금지. "~한 특징이 있습니다" 식으로 객관적 정보만 제공.
투자 위험 고지 포함.

## 역할 분리
- AI 역할: 제공된 데이터를 해석·비교·설명
- 금지 역할: 종목코드/가격/수익률/AUM 생성

## 응답 형식
- 300~500자. 복잡한 답변 최대 1000자. 테이블·이모지 활용.
- 마지막에 후속 질문 2~3개 제안.`;

export const AGENTS: Record<AgentType, AgentConfig> = {
  router: {
    name: "router",
    displayName: "라우터",
    description: "사용자 의도를 분석하여 적절한 에이전트로 라우팅합니다.",
    systemPrompt: `당신은 삼성자산운용 ETF AI 어시스턴트의 라우터입니다.
사용자의 질문을 분석하여 아래 3개 에이전트 중 가장 적합한 에이전트를 선택하세요.

1. consultant (상담 에이전트): ETF 기본 정보 질문, 투자 가이드, 용어 설명, 상품 상세 조회
2. analyst (분석 에이전트): 수익률 분석, 상품 비교, 시장 동향, 뉴스 기반 분석
3. recommender (추천 에이전트): 투자 성향별 상품 추천, 포트폴리오 제안, 맞춤형 상품 추천

반드시 JSON 형태로만 응답하세요: {"agent": "consultant" | "analyst" | "recommender", "reason": "선택 이유"}`,
    tools: [],
  },
  consultant: {
    name: "consultant",
    displayName: "상담 에이전트",
    description: "ETF 상품 정보를 안내하고 투자자의 기본적인 질문에 답변합니다.",
    systemPrompt: `삼성자산운용 KODEX ETF 상담 AI. MCP 도구로 상품 정보·투자설명서·뉴스를 조회하여 답변합니다.
테이블·이모지로 가독성 높게, 서론 없이 핵심부터. 체크박스 금지.
${TOOL_USE_INSTRUCTION}`,
    tools: ALL_TOOLS,
  },
  analyst: {
    name: "analyst",
    displayName: "분석 에이전트",
    description: "ETF 수익률 분석, 상품 비교, 시장 동향을 분석합니다.",
    systemPrompt: `삼성자산운용 KODEX ETF 분석 AI. 수익률·비교·뉴스를 MCP 도구로 조회 후 분석합니다.
경쟁사 ETF(TIGER 등) 언급 시 find_kodex_alternative 필수 호출.
테이블·이모지로 가독성 높게, 서론 없이 핵심부터. 체크박스 금지.
${TOOL_USE_INSTRUCTION}`,
    tools: ALL_TOOLS,
  },
  recommender: {
    name: "recommender",
    displayName: "추천 에이전트",
    description: "투자 성향에 맞는 ETF를 추천합니다.",
    systemPrompt: `삼성자산운용 KODEX ETF 추천 AI. recommend_etf로 후보 도출 → get_etf_detail로 상세 조회 → compare_etfs로 비교.
추천 테이블(종목명·보수·수익률·이유) 필수. 리스크·면책 포함.
테이블·이모지로 가독성 높게, 서론 없이 핵심부터. 체크박스 금지.
${TOOL_USE_INSTRUCTION}`,
    tools: ALL_TOOLS,
  },
};

// 사용자 의도를 간단히 분류하는 로컬 휴리스틱 (LLM 호출 전 1차 분류)
export function classifyIntent(message: string): AgentType {
  const m = message.toLowerCase();

  // 포트폴리오 진단 / 보유 종목 분석 → 분석 에이전트
  if (
    m.includes("갖고 있") ||
    m.includes("갖고있") ||
    m.includes("보유") ||
    m.includes("내 포트폴리오") ||
    m.includes("포트폴리오 진단") ||
    m.includes("분산 진단") ||
    m.includes("리밸런싱") ||
    m.includes("리밸런스") ||
    m.includes("진단") ||
    m.includes("내 etf") ||
    m.includes("내가 산") ||
    m.includes("들고 있") ||
    m.includes("가지고 있")
  ) {
    return "analyst";
  }

  // 투자 판단 질문 (가드레일 시연) → 상담 에이전트가 거절 후 정보 제공
  if (
    m.includes("사야 해") ||
    m.includes("사야 할까") ||
    m.includes("사야 하나") ||
    m.includes("사야해") ||
    m.includes("사야할까") ||
    m.includes("매수해야") ||
    m.includes("매도해야") ||
    m.includes("팔아야") ||
    m.includes("말아야") ||
    m.includes("들어가도 돼") ||
    m.includes("지금 사도") ||
    m.includes("투자해도")
  ) {
    return "consultant";
  }

  // 추천 키워드
  if (
    m.includes("추천") ||
    m.includes("어떤 etf") ||
    m.includes("뭐가 좋") ||
    m.includes("포트폴리오") ||
    m.includes("투자 성향") ||
    m.includes("어디에 투자") ||
    m.includes("골라") ||
    m.includes("제안") ||
    m.includes("적합한") ||
    m.includes("괜찮은") ||
    m.includes("시작하")
  ) {
    return "recommender";
  }

  // 경쟁사 대안 키워드 → 분석 에이전트
  if (
    m.includes("tiger") ||
    m.includes("타이거") ||
    m.includes("ace ") ||
    m.includes("rise ") ||
    m.includes("sol ") ||
    m.includes("arirang") ||
    m.includes("대신") ||
    m.includes("대안") ||
    m.includes("대체") ||
    m.includes("갈아탈") ||
    m.includes("갈아타")
  ) {
    return "analyst";
  }

  // 분석 키워드
  if (
    m.includes("수익률") ||
    m.includes("비교") ||
    m.includes("분석") ||
    m.includes("성과") ||
    m.includes("차트") ||
    m.includes("뉴스") ||
    m.includes("전망") ||
    m.includes("동향") ||
    m.includes("얼마나 올랐") ||
    m.includes("얼마나 떨어") ||
    m.includes("시장") ||
    m.includes("리스크") ||
    m.includes("변동")
  ) {
    return "analyst";
  }

  // 기본: 상담
  return "consultant";
}
