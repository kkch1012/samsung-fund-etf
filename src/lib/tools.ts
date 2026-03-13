// MCP Server tool definitions
// Each tool represents a "MCP Server" endpoint

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: "object";
    properties: Record<string, unknown>;
    required: string[];
  };
}

export const ETF_TOOLS: ToolDefinition[] = [
  {
    name: "search_etf_products",
    description:
      "삼성자산운용 KODEX ETF 상품을 검색합니다. 종목명, 카테고리, 기초지수 등으로 검색할 수 있습니다. 관련 상품을 찾을 때 반드시 호출하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "검색 키워드 (종목명, 카테고리, 기초지수 등)",
        },
        category: {
          type: "string",
          enum: [
            "국내주식",
            "해외주식",
            "채권",
            "원자재",
            "레버리지/인버스",
            "테마",
          ],
          description: "ETF 카테고리 필터",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_etf_detail",
    description:
      "특정 ETF 상품의 상세 정보를 조회합니다. 수익률, 보수, 구성종목, 시가총액 등을 반환합니다. 상품을 언급할 때 반드시 상세 정보를 조회하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "ETF 종목코드 (예: 069500)",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "get_etf_performance",
    description:
      "ETF 수익률 데이터를 조회합니다. 1개월, 3개월, 6개월, 1년, 3년 수익률과 일별 가격 데이터를 반환합니다. 성과/수익률 관련 질문에 반드시 호출하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        ticker: {
          type: "string",
          description: "ETF 종목코드",
        },
        period: {
          type: "string",
          enum: ["1M", "3M", "6M", "1Y", "3Y"],
          description: "조회 기간",
        },
      },
      required: ["ticker"],
    },
  },
  {
    name: "compare_etfs",
    description:
      "여러 ETF 상품을 비교합니다. 수익률, 보수, 위험도 등을 테이블 형태로 비교합니다. 2개 이상 상품이 관련되면 반드시 비교 분석을 수행하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        tickers: {
          type: "array",
          items: { type: "string" },
          description: "비교할 ETF 종목코드 배열 (최대 5개)",
        },
      },
      required: ["tickers"],
    },
  },
  {
    name: "search_documents",
    description:
      "투자설명서, 운용보고서 등 ETF 관련 문서를 RAG 벡터 검색합니다. 관련 공식 문서의 내용을 찾아 반환합니다. 정확한 정보 제공을 위해 적극적으로 문서를 검색하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "검색할 질문 또는 키워드",
        },
        document_type: {
          type: "string",
          enum: ["투자설명서", "운용보고서", "전체"],
          description: "문서 유형 필터",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "search_news",
    description:
      "ETF 및 금융 관련 최신 뉴스를 검색합니다. 시장 동향 파악을 위해 관련 뉴스를 적극적으로 검색하세요.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "뉴스 검색 키워드",
        },
        days: {
          type: "number",
          description: "최근 N일 이내 뉴스 (기본 7일)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "recommend_etf",
    description:
      "투자 성향과 목적에 맞는 ETF를 추천합니다. 투자금액, 기간, 위험성향 등을 고려하여 맞춤형 추천을 제공합니다.",
    input_schema: {
      type: "object" as const,
      properties: {
        investment_goal: {
          type: "string",
          description: "투자 목적 (예: 노후대비, 단기수익, 분산투자 등)",
        },
        risk_tolerance: {
          type: "string",
          enum: ["안정형", "안정추구형", "위험중립형", "적극투자형", "공격투자형"],
          description: "투자 위험 성향",
        },
        investment_period: {
          type: "string",
          enum: ["단기(1년이내)", "중기(1~3년)", "장기(3년이상)"],
          description: "투자 기간",
        },
      },
      required: ["investment_goal"],
    },
  },
];
