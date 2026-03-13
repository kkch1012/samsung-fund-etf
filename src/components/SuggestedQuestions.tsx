"use client";

import {
  MessageSquare,
  Search,
  BarChart3,
  Target,
  Database,
  FileText,
  Newspaper,
  Bot,
  Shield,
  Zap,
} from "lucide-react";

const SUGGESTIONS = [
  {
    category: "상품 조회",
    icon: <Search className="w-4 h-4" />,
    color: "blue",
    questions: [
      "KODEX 200 상세 정보 알려줘",
      "해외주식 ETF 어떤 게 있어?",
      "AI 관련 ETF 검색해줘",
    ],
  },
  {
    category: "수익률 분석",
    icon: <BarChart3 className="w-4 h-4" />,
    color: "green",
    questions: [
      "KODEX 미국S&P500TR 수익률 분석해줘",
      "KODEX 200이랑 나스닥100 비교해줘",
      "최근 뉴스 기반으로 ETF 시장 동향 알려줘",
    ],
  },
  {
    category: "투자 추천",
    icon: <Target className="w-4 h-4" />,
    color: "purple",
    questions: [
      "초보자에게 적합한 ETF 추천해줘",
      "장기 투자용 포트폴리오 구성해줘",
      "안정적인 배당 ETF 추천해줘",
    ],
  },
];

const FEATURES = [
  {
    icon: <Bot className="w-5 h-5" />,
    title: "멀티 에이전트",
    desc: "상담·분석·추천 3개 전문 에이전트가 자동 라우팅",
    color: "bg-violet-50 text-violet-600 border-violet-200",
  },
  {
    icon: <Database className="w-5 h-5" />,
    title: "MCP 7개 도구",
    desc: "ETF검색, 상세, 수익률, 비교, RAG, 뉴스, 추천",
    color: "bg-blue-50 text-blue-600 border-blue-200",
  },
  {
    icon: <FileText className="w-5 h-5" />,
    title: "RAG 파이프라인",
    desc: "투자설명서 벡터 검색 + 코사인 유사도 0.82+",
    color: "bg-indigo-50 text-indigo-600 border-indigo-200",
  },
  {
    icon: <Shield className="w-5 h-5" />,
    title: "금융 가드레일",
    desc: "금칙어 필터링, 할루시네이션 체크, 컴플라이언스",
    color: "bg-emerald-50 text-emerald-600 border-emerald-200",
  },
  {
    icon: <Zap className="w-5 h-5" />,
    title: "실시간 차트",
    desc: "수익률 추이·비교 차트 자동 생성 및 렌더링",
    color: "bg-amber-50 text-amber-600 border-amber-200",
  },
  {
    icon: <Newspaper className="w-5 h-5" />,
    title: "뉴스 연동",
    desc: "금융 뉴스 실시간 검색 및 시장 동향 분석",
    color: "bg-rose-50 text-rose-600 border-rose-200",
  },
];

const STATS = [
  { label: "KODEX ETF", value: "230+", unit: "종목" },
  { label: "투자설명서", value: "4", unit: "건" },
  { label: "MCP 도구", value: "7", unit: "개" },
  { label: "평균 응답", value: "~10", unit: "초" },
];

interface Props {
  onSelect: (question: string) => void;
}

export default function SuggestedQuestions({ onSelect }: Props) {
  return (
    <div className="space-y-8 max-w-3xl mx-auto pb-4">
      {/* 히어로 */}
      <div className="text-center space-y-3 pt-2">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1428a0] to-[#4b6cb7] rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
          <MessageSquare className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-800">
            KODEX AI 어시스턴트
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            삼성자산운용 ETF 특화 AI 에이전트 · MCP + RAG + 멀티에이전트
          </p>
        </div>
      </div>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-4 gap-3">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="text-center py-3 px-2 bg-white rounded-xl border border-gray-100 shadow-sm"
          >
            <div className="text-xl font-bold text-[#1428a0]">
              {s.value}
              <span className="text-xs font-normal text-gray-400 ml-0.5">{s.unit}</span>
            </div>
            <div className="text-[11px] text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 질문 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {SUGGESTIONS.map((group) => (
          <div key={group.category} className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-1 flex items-center gap-1.5">
              <span
                className={`${
                  group.color === "blue"
                    ? "text-blue-500"
                    : group.color === "green"
                      ? "text-green-500"
                      : "text-purple-500"
                }`}
              >
                {group.icon}
              </span>
              {group.category}
            </h3>
            <div className="space-y-1.5">
              {group.questions.map((q) => (
                <button
                  key={q}
                  onClick={() => onSelect(q)}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm transition-all duration-200 shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 기능 카드 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-400 mb-3 px-1">핵심 기능</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className={`px-3 py-3 rounded-xl border ${f.color} transition-all hover:shadow-sm`}
            >
              <div className="flex items-center gap-2 mb-1">
                {f.icon}
                <span className="text-sm font-semibold">{f.title}</span>
              </div>
              <p className="text-[11px] opacity-70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
