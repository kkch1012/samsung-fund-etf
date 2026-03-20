"use client";

import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar, Clock, AlertTriangle } from "lucide-react";

// 시뮬레이션 데이터 (데모용)
const MARKET_DATA = {
  date: new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "long" }),
  indices: [
    { name: "KOSPI", value: "2,847.32", change: "+1.23%", up: true },
    { name: "KOSDAQ", value: "892.15", change: "+0.87%", up: true },
    { name: "S&P 500", value: "5,892.44", change: "+0.54%", up: true },
    { name: "NASDAQ", value: "18,234.67", change: "+0.92%", up: true },
    { name: "USD/KRW", value: "1,342.50", change: "-0.31%", up: false },
    { name: "VIX", value: "14.82", change: "-2.15%", up: false },
  ],
  sentiment: {
    score: 72,
    label: "탐욕",
    color: "text-green-600",
    bgColor: "bg-green-50",
    description: "시장 심리가 긍정적입니다. 기술주 강세와 실적 시즌 기대감이 반영되고 있습니다.",
  },
};

const SECTOR_ANALYSIS = [
  {
    sector: "반도체",
    trend: "up" as const,
    color: "text-red-500",
    summary: "AI 반도체 수요 지속 강세. 삼성전자/SK하이닉스 HBM 수주 확대 기대",
    kodex: [
      { name: "KODEX 반도체MV", return1M: 5.2 },
      { name: "KODEX 한국반도체MV", return1M: 4.8 },
    ],
  },
  {
    sector: "미국 기술주",
    trend: "up" as const,
    color: "text-red-500",
    summary: "빅테크 실적 호조 지속. 나스닥 사상 최고치 경신 기대감",
    kodex: [
      { name: "KODEX 미국나스닥100TR", return1M: 3.8 },
      { name: "KODEX 미국S&P500TR", return1M: 2.1 },
    ],
  },
  {
    sector: "2차전지",
    trend: "down" as const,
    color: "text-blue-500",
    summary: "전기차 판매 둔화 우려. 리튬 가격 하락으로 밸류체인 전반 약세",
    kodex: [
      { name: "KODEX 2차전지산업", return1M: -3.2 },
    ],
  },
  {
    sector: "채권/금리",
    trend: "neutral" as const,
    color: "text-gray-500",
    summary: "한은 금리 동결 기조 유지. 연내 인하 기대 약화, 단기채 매력 유지",
    kodex: [
      { name: "KODEX CD금리액티브(합성)", return1M: 0.21 },
      { name: "KODEX 종합채권(AA-이상)액티브", return1M: 0.35 },
    ],
  },
  {
    sector: "배당/가치",
    trend: "up" as const,
    color: "text-red-500",
    summary: "고배당 기업 주주환원 확대. 밸류업 프로그램 수혜 지속",
    kodex: [
      { name: "KODEX 배당가치", return1M: 1.9 },
    ],
  },
];

const AI_INSIGHTS = [
  {
    title: "주목할 KODEX ETF",
    items: [
      "KODEX 반도체MV — HBM4 양산 기대감으로 반도체 섹터 단기 모멘텀 강세",
      "KODEX 미국S&P500TR — 달러 약세 + 미국 실적시즌 호조로 해외 투자 매력 상승",
      "KODEX 배당가치 — 밸류업 프로그램 2차 발표 앞두고 고배당주 재평가 진행 중",
    ],
  },
  {
    title: "리스크 요인",
    items: [
      "미중 관계 불확실성 — 반도체 수출 규제 강화 가능성 모니터링 필요",
      "유럽 경기 둔화 — ECB 금리 정책 불확실성이 글로벌 채권 시장에 영향",
      "원유 가격 변동성 — 중동 지정학적 리스크로 에너지 섹터 변동성 확대",
    ],
  },
];

function TrendIcon({ trend }: { trend: "up" | "down" | "neutral" }) {
  if (trend === "up") return <TrendingUp className="w-4 h-4 text-red-500" />;
  if (trend === "down") return <TrendingDown className="w-4 h-4 text-blue-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

export default function BriefingPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-8 h-8 bg-[#1428a0] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">K</span>
        </div>
        <h1 className="text-sm font-bold text-gray-800">AI 시장 브리핑</h1>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          매일 09:00 자동 업데이트
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 시뮬레이션 데이터 경고 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-xs text-amber-800">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          본 브리핑은 시연용 샘플 데이터입니다. 실제 투자 판단에는 공식 시장 데이터를 참고하세요.
        </div>
        {/* 날짜 + 시장 심리 */}
        <div className="flex flex-col sm:flex-row items-stretch gap-4">
          <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-bold text-gray-800">{MARKET_DATA.date}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {MARKET_DATA.indices.map((idx) => (
                <div key={idx.name} className="text-center py-2">
                  <div className="text-[11px] text-gray-500">{idx.name}</div>
                  <div className="text-sm font-bold text-gray-800">{idx.value}</div>
                  <div className={`text-xs font-medium ${idx.up ? "text-red-500" : "text-blue-500"}`}>
                    {idx.change}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={`w-full sm:w-48 rounded-xl border p-5 flex flex-col items-center justify-center ${MARKET_DATA.sentiment.bgColor} ${MARKET_DATA.sentiment.score >= 50 ? "border-green-200" : "border-red-200"}`}>
            <div className="text-[11px] text-gray-500 mb-1">시장 심리 지수</div>
            <div className={`text-3xl font-bold ${MARKET_DATA.sentiment.color}`}>
              {MARKET_DATA.sentiment.score}
            </div>
            <div className={`text-sm font-bold ${MARKET_DATA.sentiment.color} mt-1`}>
              {MARKET_DATA.sentiment.label}
            </div>
            {/* 반원 게이지 */}
            <div className="mt-3 relative w-24 h-12 overflow-hidden">
              <div className="absolute inset-0 rounded-t-full border-4 border-b-0 border-gray-200" />
              <div
                className="absolute inset-0 rounded-t-full border-4 border-b-0 border-green-500"
                style={{
                  clipPath: `polygon(0 100%, 0 0, ${MARKET_DATA.sentiment.score}% 0, ${MARKET_DATA.sentiment.score}% 100%)`,
                }}
              />
              <div
                className="absolute bottom-0 left-1/2 w-1 h-10 bg-gray-800 rounded-full origin-bottom"
                style={{
                  transform: `translateX(-50%) rotate(${(MARKET_DATA.sentiment.score / 100) * 180 - 90}deg)`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 섹터별 분석 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-4">섹터별 시장 분석</h3>
          <div className="space-y-4">
            {SECTOR_ANALYSIS.map((sector) => (
              <div key={sector.sector} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendIcon trend={sector.trend} />
                  <h4 className="text-sm font-bold text-gray-800">{sector.sector}</h4>
                  <span className={`text-xs font-medium ${sector.color}`}>
                    {sector.trend === "up" ? "강세" : sector.trend === "down" ? "약세" : "보합"}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{sector.summary}</p>
                <div className="flex flex-wrap gap-2">
                  {sector.kodex.map((etf) => (
                    <span
                      key={etf.name}
                      className="text-[11px] bg-gray-50 border border-gray-200 rounded-lg px-2 py-1"
                    >
                      {etf.name}
                      <span className={`ml-1 font-medium ${etf.return1M >= 0 ? "text-red-500" : "text-blue-500"}`}>
                        {etf.return1M >= 0 ? "+" : ""}{etf.return1M}%
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI 인사이트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AI_INSIGHTS.map((insight) => (
            <div key={insight.title} className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                {insight.title === "리스크 요인" ? (
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-[#1428a0]" />
                )}
                {insight.title}
              </h3>
              <ul className="space-y-2.5">
                {insight.items.map((item, i) => (
                  <li key={i} className="text-xs text-gray-600 leading-relaxed flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* AI 생성 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-xs text-blue-700">
            본 브리핑은 AI가 시장 데이터를 분석하여 자동 생성한 참고 자료입니다.
            투자 판단은 투자자 본인의 책임이며, 과거 수익률이 미래 수익을 보장하지 않습니다.
          </p>
        </div>
      </main>
    </div>
  );
}
