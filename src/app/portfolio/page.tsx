"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Sparkles, Brain, Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const PortfolioCharts = dynamic(() => import("@/components/PortfolioCharts"), { ssr: false });

function formatSimpleMarkdown(text: string): string {
  let html = text;
  html = html.replace(
    /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g,
    (match) => {
      const rows = match.trim().split("\n");
      const headers = rows[0].split("|").filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join("");
      const body = rows.slice(2).map(row =>
        `<tr>${row.split("|").filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join("")}</tr>`
      ).join("");
      return `<table class="ai-table"><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
    }
  );
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-sm font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-base font-bold mt-3 mb-1">$1</h2>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>');
  html = html.replace(
    /⚠️(.+?)$/gm,
    '<div class="bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-xs text-amber-800 mt-2">⚠️$1</div>'
  );
  html = html.replace(/\n\n/g, "<br/><br/>");
  html = html.replace(/\n/g, "<br/>");
  return html;
}

interface ETFAllocation {
  name: string;
  ticker: string;
  weight: number;
  return1Y: number;
  return3Y: number;
  fee: number;
  mdd: number;
  category: string;
}

interface PresetPortfolio {
  name: string;
  description: string;
  isAI?: boolean;
  etfs: ETFAllocation[];
}

const PRESET_PORTFOLIOS: PresetPortfolio[] = [
  {
    name: "안정 수호형",
    description: "원금 보존 최우선",
    etfs: [
      { name: "KODEX CD금리액티브(합성)", ticker: "459580", weight: 40, return1Y: 2.69, return3Y: 0, fee: 0.02, mdd: 0, category: "금리" },
      { name: "KODEX 머니마켓액티브", ticker: "488770", weight: 30, return1Y: 2.98, return3Y: 0, fee: 0.05, mdd: 0, category: "채권" },
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", weight: 20, return1Y: 5.12, return3Y: 2.34, fee: 0.05, mdd: -3.2, category: "채권" },
      { name: "KODEX 200", ticker: "069500", weight: 10, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
    ],
  },
  {
    name: "안정 추구형",
    description: "예금 이상 안정 수익",
    etfs: [
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", weight: 35, return1Y: 5.12, return3Y: 2.34, fee: 0.05, mdd: -3.2, category: "채권" },
      { name: "KODEX CD금리액티브(합성)", ticker: "459580", weight: 25, return1Y: 2.69, return3Y: 0, fee: 0.02, mdd: 0, category: "금리" },
      { name: "KODEX 배당가치", ticker: "290080", weight: 25, return1Y: 9.8, return3Y: 7.1, fee: 0.24, mdd: -15.2, category: "국내주식" },
      { name: "KODEX 200", ticker: "069500", weight: 15, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
    ],
  },
  {
    name: "균형 추구형",
    description: "안정성과 수익 균형",
    etfs: [
      { name: "KODEX 200", ticker: "069500", weight: 30, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
      { name: "KODEX 미국S&P500TR", ticker: "379800", weight: 25, return1Y: 24.8, return3Y: 15.2, fee: 0.05, mdd: -12.3, category: "해외주식" },
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", weight: 25, return1Y: 5.12, return3Y: 2.34, fee: 0.05, mdd: -3.2, category: "채권" },
      { name: "KODEX 배당가치", ticker: "290080", weight: 20, return1Y: 9.8, return3Y: 7.1, fee: 0.24, mdd: -15.2, category: "국내주식" },
    ],
  },
  {
    name: "성장 추구형",
    description: "중장기 적극 성장",
    etfs: [
      { name: "KODEX 미국S&P500TR", ticker: "379800", weight: 30, return1Y: 24.8, return3Y: 15.2, fee: 0.05, mdd: -12.3, category: "해외주식" },
      { name: "KODEX 미국나스닥100TR", ticker: "379810", weight: 25, return1Y: 32.5, return3Y: 18.4, fee: 0.05, mdd: -15.8, category: "해외주식" },
      { name: "KODEX 200", ticker: "069500", weight: 25, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
      { name: "KODEX 반도체MV", ticker: "390390", weight: 20, return1Y: 28.7, return3Y: 22.1, fee: 0.45, mdd: -25.3, category: "테마" },
    ],
  },
  {
    name: "적극 투자형",
    description: "테마·성장주 집중",
    etfs: [
      { name: "KODEX 미국나스닥100TR", ticker: "379810", weight: 30, return1Y: 32.5, return3Y: 18.4, fee: 0.05, mdd: -15.8, category: "해외주식" },
      { name: "KODEX 반도체MV", ticker: "390390", weight: 25, return1Y: 28.7, return3Y: 22.1, fee: 0.45, mdd: -25.3, category: "테마" },
      { name: "KODEX 2차전지산업", ticker: "305720", weight: 25, return1Y: -8.5, return3Y: -5.2, fee: 0.45, mdd: -45.1, category: "테마" },
      { name: "KODEX 미국S&P500TR", ticker: "379800", weight: 20, return1Y: 24.8, return3Y: 15.2, fee: 0.05, mdd: -12.3, category: "해외주식" },
    ],
  },
  {
    name: "공격 투자형",
    description: "고수익 고위험 추구",
    etfs: [
      { name: "KODEX 미국나스닥100TR", ticker: "379810", weight: 25, return1Y: 32.5, return3Y: 18.4, fee: 0.05, mdd: -15.8, category: "해외주식" },
      { name: "KODEX 반도체MV", ticker: "390390", weight: 25, return1Y: 28.7, return3Y: 22.1, fee: 0.45, mdd: -25.3, category: "테마" },
      { name: "KODEX 레버리지", ticker: "122630", weight: 25, return1Y: 22.3, return3Y: 12.8, fee: 0.64, mdd: -38.7, category: "레버리지" },
      { name: "KODEX 2차전지산업", ticker: "305720", weight: 25, return1Y: -8.5, return3Y: -5.2, fee: 0.45, mdd: -45.1, category: "테마" },
    ],
  },
];

const STORAGE_KEY = "kodex-quiz-result";

export default function PortfolioPage() {
  const [allPresets, setAllPresets] = useState<PresetPortfolio[]>(PRESET_PORTFOLIOS);
  const [selectedPreset, setSelectedPreset] = useState(2);
  const [investAmount, setInvestAmount] = useState(1000);
  const [weights, setWeights] = useState<number[]>(PRESET_PORTFOLIOS[2].etfs.map((e) => e.weight));
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // localStorage에서 AI 포트폴리오 로드 (hydration mismatch 방지)
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.aiPortfolio && parsed.aiPortfolio.length >= 2) {
          const aiPreset: PresetPortfolio = {
            name: "나의 AI 맞춤",
            description: `${parsed.investorType?.type || "맞춤"} 기반`,
            isAI: true,
            etfs: parsed.aiPortfolio,
          };
          setAllPresets([aiPreset, ...PRESET_PORTFOLIOS]);
          setSelectedPreset(0);
          setWeights(parsed.aiPortfolio.map((e: ETFAllocation) => e.weight));
        }
      }
    } catch {
      // ignore
    }
  }, []);

  const portfolio = allPresets[selectedPreset];

  const runAiAnalysis = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiAnalysis(null);

    const holdings = portfolio.etfs
      .map((etf, i) => `${etf.name}(${etf.ticker}) ${weights[i]}%`)
      .join(", ");

    const prompt = `나는 투자금 ${investAmount}만원으로 다음 KODEX ETF 포트폴리오를 갖고 있어: ${holdings}. 이 포트폴리오를 진단해줘.`;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
          model: "haiku",
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      setAiAnalysis(data.response || "분석 결과를 가져올 수 없습니다.");
    } catch {
      setAiAnalysis("AI 분석 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setAiLoading(false);
    }
  }, [portfolio, weights, investAmount, aiLoading]);

  // 프리셋 변경
  const changePreset = (idx: number) => {
    setSelectedPreset(idx);
    setWeights(allPresets[idx].etfs.map((e) => e.weight));
  };

  // 비중 조절
  const updateWeight = (idx: number, newVal: number) => {
    const newWeights = [...weights];
    const diff = newVal - newWeights[idx];
    newWeights[idx] = newVal;

    // 다른 항목에서 비례 차감
    const othersSum = newWeights.reduce((a, _, i) => i !== idx ? a + newWeights[i] : a, 0);
    if (othersSum > 0) {
      for (let i = 0; i < newWeights.length; i++) {
        if (i !== idx) {
          newWeights[i] = Math.max(0, Math.round(newWeights[i] - (diff * newWeights[i]) / othersSum));
        }
      }
    } else {
      const remaining = 100 - newVal;
      const otherCount = newWeights.length - 1;
      for (let i = 0; i < newWeights.length; i++) {
        if (i !== idx) {
          newWeights[i] = Math.round(remaining / otherCount);
        }
      }
    }

    // 합 100 보정
    const total = newWeights.reduce((a, b) => a + b, 0);
    if (total !== 100 && newWeights.length > 0) {
      let corrIdx = idx;
      let maxVal = -1;
      for (let i = 0; i < newWeights.length; i++) {
        if (i !== idx && newWeights[i] > maxVal) {
          maxVal = newWeights[i];
          corrIdx = i;
        }
      }
      if (corrIdx !== idx) {
        newWeights[corrIdx] = Math.max(0, newWeights[corrIdx] + 100 - total);
      }
    }

    setWeights(newWeights);
  };

  // 포트폴리오 지표 계산
  const metrics = useMemo(() => {
    const etfs = portfolio.etfs;
    let expectedReturn = 0;
    let weightedFee = 0;
    let weightedMdd = 0;

    etfs.forEach((etf, i) => {
      const w = weights[i] / 100;
      expectedReturn += etf.return1Y * w;
      weightedFee += etf.fee * w;
      weightedMdd += etf.mdd * w;
    });

    const expectedAmount = investAmount * (1 + expectedReturn / 100);
    const profit = expectedAmount - investAmount;

    return {
      expectedReturn: expectedReturn.toFixed(2),
      weightedFee: weightedFee.toFixed(3),
      weightedMdd: weightedMdd.toFixed(1),
      expectedAmount: expectedAmount.toFixed(0),
      profit: profit.toFixed(0),
    };
  }, [portfolio, weights, investAmount]);

  // 백테스팅 데이터 생성 (시뮬레이션)
  const backtestData = useMemo(() => {
    const months = 12;
    const data: { month: string; value: number }[] = [];
    let value = investAmount;
    const monthlyReturn = Number(metrics.expectedReturn) / 12 / 100;

    for (let i = 0; i <= months; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - months + i);
      const label = `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}`;

      const noise = Math.sin(i * 2.5) * (investAmount * 0.015) + Math.cos(i * 1.7) * (investAmount * 0.01);
      data.push({ month: label, value: Math.round(value + noise) });
      value *= 1 + monthlyReturn;
    }
    return data;
  }, [investAmount, metrics.expectedReturn]);

  const COLORS = ["#1428a0", "#22c55e", "#f59e0b", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="w-8 h-8 bg-[#1428a0] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">K</span>
        </div>
        <h1 className="text-sm font-bold text-gray-800">포트폴리오 시뮬레이터</h1>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 투자 금액 입력 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">투자 금액</h3>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={100}
              max={10000}
              step={100}
              value={investAmount}
              onChange={(e) => setInvestAmount(Number(e.target.value))}
              className="flex-1 accent-[#1428a0]"
            />
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-3 py-2">
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(Math.max(100, Math.min(10000, Number(e.target.value))))}
                className="w-20 bg-transparent text-right text-lg font-bold text-gray-800 focus:outline-none"
              />
              <span className="text-sm text-gray-500">만원</span>
            </div>
          </div>
        </div>

        {/* 프리셋 선택 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {allPresets.map((preset, i) => (
            <button
              key={preset.name}
              onClick={() => changePreset(i)}
              className={`py-3 px-3 rounded-xl border-2 text-center transition-all ${selectedPreset === i
                ? preset.isAI
                  ? "border-purple-500 bg-purple-50 text-purple-700"
                  : "border-[#1428a0] bg-blue-50 text-[#1428a0]"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
            >
              <div className="text-sm font-bold flex items-center justify-center gap-1">
                {preset.isAI && <Sparkles className="w-3.5 h-3.5" />}
                {preset.name}
              </div>
              <div className="text-[10px] opacity-70 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>

        {/* AI 안내 */}
        {portfolio.isAI && (
          <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-2 text-xs text-purple-700">
            <Sparkles className="w-4 h-4 flex-shrink-0" />
            투자 성향 진단 결과를 기반으로 AI가 동적으로 추천한 포트폴리오입니다. 슬라이더로 비중을 자유롭게 조절해보세요.
          </div>
        )}

        {/* 비중 조절 + 파이차트 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 슬라이더 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">비중 조절</h3>
            <div className="space-y-4">
              {portfolio.etfs.map((etf, i) => (
                <div key={etf.ticker}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600 truncate max-w-[200px]">{etf.name}</span>
                    <span className="text-xs font-bold" style={{ color: COLORS[i % COLORS.length] }}>
                      {weights[i]}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={80}
                    step={5}
                    value={weights[i]}
                    onChange={(e) => updateWeight(i, Number(e.target.value))}
                    className="w-full accent-[#1428a0]"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* 파이차트 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-800 mb-4">비중 배분</h3>
            <div className="flex items-center justify-center">
              <div
                className="w-44 h-44 rounded-full relative"
                style={{
                  background: `conic-gradient(${weights.map((w, i) => {
                    const start = weights.slice(0, i).reduce((a, b) => a + b, 0);
                    return `${COLORS[i % COLORS.length]} ${start}% ${start + w}%`;
                  }).join(", ")})`,
                }}
              >
                <div className="absolute inset-5 bg-white rounded-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-lg font-bold text-gray-800">{investAmount.toLocaleString()}</div>
                    <div className="text-[10px] text-gray-400">만원</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {portfolio.etfs.map((etf, i) => (
                <div key={etf.ticker} className="flex items-center gap-1.5 text-xs">
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-gray-600 truncate">{etf.name.replace("KODEX ", "")} ({weights[i]}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 기대 수익 카드 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">기대 수익률 (1년)</div>
            <div className={`text-xl font-bold ${Number(metrics.expectedReturn) >= 0 ? "text-red-500" : "text-blue-500"}`}>
              {Number(metrics.expectedReturn) >= 0 ? "+" : ""}{metrics.expectedReturn}%
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {Number(metrics.expectedReturn) >= 0 ? (
                <TrendingUp className="w-3 h-3 text-red-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-blue-400" />
              )}
              <span className="text-xs text-gray-400">
                {Number(metrics.profit) >= 0 ? "+" : ""}{Number(metrics.profit).toLocaleString()}만원
              </span>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">가중평균 보수</div>
            <div className="text-xl font-bold text-gray-800">{metrics.weightedFee}%</div>
            <div className="text-xs text-gray-400 mt-1">연간 비용</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-xs text-gray-500 mb-1">최대 낙폭 (MDD)</div>
            <div className="text-xl font-bold text-blue-500">{metrics.weightedMdd}%</div>
            <div className="text-xs text-gray-400 mt-1">예상 최대 손실</div>
          </div>
        </div>

        {/* 백테스팅 차트 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-1">시뮬레이션 수익률 추이 (12개월)</h3>
          <p className="text-xs text-gray-400 mb-4">과거 데이터 기반 시뮬레이션이며, 실제 수익률과 다를 수 있습니다.</p>
          <PortfolioCharts data={backtestData} />
        </div>

        {/* AI 분석 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-[#1428a0]" />
              AI 포트폴리오 분석
            </h3>
            <button
              type="button"
              onClick={runAiAnalysis}
              disabled={aiLoading}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#1428a0] rounded-lg hover:bg-[#0f1f7a] disabled:opacity-50 transition-colors"
            >
              {aiLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  분석 중...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  AI로 분석하기
                </>
              )}
            </button>
          </div>
          {!aiAnalysis && !aiLoading && (
            <p className="text-xs text-gray-400">
              현재 포트폴리오 구성을 AI가 분석하여 분산 진단, 리스크 평가, 리밸런싱 제안을 제공합니다.
            </p>
          )}
          {aiLoading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-[#1428a0]" />
              <span className="text-sm text-gray-500">포트폴리오를 분석하고 있습니다...</span>
            </div>
          )}
          {aiAnalysis && !aiLoading && (
            <div
              className="prose prose-sm max-w-none text-[13px] leading-relaxed text-gray-700 ai-analysis-content"
              dangerouslySetInnerHTML={{ __html: formatSimpleMarkdown(aiAnalysis) }}
            />
          )}
        </div>

        {/* 구성 종목 상세 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3">구성 종목 상세</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-2 text-xs text-gray-500 font-medium">종목명</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">비중</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">투자금</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">1년 수익률</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">보수</th>
                  <th className="text-right py-2 px-2 text-xs text-gray-500 font-medium">MDD</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.etfs.map((etf, i) => (
                  <tr key={etf.ticker} className="border-b border-gray-100">
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-800 text-xs">{etf.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-2 font-medium text-xs">{weights[i]}%</td>
                    <td className="text-right py-2.5 px-2 text-xs text-gray-600">
                      {((investAmount * weights[i]) / 100).toLocaleString()}만원
                    </td>
                    <td className={`text-right py-2.5 px-2 text-xs font-medium ${etf.return1Y >= 0 ? "text-red-500" : "text-blue-500"}`}>
                      {etf.return1Y >= 0 ? "+" : ""}{etf.return1Y}%
                    </td>
                    <td className="text-right py-2.5 px-2 text-xs text-gray-600">{etf.fee}%</td>
                    <td className="text-right py-2.5 px-2 text-xs text-blue-500">{etf.mdd}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 면책조항 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          본 시뮬레이션은 과거 수익률 데이터를 기반으로 한 참고 자료이며, 미래 수익을 보장하지 않습니다.
          실제 투자 시에는 추가적인 분석과 전문가 상담을 권장합니다.
        </div>
      </main>
    </div>
  );
}
