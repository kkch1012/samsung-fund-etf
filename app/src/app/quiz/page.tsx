"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, ChevronRight, Loader2, User, Sparkles } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: { label: string; score: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: 1,
    question: "투자 경험은 어느 정도이신가요?",
    options: [
      { label: "투자 경험이 전혀 없어요", score: 1 },
      { label: "예적금 외 투자 경험이 1년 미만이에요", score: 2 },
      { label: "1~3년 정도 투자하고 있어요", score: 3 },
      { label: "3년 이상 다양한 상품에 투자했어요", score: 4 },
      { label: "10년 이상 전문적으로 투자해요", score: 5 },
    ],
  },
  {
    id: 2,
    question: "투자 기간은 어느 정도로 생각하시나요?",
    options: [
      { label: "6개월 이내 단기 투자", score: 1 },
      { label: "6개월 ~ 1년", score: 2 },
      { label: "1년 ~ 3년", score: 3 },
      { label: "3년 ~ 5년", score: 4 },
      { label: "5년 이상 장기 투자", score: 5 },
    ],
  },
  {
    id: 3,
    question: "투자 원금의 손실을 어디까지 감수할 수 있나요?",
    options: [
      { label: "원금 손실은 절대 안 돼요", score: 1 },
      { label: "5% 이내 손실까지 괜찮아요", score: 2 },
      { label: "10~20% 손실도 감수할 수 있어요", score: 3 },
      { label: "30~40% 손실도 기회라고 생각해요", score: 4 },
      { label: "50% 이상 손실도 감수할 수 있어요", score: 5 },
    ],
  },
  {
    id: 4,
    question: "가장 관심 있는 투자 목적은 무엇인가요?",
    options: [
      { label: "안정적인 이자/배당 수익", score: 1 },
      { label: "물가 상승률 이상의 수익", score: 2 },
      { label: "시장 평균 수준의 수익", score: 3 },
      { label: "시장 평균 이상의 높은 수익", score: 4 },
      { label: "최대한 공격적인 고수익", score: 5 },
    ],
  },
  {
    id: 5,
    question: "관심 있는 투자 분야는 어디인가요?",
    options: [
      { label: "채권/예금 등 안전 자산", score: 1 },
      { label: "국내 대형주 (코스피200)", score: 2 },
      { label: "미국 주식 (S&P500, 나스닥)", score: 3 },
      { label: "테마/섹터 (반도체, AI, 2차전지)", score: 4 },
      { label: "레버리지/신흥국 등 고위험", score: 5 },
    ],
  },
];

interface InvestorType {
  type: string;
  emoji: string;
  color: string;
  bgColor: string;
  textColor: string;
  description: string;
  strategy: string;
  riskLevel: number; // 1~6
  etfs: { name: string; ticker: string; reason: string; weight: number }[];
}

const INVESTOR_TYPES: Record<string, InvestorType> = {
  "안정 수호형": {
    type: "안정 수호형",
    emoji: "🛡️",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    textColor: "text-blue-600",
    description: "원금 보존이 최우선! 안정적인 이자 수익을 추구하는 보수적 투자자입니다.",
    strategy: "채권/금리 ETF 중심의 안정적 포트폴리오를 추천합니다.",
    riskLevel: 1,
    etfs: [
      { name: "KODEX CD금리액티브(합성)", ticker: "459580", reason: "초단기 채권, 예금 수준 안정성", weight: 40 },
      { name: "KODEX 머니마켓액티브", ticker: "488770", reason: "MMF 대안, 높은 유동성", weight: 30 },
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", reason: "우량 채권 분산", weight: 20 },
      { name: "KODEX 200", ticker: "069500", reason: "소량 주식 노출로 성장 가능성", weight: 10 },
    ],
  },
  "안정 추구형": {
    type: "안정 추구형",
    emoji: "🏦",
    color: "text-teal-700",
    bgColor: "bg-teal-50 border-teal-200",
    textColor: "text-teal-600",
    description: "안정성을 중시하되 예금 이상의 수익을 원하는 신중한 투자자입니다.",
    strategy: "채권 위주에 소량의 배당주를 혼합한 포트폴리오를 추천합니다.",
    riskLevel: 2,
    etfs: [
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", reason: "우량 채권 중심 안정성", weight: 35 },
      { name: "KODEX CD금리액티브(합성)", ticker: "459580", reason: "단기 금리 수익", weight: 25 },
      { name: "KODEX 배당가치", ticker: "290080", reason: "배당 수익 + 가치주", weight: 25 },
      { name: "KODEX 200", ticker: "069500", reason: "국내 대표지수 소량 편입", weight: 15 },
    ],
  },
  "균형 추구형": {
    type: "균형 추구형",
    emoji: "⚖️",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
    textColor: "text-green-600",
    description: "안정성과 수익성의 균형을 중시하는 현명한 투자자입니다.",
    strategy: "채권과 주식을 균형있게 배분한 중립적 포트폴리오를 추천합니다.",
    riskLevel: 3,
    etfs: [
      { name: "KODEX 200", ticker: "069500", reason: "국내 대표 지수 추종", weight: 30 },
      { name: "KODEX 미국S&P500TR", ticker: "379800", reason: "미국 시장 분산", weight: 25 },
      { name: "KODEX 종합채권(AA-이상)액티브", ticker: "273130", reason: "채권으로 안정성 확보", weight: 25 },
      { name: "KODEX 배당가치", ticker: "290080", reason: "배당 수익 + 가치주", weight: 20 },
    ],
  },
  "성장 추구형": {
    type: "성장 추구형",
    emoji: "📈",
    color: "text-indigo-700",
    bgColor: "bg-indigo-50 border-indigo-200",
    textColor: "text-indigo-600",
    description: "중장기 성장을 추구하며 적극적으로 기회를 찾는 투자자입니다.",
    strategy: "주식 비중을 높이고 해외 시장을 적극 활용합니다.",
    riskLevel: 4,
    etfs: [
      { name: "KODEX 미국S&P500TR", ticker: "379800", reason: "미국 시장 핵심 노출", weight: 30 },
      { name: "KODEX 미국나스닥100TR", ticker: "379810", reason: "기술주 성장 수혜", weight: 25 },
      { name: "KODEX 200", ticker: "069500", reason: "국내 시장 대표", weight: 25 },
      { name: "KODEX 반도체MV", ticker: "390390", reason: "반도체 섹터 집중", weight: 20 },
    ],
  },
  "적극 투자형": {
    type: "적극 투자형",
    emoji: "🚀",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
    textColor: "text-purple-600",
    description: "높은 수익을 위해 변동성을 감수하며 테마 투자를 즐기는 투자자입니다.",
    strategy: "성장주·테마 ETF 중심으로 적극적 포트폴리오를 구성합니다.",
    riskLevel: 5,
    etfs: [
      { name: "KODEX 미국나스닥100TR", ticker: "379810", reason: "기술주 고성장 추구", weight: 30 },
      { name: "KODEX 반도체MV", ticker: "390390", reason: "반도체 슈퍼사이클", weight: 25 },
      { name: "KODEX 2차전지산업", ticker: "305720", reason: "전기차/배터리 테마", weight: 25 },
      { name: "KODEX 미국S&P500TR", ticker: "379800", reason: "미국 시장 기반", weight: 20 },
    ],
  },
  "공격 투자형": {
    type: "공격 투자형",
    emoji: "🔥",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    textColor: "text-red-600",
    description: "최대 수익을 위해 높은 위험도 기꺼이 감수하는 공격적 투자자입니다.",
    strategy: "레버리지·고위험 테마 ETF 중심으로 공격적 포트폴리오를 구성합니다.",
    riskLevel: 6,
    etfs: [
      { name: "KODEX 미국나스닥100TR", ticker: "379810", reason: "기술주 고성장 추구", weight: 25 },
      { name: "KODEX 반도체MV", ticker: "390390", reason: "반도체 슈퍼사이클", weight: 25 },
      { name: "KODEX 레버리지", ticker: "122630", reason: "코스피200 2배 수익", weight: 25 },
      { name: "KODEX 2차전지산업", ticker: "305720", reason: "전기차/배터리 테마", weight: 25 },
    ],
  },
};

function getInvestorType(totalScore: number): InvestorType {
  if (totalScore <= 7) return INVESTOR_TYPES["안정 수호형"];
  if (totalScore <= 10) return INVESTOR_TYPES["안정 추구형"];
  if (totalScore <= 13) return INVESTOR_TYPES["균형 추구형"];
  if (totalScore <= 17) return INVESTOR_TYPES["성장 추구형"];
  if (totalScore <= 21) return INVESTOR_TYPES["적극 투자형"];
  return INVESTOR_TYPES["공격 투자형"];
}

interface AIPortfolioETF {
  name: string;
  ticker: string;
  weight: number;
  return1Y: number;
  return3Y: number;
  fee: number;
  mdd: number;
  category: string;
}

interface AIAnalysis {
  personalizedAnalysis: string;
  strengths: string[];
  cautions: string[];
  recommendedStrategy: string;
  portfolioRationale: string;
  marketInsight: string;
  portfolio?: AIPortfolioETF[];
}

interface SavedResult {
  investorType: InvestorType;
  totalScore: number;
  answers: { question: string; answer: string; score: number }[];
  aiAnalysis: AIAnalysis | null;
  aiPortfolio: AIPortfolioETF[] | null;
  analyzedAt: string;
}

const STORAGE_KEY = "kodex-quiz-result";

export default function QuizPage() {
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [answerLabels, setAnswerLabels] = useState<string[]>([]);
  const [result, setResult] = useState<InvestorType | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [savedResult, setSavedResult] = useState<SavedResult | null>(null);
  const [showSaved, setShowSaved] = useState(false);

  // 저장된 결과 로드
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as SavedResult;
        setSavedResult(parsed);
        setShowSaved(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAnswer = (score: number, label: string) => {
    const newAnswers = [...answers, score];
    const newLabels = [...answerLabels, label];
    setAnswers(newAnswers);
    setAnswerLabels(newLabels);

    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ(currentQ + 1);
    } else {
      // 결과 계산
      const total = newAnswers.reduce((a, b) => a + b, 0);
      setTotalScore(total);
      const investorType = getInvestorType(total);
      setResult(investorType);

      // AI 분석 호출
      fetchAIAnalysis(newAnswers, newLabels, total, investorType);
    }
  };

  const fetchAIAnalysis = async (
    scores: number[],
    labels: string[],
    total: number,
    investorType: InvestorType
  ) => {
    setAnalyzing(true);
    try {
      const quizAnswers = QUESTIONS.map((q, i) => ({
        question: q.question,
        answer: labels[i],
        score: scores[i],
      }));

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const res = await fetch("/api/quiz-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: quizAnswers,
          totalScore: total,
          investorType: investorType.type,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json();
      if (data.analysis) {
        const aiPortfolio = data.analysis.portfolio || null;
        setAiAnalysis(data.analysis);

        // localStorage에 저장
        const resultToSave: SavedResult = {
          investorType,
          totalScore: total,
          answers: quizAnswers,
          aiAnalysis: data.analysis,
          aiPortfolio,
          analyzedAt: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(resultToSave));
        setSavedResult(resultToSave);
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      // 타임아웃/에러 시에도 기본 결과 저장
      const resultToSave: SavedResult = {
        investorType,
        totalScore: total,
        answers: QUESTIONS.map((q, i) => ({
          question: q.question,
          answer: labels[i],
          score: scores[i],
        })),
        aiAnalysis: null,
        aiPortfolio: null,
        analyzedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(resultToSave));
    } finally {
      setAnalyzing(false);
    }
  };

  const reset = () => {
    setCurrentQ(0);
    setAnswers([]);
    setAnswerLabels([]);
    setResult(null);
    setTotalScore(0);
    setAiAnalysis(null);
    setShowSaved(false);
  };

  const goBack = () => {
    if (currentQ > 0) {
      setCurrentQ(currentQ - 1);
      setAnswers(answers.slice(0, -1));
      setAnswerLabels(answerLabels.slice(0, -1));
    }
  };

  // 저장된 결과 보기
  if (showSaved && savedResult && !result) {
    const saved = savedResult;
    const type = saved.investorType;
    const analysis = saved.aiAnalysis;
    // AI 동적 포트폴리오가 있으면 우선 사용
    const displayETFs = saved.aiPortfolio && saved.aiPortfolio.length >= 2
      ? saved.aiPortfolio.map((e) => ({ name: e.name, ticker: e.ticker, reason: e.category, weight: e.weight }))
      : type.etfs;
    const isAIPortfolio = !!(saved.aiPortfolio && saved.aiPortfolio.length >= 2);
    const analyzedDate = new Date(saved.analyzedAt);
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
          <h1 className="text-sm font-bold text-gray-800">나의 투자 성향</h1>
          <span className="text-xs text-gray-400 ml-auto">{dateStr} 진단</span>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* 마이페이지 헤더 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#1428a0] flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-1">나의 투자 유형</p>
              <h2 className={`text-xl font-bold ${type.color}`}>
                {type.emoji} {type.type}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">위험 등급 {type.riskLevel}/6</p>
            </div>
          </div>

          {/* 투자 유형 카드 */}
          <div className={`rounded-2xl border-2 p-6 ${type.bgColor}`}>
            <p className="text-sm text-gray-700">{type.description}</p>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-gray-500">위험 수용도</span>
              <div className="flex-1 h-2 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${(type.riskLevel / 6) * 100}%`,
                    background: type.riskLevel <= 2 ? "#3b82f6" : type.riskLevel <= 4 ? "#22c55e" : "#ef4444",
                  }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600">{type.riskLevel}/6</span>
            </div>
          </div>

          {/* 6가지 유형 비교 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-4">투자 유형 분류 (6단계)</h3>
            <div className="space-y-2">
              {Object.values(INVESTOR_TYPES).map((t) => (
                <div
                  key={t.type}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    t.type === type.type ? `${t.bgColor} border` : "hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className={`text-sm font-medium flex-1 ${t.type === type.type ? t.color : "text-gray-600"}`}>
                    {t.type}
                  </span>
                  <span className="text-xs text-gray-400">위험등급 {t.riskLevel}</span>
                  {t.type === type.type && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.bgColor} ${t.color}`}>
                      나의 유형
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* AI 분석 결과 */}
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
                  <h4 className="text-sm font-bold text-green-700 mb-3">강점</h4>
                  <ul className="space-y-2">
                    {analysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 mt-0.5">+</span>
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
                        <span className="text-amber-500 mt-0.5">!</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-bold text-gray-800 mb-2">추천 전략</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{analysis.recommendedStrategy}</p>
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
              <h3 className="font-bold text-gray-800">맞춤 KODEX 포트폴리오</h3>
              {isAIPortfolio && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">AI 추천</span>
              )}
            </div>
            {analysis && (
              <p className="text-xs text-gray-500 mb-4">{analysis.portfolioRationale}</p>
            )}
            <div className="space-y-3">
              {displayETFs.map((etf) => (
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
                      className="h-full bg-[#1428a0] rounded-full transition-all duration-500"
                      style={{ width: `${etf.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {isAIPortfolio && (
              <a
                href="/portfolio"
                className="mt-4 flex items-center justify-center gap-1.5 py-2 text-xs text-[#1428a0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                포트폴리오 시뮬레이터에서 비중 조절하기
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* 파이차트 시각화 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-4">비중 배분</h3>
            <div className="flex items-center justify-center gap-8">
              <div
                className="w-40 h-40 rounded-full relative"
                style={{
                  background: (() => {
                    const e = displayETFs;
                    const colors = ["#1428a0", "#22c55e", "#f59e0b", "#8b5cf6"];
                    let acc = 0;
                    return `conic-gradient(${e.map((etf, i) => {
                      const start = acc;
                      acc += etf.weight;
                      return `${colors[i % colors.length]} ${start}% ${acc}%`;
                    }).join(", ")})`;
                  })(),
                }}
              >
                <div className="absolute inset-4 bg-white rounded-full" />
              </div>
              <div className="space-y-2">
                {displayETFs.map((etf, i) => (
                  <div key={etf.ticker} className="flex items-center gap-2 text-xs">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: ["#1428a0", "#22c55e", "#f59e0b", "#8b5cf6"][i % 4] }}
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
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              다시 분석하기
            </button>
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

  // 결과 화면 (방금 진단 완료)
  if (result) {
    const aiPortfolioETFs = aiAnalysis?.portfolio;
    const resultDisplayETFs = aiPortfolioETFs && aiPortfolioETFs.length >= 2
      ? aiPortfolioETFs.map((e: AIPortfolioETF) => ({ name: e.name, ticker: e.ticker, reason: e.category, weight: e.weight }))
      : result.etfs;
    const resultIsAI = !!(aiPortfolioETFs && aiPortfolioETFs.length >= 2);

    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div className="w-8 h-8 bg-[#1428a0] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xs">K</span>
          </div>
          <h1 className="text-sm font-bold text-gray-800">투자 성향 진단 결과</h1>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
          {/* 결과 카드 */}
          <div className={`rounded-2xl border-2 p-8 text-center ${result.bgColor}`}>
            <div className="text-5xl mb-3">{result.emoji}</div>
            <h2 className={`text-2xl font-bold ${result.color}`}>
              {result.type}
            </h2>
            <p className="text-gray-600 mt-2 text-sm">{result.description}</p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <span className="text-xs text-gray-500">위험 등급</span>
              <div className="flex gap-1">
                {Array.from({ length: 6 }, (_, i) => (
                  <div
                    key={i}
                    className={`w-4 h-4 rounded-sm ${
                      i < result.riskLevel ? "bg-[#1428a0]" : "bg-gray-200"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs font-medium text-gray-600">{result.riskLevel}/6</span>
            </div>
          </div>

          {/* AI 분석 중 */}
          {analyzing && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-[#1428a0] animate-spin" />
                <div>
                  <h3 className="font-bold text-gray-800">AI가 맞춤 분석 중...</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Claude AI가 귀하의 응답 패턴을 심층 분석하고 있습니다</p>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="h-3 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-4/5" />
                <div className="h-3 bg-gray-100 rounded-full animate-pulse w-3/5" />
              </div>
            </div>
          )}

          {/* AI 분석 완료 */}
          {aiAnalysis && (
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-[#1428a0]" />
                  <h3 className="font-bold text-gray-800">AI 맞춤 분석</h3>
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">{aiAnalysis.personalizedAnalysis}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-bold text-green-700 mb-3">강점</h4>
                  <ul className="space-y-2">
                    {aiAnalysis.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-green-500 mt-0.5">+</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h4 className="text-sm font-bold text-amber-700 mb-3">주의사항</h4>
                  <ul className="space-y-2">
                    {aiAnalysis.cautions.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-amber-500 mt-0.5">!</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-[#1428a0]/5 rounded-xl border border-[#1428a0]/20 p-5">
                <h4 className="text-sm font-bold text-[#1428a0] mb-2">시장 인사이트</h4>
                <p className="text-sm text-gray-700">{aiAnalysis.marketInsight}</p>
              </div>
            </>
          )}

          {/* 6가지 유형 비교 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-4">투자 유형 분류 (6단계)</h3>
            <div className="space-y-2">
              {Object.values(INVESTOR_TYPES).map((t) => (
                <div
                  key={t.type}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    t.type === result.type ? `${t.bgColor} border` : "hover:bg-gray-50"
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className={`text-sm font-medium flex-1 ${t.type === result.type ? t.color : "text-gray-600"}`}>
                    {t.type}
                  </span>
                  <span className="text-xs text-gray-400">위험등급 {t.riskLevel}</span>
                  {t.type === result.type && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.bgColor} ${t.color}`}>
                      나의 유형
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 투자 전략 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-2">투자 전략</h3>
            <p className="text-sm text-gray-600">{result.strategy}</p>
            {aiAnalysis && (
              <p className="text-sm text-gray-600 mt-2">{aiAnalysis.recommendedStrategy}</p>
            )}
          </div>

          {/* 맞춤 포트폴리오 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-800">맞춤 KODEX 포트폴리오</h3>
              {resultIsAI && (
                <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full font-medium">AI 동적 추천</span>
              )}
            </div>
            {aiAnalysis && (
              <p className="text-xs text-gray-500 mb-4">{aiAnalysis.portfolioRationale}</p>
            )}
            <div className="space-y-3">
              {resultDisplayETFs.map((etf) => (
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
                      className="h-full bg-[#1428a0] rounded-full transition-all duration-500"
                      style={{ width: `${etf.weight}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {resultIsAI && (
              <a
                href="/portfolio"
                className="mt-4 flex items-center justify-center gap-1.5 py-2 text-xs text-[#1428a0] bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                포트폴리오 시뮬레이터에서 비중 조절하기
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* 파이차트 시각화 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-bold text-gray-800 mb-4">비중 배분</h3>
            <div className="flex items-center justify-center gap-8">
              <div
                className="w-40 h-40 rounded-full relative"
                style={{
                  background: (() => {
                    const e = resultDisplayETFs;
                    const colors = ["#1428a0", "#22c55e", "#f59e0b", "#8b5cf6"];
                    let acc = 0;
                    return `conic-gradient(${e.map((etf, i) => {
                      const start = acc;
                      acc += etf.weight;
                      return `${colors[i % colors.length]} ${start}% ${acc}%`;
                    }).join(", ")})`;
                  })(),
                }}
              >
                <div className="absolute inset-4 bg-white rounded-full" />
              </div>
              <div className="space-y-2">
                {resultDisplayETFs.map((etf, i) => (
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
            <button
              onClick={reset}
              className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              다시 분석하기
            </button>
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

  // 퀴즈 화면
  const q = QUESTIONS[currentQ];
  const progress = ((currentQ + 1) / QUESTIONS.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-3">
        <a href="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" />
        </a>
        <div className="w-8 h-8 bg-[#1428a0] rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-xs">K</span>
        </div>
        <h1 className="text-sm font-bold text-gray-800">투자 성향 진단</h1>
        <span className="text-xs text-gray-400 ml-auto">{currentQ + 1} / {QUESTIONS.length}</span>
      </header>

      {/* 프로그레스 바 */}
      <div className="bg-gray-200 h-1">
        <div
          className="bg-[#1428a0] h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="max-w-xl mx-auto px-4 py-12">
        <div className="space-y-8">
          <div>
            <span className="text-xs font-medium text-[#1428a0] bg-blue-50 px-2 py-1 rounded-full">
              Q{q.id}
            </span>
            <h2 className="text-xl font-bold text-gray-800 mt-3">{q.question}</h2>
          </div>

          <div className="space-y-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt.score, opt.label)}
                className="w-full text-left px-5 py-4 rounded-xl border-2 border-gray-200 bg-white hover:border-[#1428a0] hover:bg-blue-50 transition-all duration-200 text-[15px] text-gray-700 hover:text-gray-900 shadow-sm hover:shadow-md"
              >
                <span className="text-xs font-bold text-gray-400 mr-3">{String.fromCharCode(65 + i)}</span>
                {opt.label}
              </button>
            ))}
          </div>

          {currentQ > 0 && (
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              이전 질문
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
