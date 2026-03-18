"use client";

import { useState, useMemo } from "react";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import dynamic from "next/dynamic";

const PortfolioCharts = dynamic(() => import("@/components/PortfolioCharts"), { ssr: false });

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

const PRESET_PORTFOLIOS: { name: string; description: string; etfs: ETFAllocation[] }[] = [
  {
    name: "안정형",
    description: "원금 보존 중심, 낮은 변동성",
    etfs: [
      { name: "KODEX CD금리액티브(합성)", ticker: "459580", weight: 40, return1Y: 2.69, return3Y: 0, fee: 0.02, mdd: 0, category: "금리" },
      { name: "KODEX 머니마켓액티브", ticker: "488770", weight: 30, return1Y: 2.98, return3Y: 0, fee: 0.05, mdd: 0, category: "채권" },
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", weight: 20, return1Y: 5.12, return3Y: 2.34, fee: 0.05, mdd: -3.2, category: "채권" },
      { name: "KODEX 200", ticker: "069500", weight: 10, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
    ],
  },
  {
    name: "균형형",
    description: "안정성과 수익의 균형",
    etfs: [
      { name: "KODEX 200", ticker: "069500", weight: 30, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
      { name: "KODEX 미국S&P500TR", ticker: "379800", weight: 25, return1Y: 24.8, return3Y: 15.2, fee: 0.05, mdd: -12.3, category: "해외주식" },
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", weight: 25, return1Y: 5.12, return3Y: 2.34, fee: 0.05, mdd: -3.2, category: "채권" },
      { name: "KODEX 배당가치", ticker: "290080", weight: 20, return1Y: 9.8, return3Y: 7.1, fee: 0.24, mdd: -15.2, category: "국내주식" },
    ],
  },
  {
    name: "성장형",
    description: "공격적 수익 추구",
    etfs: [
      { name: "KODEX 미국S&P500TR", ticker: "379800", weight: 30, return1Y: 24.8, return3Y: 15.2, fee: 0.05, mdd: -12.3, category: "해외주식" },
      { name: "KODEX 미국나스닥100TR", ticker: "379810", weight: 25, return1Y: 32.5, return3Y: 18.4, fee: 0.05, mdd: -15.8, category: "해외주식" },
      { name: "KODEX 200", ticker: "069500", weight: 25, return1Y: 12.45, return3Y: 8.67, fee: 0.15, mdd: -18.5, category: "국내주식" },
      { name: "KODEX 반도체MV", ticker: "390390", weight: 20, return1Y: 28.7, return3Y: 22.1, fee: 0.45, mdd: -25.3, category: "테마" },
    ],
  },
  {
    name: "공격형",
    description: "고수익 고위험, 테마 집중",
    etfs: [
      { name: "KODEX 미국나스닥100TR", ticker: "379810", weight: 30, return1Y: 32.5, return3Y: 18.4, fee: 0.05, mdd: -15.8, category: "해외주식" },
      { name: "KODEX 반도체MV", ticker: "390390", weight: 25, return1Y: 28.7, return3Y: 22.1, fee: 0.45, mdd: -25.3, category: "테마" },
      { name: "KODEX 2차전지산업", ticker: "305720", weight: 25, return1Y: -8.5, return3Y: -5.2, fee: 0.45, mdd: -45.1, category: "테마" },
      { name: "KODEX 레버리지", ticker: "122630", weight: 20, return1Y: 22.3, return3Y: 12.8, fee: 0.64, mdd: -38.7, category: "레버리지/인버스" },
    ],
  },
];

export default function PortfolioPage() {
  const [selectedPreset, setSelectedPreset] = useState(1); // 균형형 기본
  const [investAmount, setInvestAmount] = useState(1000);
  const [weights, setWeights] = useState<number[]>(PRESET_PORTFOLIOS[1].etfs.map((e) => e.weight));

  const portfolio = PRESET_PORTFOLIOS[selectedPreset];

  // 프리셋 변경
  const changePreset = (idx: number) => {
    setSelectedPreset(idx);
    setWeights(PRESET_PORTFOLIOS[idx].etfs.map((e) => e.weight));
  };

  // 비중 조절
  const updateWeight = (idx: number, newVal: number) => {
    const newWeights = [...weights];
    const diff = newVal - newWeights[idx];
    newWeights[idx] = newVal;

    // 다른 항목에서 비례 차감
    const others = newWeights.filter((_, i) => i !== idx);
    const othersSum = others.reduce((a, b) => a + b, 0);
    if (othersSum > 0) {
      for (let i = 0; i < newWeights.length; i++) {
        if (i !== idx) {
          newWeights[i] = Math.max(0, Math.round(newWeights[i] - (diff * newWeights[i]) / othersSum));
        }
      }
    }

    // 합 100 보정
    const total = newWeights.reduce((a, b) => a + b, 0);
    if (total !== 100 && newWeights.length > 0) {
      const maxIdx = newWeights.indexOf(Math.max(...newWeights));
      newWeights[maxIdx] += 100 - total;
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

      // 약간의 변동성 추가 (시드 기반)
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
        <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </a>
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
        <div className="grid grid-cols-4 gap-2">
          {PRESET_PORTFOLIOS.map((preset, i) => (
            <button
              key={preset.name}
              onClick={() => changePreset(i)}
              className={`py-3 px-4 rounded-xl border-2 text-center transition-all ${
                selectedPreset === i
                  ? "border-[#1428a0] bg-blue-50 text-[#1428a0]"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              <div className="text-sm font-bold">{preset.name}</div>
              <div className="text-[10px] opacity-70 mt-0.5">{preset.description}</div>
            </button>
          ))}
        </div>

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
                    <span className="text-xs font-bold" style={{ color: COLORS[i] }}>
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
                    return `${COLORS[i]} ${start}% ${start + w}%`;
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
                  <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: COLORS[i] }} />
                  <span className="text-gray-600 truncate">{etf.name.replace("KODEX ", "")} ({weights[i]}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 기대 수익 카드 */}
        <div className="grid grid-cols-3 gap-3">
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
                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: COLORS[i] }} />
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
