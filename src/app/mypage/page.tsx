"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, RotateCcw, ChevronRight, User, Sparkles, TrendingUp } from "lucide-react";

interface InvestorType {
  type: string;
  emoji: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  strategy: string;
  riskLevel: number;
  etfs: { name: string; ticker: string; reason: string; weight: number }[];
}

interface AIAnalysis {
  personalizedAnalysis: string;
  strengths: string[];
  cautions: string[];
  recommendedStrategy: string;
  portfolioRationale: string;
  marketInsight: string;
}

interface SavedResult {
  investorType: InvestorType;
  totalScore: number;
  answers: { question: string; answer: string; score: number }[];
  aiAnalysis: AIAnalysis | null;
  analyzedAt: string;
}

const STORAGE_KEY = "kodex-quiz-result";

export default function MyPage() {
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSavedResult(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">로딩 중...</div>
      </div>
    );
  }

  // 진단 결과 없는 경우
  if (!savedResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="w-8 h-8 bg-[#1428a0] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">K</span>
          </div>
          <h1 className="text-sm font-bold text-gray-800">마이페이지</h1>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-gray-100 flex items-center justify-center mb-6">
            <User className="w-10 h-10 text-gray-300" />
          </div>
          <h2 className="text-lg font-bold text-gray-800 mb-2">아직 투자 성향 진단을 하지 않았어요</h2>
          <p className="text-sm text-gray-500 mb-8">
            5개 질문에 답변하면 AI가 맞춤 투자 유형을 분석해드려요
          </p>
          <a
            href="/quiz"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1428a0] text-white font-medium rounded-xl hover:bg-[#0f1f7a] transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            투자 성향 진단하기
            <ChevronRight className="w-4 h-4" />
          </a>
        </main>
      </div>
    );
  }

  const type = savedResult.investorType;
  const analysis = savedResult.aiAnalysis;
  const analyzedDate = new Date(savedResult.analyzedAt);
  const dateStr = `${analyzedDate.getFullYear()}.${String(analyzedDate.getMonth() + 1).padStart(2, "0")}.${String(analyzedDate.getDate()).padStart(2, "0")}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="w-8 h-8 bg-[#1428a0] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">K</span>
        </div>
        <h1 className="text-sm font-bold text-gray-800">마이페이지</h1>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* 프로필 헤더 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1428a0] flex items-center justify-center">
              <span className="text-3xl">{type.emoji}</span>
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-400 mb-0.5">{dateStr} 진단</p>
              <h2 className={`text-xl font-bold ${type.color}`}>{type.type}</h2>
              <p className="text-xs text-gray-500 mt-0.5">위험 등급 {type.riskLevel}/6 | 총점 {savedResult.totalScore}/25</p>
            </div>
            <a
              href="/quiz"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#1428a0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              다시 분석
            </a>
          </div>

          {/* 위험 등급 바 */}
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-gray-500 w-16">안정</span>
            <div className="flex-1 flex gap-1">
              {Array.from({ length: 6 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-3 rounded-sm transition-all ${
                    i < type.riskLevel
                      ? i < 2
                        ? "bg-blue-400"
                        : i < 4
                        ? "bg-green-400"
                        : "bg-red-400"
                      : "bg-gray-100"
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 w-16 text-right">공격</span>
          </div>
        </div>

        {/* 성향 설명 */}
        <div className={`rounded-2xl border-2 p-5 ${type.bgColor}`}>
          <p className="text-sm text-gray-700">{type.description}</p>
        </div>

        {/* AI 분석 */}
        {analysis && (
          <>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="w-4 h-4 text-[#1428a0]" />
                <h3 className="font-bold text-gray-800">AI 맞춤 분석</h3>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{analysis.personalizedAnalysis}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-green-700 mb-3">투자 강점</h4>
                <ul className="space-y-2">
                  {analysis.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-green-500 mt-0.5 flex-shrink-0">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h4 className="text-sm font-bold text-amber-700 mb-3">주의사항</h4>
                <ul className="space-y-2">
                  {analysis.cautions.map((c, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">!</span>
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="bg-[#1428a0]/5 rounded-xl border border-[#1428a0]/20 p-5">
              <h4 className="text-sm font-bold text-[#1428a0] mb-2">시장 인사이트</h4>
              <p className="text-sm text-gray-700">{analysis.marketInsight}</p>
            </div>
          </>
        )}

        {/* 맞춤 포트폴리오 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#1428a0]" />
            <h3 className="font-bold text-gray-800">맞춤 KODEX 포트폴리오</h3>
          </div>
          {analysis && (
            <p className="text-xs text-gray-500 mb-4">{analysis.portfolioRationale}</p>
          )}
          <div className="space-y-3">
            {type.etfs.map((etf) => (
              <div key={etf.ticker} className="flex items-center gap-3">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-[#1428a0] flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{etf.weight}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-gray-800 truncate">{etf.name}</span>
                    <span className="text-xs text-gray-400 flex-shrink-0">{etf.ticker}</span>
                  </div>
                  <p className="text-xs text-gray-500">{etf.reason}</p>
                </div>
                <div className="flex-shrink-0 w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#1428a0] rounded-full"
                    style={{ width: `${etf.weight}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 파이차트 */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-bold text-gray-800 mb-4">비중 배분</h3>
          <div className="flex items-center justify-center gap-8">
            <div
              className="w-40 h-40 rounded-full relative"
              style={{
                background: `conic-gradient(
                  #1428a0 0% ${type.etfs[0].weight}%,
                  #22c55e ${type.etfs[0].weight}% ${type.etfs[0].weight + type.etfs[1].weight}%,
                  #f59e0b ${type.etfs[0].weight + type.etfs[1].weight}% ${type.etfs[0].weight + type.etfs[1].weight + type.etfs[2].weight}%,
                  #8b5cf6 ${type.etfs[0].weight + type.etfs[1].weight + type.etfs[2].weight}% 100%
                )`,
              }}
            >
              <div className="absolute inset-4 bg-white rounded-full" />
            </div>
            <div className="space-y-2">
              {type.etfs.map((etf, i) => (
                <div key={etf.ticker} className="flex items-center gap-2 text-xs">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: ["#1428a0", "#22c55e", "#f59e0b", "#8b5cf6"][i] }}
                  />
                  <span className="text-gray-600">{etf.name.split(" ").slice(0, 2).join(" ")} ({etf.weight}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 면책조항 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          본 진단 결과는 투자 참고용이며, 실제 투자 판단은 투자자 본인의 책임입니다.
          과거 수익률이 미래 수익을 보장하지 않습니다.
        </div>

        {/* 하단 버튼 */}
        <div className="flex gap-3">
          <a
            href="/quiz"
            className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            다시 분석하기
          </a>
          <a
            href="/"
            className="flex-1 py-3 rounded-xl bg-[#1428a0] text-white font-medium hover:bg-[#0f1f7a] transition-colors flex items-center justify-center gap-2"
          >
            AI에게 더 물어보기
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </main>
    </div>
  );
}
