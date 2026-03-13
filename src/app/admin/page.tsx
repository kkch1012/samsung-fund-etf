"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  ArrowLeft,
  Bot,
  Clock,
  ThumbsUp,
  ThumbsDown,
  Settings,
  Search,
  Database,
  FileText,
} from "lucide-react";
import Link from "next/link";

// Dynamic recharts imports (SSR disabled)
const ResponsiveContainer = dynamic(
  () => import("recharts").then((m) => m.ResponsiveContainer),
  { ssr: false }
);
const AreaChart = dynamic(
  () => import("recharts").then((m) => m.AreaChart),
  { ssr: false }
);
const Area = dynamic(
  () => import("recharts").then((m) => m.Area),
  { ssr: false }
);
const BarChartR = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
);
const Bar = dynamic(
  () => import("recharts").then((m) => m.Bar),
  { ssr: false }
);
const LineChart = dynamic(
  () => import("recharts").then((m) => m.LineChart),
  { ssr: false }
);
const Line = dynamic(
  () => import("recharts").then((m) => m.Line),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("recharts").then((m) => m.PieChart),
  { ssr: false }
);
const Pie = dynamic(
  () => import("recharts").then((m) => m.Pie),
  { ssr: false }
);
const Cell = dynamic(
  () => import("recharts").then((m) => m.Cell),
  { ssr: false }
);
const XAxis = dynamic(
  () => import("recharts").then((m) => m.XAxis),
  { ssr: false }
);
const YAxis = dynamic(
  () => import("recharts").then((m) => m.YAxis),
  { ssr: false }
);
const CartesianGrid = dynamic(
  () => import("recharts").then((m) => m.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import("recharts").then((m) => m.Tooltip),
  { ssr: false }
);
const Legend = dynamic(
  () => import("recharts").then((m) => m.Legend),
  { ssr: false }
);

// --- Demo Data ---
const DAILY_DATA = [
  { date: "02/27", 대화수: 62, 사용자: 31 },
  { date: "02/28", 대화수: 78, 사용자: 42 },
  { date: "03/01", 대화수: 55, 사용자: 28 },
  { date: "03/02", 대화수: 45, 사용자: 22 },
  { date: "03/03", 대화수: 89, 사용자: 48 },
  { date: "03/04", 대화수: 102, 사용자: 55 },
  { date: "03/05", 대화수: 95, 사용자: 50 },
  { date: "03/06", 대화수: 110, 사용자: 58 },
  { date: "03/07", 대화수: 98, 사용자: 52 },
  { date: "03/08", 대화수: 67, 사용자: 35 },
  { date: "03/09", 대화수: 58, 사용자: 30 },
  { date: "03/10", 대화수: 115, 사용자: 62 },
  { date: "03/11", 대화수: 108, 사용자: 57 },
  { date: "03/12", 대화수: 83, 사용자: 44 },
];

const AGENT_PIE = [
  { name: "상담 에이전트", value: 45, color: "#1428a0" },
  { name: "분석 에이전트", value: 35, color: "#22c55e" },
  { name: "추천 에이전트", value: 20, color: "#8b5cf6" },
];

const HOURLY_DATA = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}시`,
  호출수:
    i < 6 ? Math.floor(Math.random() * 5) + 1 :
    i < 9 ? Math.floor(Math.random() * 20) + 10 :
    i === 10 ? 85 :
    i === 11 ? 72 :
    i < 13 ? Math.floor(Math.random() * 30) + 20 :
    i === 14 ? 92 :
    i === 15 ? 78 :
    i < 18 ? Math.floor(Math.random() * 40) + 30 :
    i < 21 ? Math.floor(Math.random() * 25) + 15 :
    Math.floor(Math.random() * 10) + 3,
}));

const STATS = {
  totalConversations: 1247,
  todayConversations: 83,
  avgResponseTime: 8.6,
  satisfactionRate: 91.5,
};

const topQueries = [
  { query: "KODEX 200 수익률", count: 156 },
  { query: "AI ETF 추천", count: 134 },
  { query: "S&P500 ETF 비교", count: 121 },
  { query: "배당 ETF 추천", count: 98 },
  { query: "금 ETF 투자", count: 87 },
  { query: "레버리지 ETF 위험", count: 76 },
  { query: "초보자 ETF 추천", count: 72 },
  { query: "채권 ETF 수익률", count: 65 },
];

const recentConversations = [
  { id: "c001", user: "user_3847", query: "KODEX 글로벌AI ETF 수익률이 얼마나 돼?", agent: "분석 에이전트", responseTime: 9.2, feedback: "positive" as const, timestamp: "2026-03-12 14:23" },
  { id: "c002", user: "user_2931", query: "장기 투자에 적합한 ETF 포트폴리오 추천해줘", agent: "추천 에이전트", responseTime: 12.5, feedback: "positive" as const, timestamp: "2026-03-12 14:18" },
  { id: "c003", user: "user_1205", query: "KODEX 200이랑 코스닥150 비교해줘", agent: "분석 에이전트", responseTime: 10.8, feedback: null, timestamp: "2026-03-12 14:12" },
  { id: "c004", user: "user_4521", query: "골드선물 ETF 환헤지가 뭐야?", agent: "상담 에이전트", responseTime: 6.3, feedback: "positive" as const, timestamp: "2026-03-12 14:05" },
  { id: "c005", user: "user_3102", query: "2차전지 ETF 전망이 어때?", agent: "분석 에이전트", responseTime: 11.4, feedback: "negative" as const, timestamp: "2026-03-12 13:58" },
];

const toolUsage = [
  { tool: "search_etf_products", calls: 423, label: "ETF 상품 검색" },
  { tool: "get_etf_detail", calls: 389, label: "ETF 상세 조회" },
  { tool: "get_etf_performance", calls: 312, label: "수익률 조회" },
  { tool: "compare_etfs", calls: 245, label: "ETF 비교" },
  { tool: "search_documents", calls: 198, label: "문서 검색 (RAG)" },
  { tool: "search_news", calls: 167, label: "뉴스 검색" },
  { tool: "recommend_etf", calls: 156, label: "ETF 추천" },
];

const RAG_DOCS = [
  { name: "KODEX 200 투자설명서", searches: 156 },
  { name: "KODEX 미국S&P500 투자설명서", searches: 134 },
  { name: "KODEX CD금리액티브 투자설명서", searches: 98 },
  { name: "KODEX 2차전지산업 투자설명서", searches: 72 },
];

const RAG_DAILY = [
  { date: "03/03", 검색수: 22 },
  { date: "03/04", 검색수: 35 },
  { date: "03/05", 검색수: 28 },
  { date: "03/06", 검색수: 42 },
  { date: "03/07", 검색수: 38 },
  { date: "03/08", 검색수: 18 },
  { date: "03/09", 검색수: 15 },
  { date: "03/10", 검색수: 45 },
  { date: "03/11", 검색수: 40 },
  { date: "03/12", 검색수: 32 },
];

type TabKey = "overview" | "conversations" | "tools" | "rag";

export default function AdminPage() {
  const [tab, setTab] = useState<TabKey>("overview");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">관리자 대시보드</h1>
            <p className="text-xs text-gray-400">KODEX AI 어시스턴트 운영 현황</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">챗봇</Link>
          <Link href="/architecture" className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">아키텍처</Link>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {([
              ["overview", "개요"],
              ["conversations", "대화 이력"],
              ["tools", "도구 사용"],
              ["rag", "RAG"],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  tab === key
                    ? "bg-white text-gray-800 shadow-sm font-medium"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        {/* ===== 개요 탭 ===== */}
        {tab === "overview" && (
          <div className="space-y-6">
            {/* 통계 카드 */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "총 대화 수", value: STATS.totalConversations.toLocaleString(), sub: `오늘 +${STATS.todayConversations}`, icon: <MessageSquare className="w-5 h-5" />, color: "blue" },
                { label: "평균 응답 시간", value: `${STATS.avgResponseTime}초`, sub: "목표: 10초 이내", icon: <Clock className="w-5 h-5" />, color: "green" },
                { label: "만족도", value: `${STATS.satisfactionRate}%`, sub: "긍정 피드백 기준", icon: <ThumbsUp className="w-5 h-5" />, color: "purple" },
                { label: "활성 사용자", value: "342", sub: "최근 7일", icon: <Users className="w-5 h-5" />, color: "orange" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-500">{stat.label}</span>
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      stat.color === "blue" ? "bg-blue-50 text-blue-600" :
                      stat.color === "green" ? "bg-green-50 text-green-600" :
                      stat.color === "purple" ? "bg-purple-50 text-purple-600" :
                      "bg-orange-50 text-orange-600"
                    }`}>
                      {stat.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-xs text-gray-400 mt-1">{stat.sub}</div>
                </div>
              ))}
            </div>

            {/* 일별 대화량 추이 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                일별 대화량 추이 (최근 14일)
              </h3>
              <div style={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <AreaChart data={DAILY_DATA}>
                    <defs>
                      <linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1428a0" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#1428a0" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorUser" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="대화수" stroke="#1428a0" strokeWidth={2} fill="url(#colorConv)" />
                    <Area type="monotone" dataKey="사용자" stroke="#22c55e" strokeWidth={2} fill="url(#colorUser)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 에이전트 파이 차트 + 인기 질문 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  에이전트 사용 비율
                </h3>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie
                        data={AGENT_PIE}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name} ${value}%`}
                      >
                        {AGENT_PIE.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  인기 질문 TOP 8
                </h3>
                <div className="space-y-2">
                  {topQueries.map((q, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 truncate flex-1 flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          i < 3 ? "bg-[#1428a0] text-white" : "bg-gray-100 text-gray-500"
                        }`}>{i + 1}</span>
                        {q.query}
                      </span>
                      <span className="text-gray-400 text-xs ml-2">{q.count}회</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== 대화 이력 탭 ===== */}
        {tab === "conversations" && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">최근 대화 이력</h3>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-5 py-3 font-medium">시간</th>
                  <th className="text-left px-5 py-3 font-medium">사용자</th>
                  <th className="text-left px-5 py-3 font-medium">질문</th>
                  <th className="text-left px-5 py-3 font-medium">에이전트</th>
                  <th className="text-left px-5 py-3 font-medium">응답시간</th>
                  <th className="text-left px-5 py-3 font-medium">피드백</th>
                </tr>
              </thead>
              <tbody>
                {recentConversations.map((c) => (
                  <tr key={c.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-400 text-xs">{c.timestamp}</td>
                    <td className="px-5 py-3 font-mono text-xs text-gray-500">{c.user}</td>
                    <td className="px-5 py-3 text-gray-700 max-w-xs truncate">{c.query}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        c.agent.includes("분석") ? "bg-green-50 text-green-700" :
                        c.agent.includes("추천") ? "bg-purple-50 text-purple-700" :
                        "bg-blue-50 text-blue-700"
                      }`}>{c.agent}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{c.responseTime}초</td>
                    <td className="px-5 py-3">
                      {c.feedback === "positive" ? <ThumbsUp className="w-4 h-4 text-green-500" /> :
                       c.feedback === "negative" ? <ThumbsDown className="w-4 h-4 text-red-500" /> :
                       <span className="text-gray-300 text-xs">-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== 도구 사용 탭 ===== */}
        {tab === "tools" && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                MCP Server 도구 호출 현황
              </h3>
              <div style={{ width: "100%", height: 280 }}>
                <ResponsiveContainer>
                  <BarChartR data={toolUsage} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis dataKey="label" type="category" tick={{ fontSize: 11, fill: "#6b7280" }} width={100} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Bar dataKey="calls" fill="#1428a0" radius={[0, 4, 4, 0]} barSize={20} />
                  </BarChartR>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                시간대별 도구 호출 (24시간)
              </h3>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <AreaChart data={HOURLY_DATA}>
                    <defs>
                      <linearGradient id="colorHourly" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1428a0" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#1428a0" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#9ca3af" }} interval={2} />
                    <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="호출수" stroke="#1428a0" strokeWidth={2} fill="url(#colorHourly)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* ===== RAG 탭 ===== */}
        {tab === "rag" && (
          <div className="space-y-6">
            {/* RAG 통계 카드 */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: "인덱싱 문서", value: "4", unit: "건", color: "indigo" },
                { label: "평균 유사도", value: "0.82", unit: "cosine", color: "teal" },
                { label: "평균 검색시간", value: "850", unit: "ms", color: "purple" },
                { label: "총 청크 수", value: "1,247", unit: "개", color: "blue" },
              ].map((s) => (
                <div key={s.label} className={`text-center p-5 rounded-xl border ${
                  s.color === "indigo" ? "bg-indigo-50 border-indigo-200" :
                  s.color === "teal" ? "bg-teal-50 border-teal-200" :
                  s.color === "purple" ? "bg-purple-50 border-purple-200" :
                  "bg-blue-50 border-blue-200"
                }`}>
                  <div className={`text-2xl font-bold ${
                    s.color === "indigo" ? "text-indigo-700" :
                    s.color === "teal" ? "text-teal-700" :
                    s.color === "purple" ? "text-purple-700" :
                    "text-blue-700"
                  }`}>{s.value}</div>
                  <div className={`text-xs mt-1 ${
                    s.color === "indigo" ? "text-indigo-500" :
                    s.color === "teal" ? "text-teal-500" :
                    s.color === "purple" ? "text-purple-500" :
                    "text-blue-500"
                  }`}>{s.label} ({s.unit})</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* 문서별 검색 빈도 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  문서별 검색 빈도
                </h3>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <BarChartR data={RAG_DOCS} layout="vertical" margin={{ left: 140 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis type="number" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: "#6b7280" }} width={140} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Bar dataKey="searches" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={16} />
                    </BarChartR>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 일별 RAG 검색 횟수 */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  일별 RAG 검색 추이
                </h3>
                <div style={{ width: "100%", height: 220 }}>
                  <ResponsiveContainer>
                    <LineChart data={RAG_DAILY}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                      <Line type="monotone" dataKey="검색수" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: "#8b5cf6", r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* RAG 파이프라인 설정 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Database className="w-4 h-4" />
                RAG 파이프라인 설정
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "임베딩 모델", value: "text-embedding-3-large", detail: "3072차원, OpenAI" },
                  { label: "청킹 전략", value: "Semantic Chunking", detail: "500~1000 토큰, 100 오버랩" },
                  { label: "검색 전략", value: "Hybrid Search", detail: "벡터 유사도 + BM25 + RRF" },
                  { label: "인덱스 타입", value: "HNSW", detail: "ef_construction=200" },
                  { label: "유사도 임계값", value: "0.82", detail: "코사인 유사도 기준" },
                  { label: "최대 컨텍스트", value: "3개 문서", detail: "상위 3개 청크 주입" },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-gray-50 rounded-lg">
                    <div className="text-[11px] text-gray-400">{item.label}</div>
                    <div className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{item.detail}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
