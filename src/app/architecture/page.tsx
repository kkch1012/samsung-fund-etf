"use client";

import {
  ArrowLeft,
  Bot,
  Database,
  Search,
  FileText,
  Newspaper,
  Target,
  BarChart3,
  Shield,
  Cpu,
  Globe,
  Lock,
  Server,
  Zap,
  MessageSquare,
  Settings,
  TrendingUp,
  Cloud,
} from "lucide-react";
import Link from "next/link";

const MCP_TOOLS = [
  { name: "ETF 검색", icon: <Search className="w-3.5 h-3.5" />, time: "< 500ms", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { name: "ETF 상세", icon: <FileText className="w-3.5 h-3.5" />, time: "< 500ms", color: "bg-blue-50 text-blue-700 border-blue-200" },
  { name: "수익률 분석", icon: <BarChart3 className="w-3.5 h-3.5" />, time: "< 800ms", color: "bg-green-50 text-green-700 border-green-200" },
  { name: "비교 분석", icon: <TrendingUp className="w-3.5 h-3.5" />, time: "< 1.5s", color: "bg-green-50 text-green-700 border-green-200" },
  { name: "문서 RAG", icon: <Database className="w-3.5 h-3.5" />, time: "< 2s", color: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  { name: "뉴스 검색", icon: <Newspaper className="w-3.5 h-3.5" />, time: "< 1s", color: "bg-orange-50 text-orange-700 border-orange-200" },
  { name: "ETF 추천", icon: <Target className="w-3.5 h-3.5" />, time: "< 2s", color: "bg-purple-50 text-purple-700 border-purple-200" },
];

const RAG_STEPS = [
  { label: "문서 수집", sub: "PDF/HTML" },
  { label: "시맨틱 청킹", sub: "500~1000토큰" },
  { label: "벡터 임베딩", sub: "3072차원" },
  { label: "pgvector 저장", sub: "HNSW 인덱스" },
  { label: "유사도 검색", sub: "코사인 > 0.82" },
  { label: "Re-ranking", sub: "RRF 융합" },
  { label: "컨텍스트 주입", sub: "프롬프트 통합" },
];

const SPECS = [
  { label: "LLM 엔진", value: "Claude (Anthropic)", icon: <Bot className="w-4 h-4" /> },
  { label: "벡터 DB", value: "pgvector 3072차원", icon: <Database className="w-4 h-4" /> },
  { label: "클라우드", value: "AWS ECS Fargate", icon: <Cloud className="w-4 h-4" /> },
  { label: "보안", value: "WAF + VPC + KMS", icon: <Lock className="w-4 h-4" /> },
  { label: "평균 응답", value: "~10초", icon: <Zap className="w-4 h-4" /> },
  { label: "ETF 종목", value: "230+ 종목", icon: <TrendingUp className="w-4 h-4" /> },
];

function Arrow() {
  return (
    <div className="flex justify-center py-1">
      <div className="w-px h-6 bg-gradient-to-b from-gray-300 to-gray-200 relative">
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-r-[4px] border-t-[5px] border-transparent border-t-gray-300" />
      </div>
    </div>
  );
}

export default function ArchitecturePage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-800">시스템 아키텍처</h1>
            <p className="text-xs text-gray-400">KODEX ETF AI 에이전트 · MCP + RAG + 멀티에이전트</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <MessageSquare className="w-3.5 h-3.5" /> 챗봇
          </Link>
          <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <Settings className="w-3.5 h-3.5" /> 관리자
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* 메인 아키텍처 다이어그램 */}
          <div className="lg:col-span-3 space-y-0">
            {/* Row 1: 사용자 입력 */}
            <div className="flex justify-center flow-animate" style={{ animationDelay: "0ms" }}>
              <div className="px-6 py-3 bg-white border-2 border-blue-300 rounded-xl shadow-sm card-hover glow-on-hover">
                <div className="flex items-center gap-2 text-blue-700">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-sm">사용자 질문</span>
                </div>
                <p className="text-[11px] text-blue-400 mt-1">&quot;KODEX 200 수익률 분석해줘&quot;</p>
              </div>
            </div>

            <Arrow />

            {/* Row 2: 에이전트 라우터 */}
            <div className="flex justify-center flow-animate" style={{ animationDelay: "100ms" }}>
              <div className="px-6 py-3 bg-violet-50 border-2 border-violet-300 rounded-xl shadow-sm card-hover glow-on-hover">
                <div className="flex items-center gap-2 text-violet-700">
                  <Cpu className="w-4 h-4" />
                  <span className="font-semibold text-sm">에이전트 라우터</span>
                </div>
                <div className="flex gap-1.5 mt-2">
                  {["Intent 분류", "Slot Filling", "자율 추론"].map((b) => (
                    <span key={b} className="text-[10px] px-2 py-0.5 bg-violet-100 text-violet-600 rounded-full border border-violet-200">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <Arrow />

            {/* Row 3: 멀티 에이전트 */}
            <div className="grid grid-cols-3 gap-3 flow-animate" style={{ animationDelay: "200ms" }}>
              <div className="p-4 bg-white border-2 border-blue-200 rounded-xl shadow-sm card-hover text-center">
                <div className="w-10 h-10 mx-auto bg-blue-100 rounded-xl flex items-center justify-center mb-2">
                  <Bot className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-sm font-bold text-blue-700">상담 에이전트</div>
                <p className="text-[11px] text-gray-400 mt-1">ETF 정보 안내<br />용어 설명, 투자 가이드</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {["ETF검색", "상세조회", "문서RAG"].map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-500 rounded">{t}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-white border-2 border-green-200 rounded-xl shadow-sm card-hover text-center">
                <div className="w-10 h-10 mx-auto bg-green-100 rounded-xl flex items-center justify-center mb-2">
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-sm font-bold text-green-700">분석 에이전트</div>
                <p className="text-[11px] text-gray-400 mt-1">수익률 분석, 상품 비교<br />차트 생성, 시장 동향</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {["수익률", "비교분석", "뉴스", "차트"].map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-500 rounded">{t}</span>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-white border-2 border-purple-200 rounded-xl shadow-sm card-hover text-center">
                <div className="w-10 h-10 mx-auto bg-purple-100 rounded-xl flex items-center justify-center mb-2">
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-sm font-bold text-purple-700">추천 에이전트</div>
                <p className="text-[11px] text-gray-400 mt-1">맞춤 ETF 추천<br />포트폴리오 구성 제안</p>
                <div className="mt-2 flex flex-wrap justify-center gap-1">
                  {["ETF추천", "상세조회", "문서RAG"].map((t) => (
                    <span key={t} className="text-[9px] px-1.5 py-0.5 bg-purple-50 text-purple-500 rounded">{t}</span>
                  ))}
                </div>
              </div>
            </div>

            <Arrow />

            {/* Row 4: MCP Server Layer */}
            <div className="bg-white border-2 border-emerald-200 rounded-xl p-5 shadow-sm flow-animate" style={{ animationDelay: "300ms" }}>
              <div className="flex items-center gap-2 mb-3">
                <Server className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-sm text-emerald-700">MCP Server Layer</span>
                <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full">Model Context Protocol</span>
              </div>
              <div className="grid grid-cols-7 gap-2">
                {MCP_TOOLS.map((tool) => (
                  <div key={tool.name} className={`p-2.5 rounded-lg border text-center card-hover ${tool.color}`}>
                    <div className="flex justify-center mb-1">{tool.icon}</div>
                    <div className="text-[11px] font-semibold">{tool.name}</div>
                    <div className="text-[9px] opacity-60 mt-0.5">{tool.time}</div>
                  </div>
                ))}
              </div>
            </div>

            <Arrow />

            {/* Row 5: 데이터 소스 */}
            <div className="grid grid-cols-4 gap-3 flow-animate" style={{ animationDelay: "400ms" }}>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-center card-hover">
                <Database className="w-5 h-5 mx-auto text-blue-500 mb-1.5" />
                <div className="text-xs font-semibold text-gray-700">ETF DB</div>
                <div className="text-[10px] text-gray-400">RDS Aurora<br />+ pgvector</div>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-center card-hover">
                <Search className="w-5 h-5 mx-auto text-indigo-500 mb-1.5" />
                <div className="text-xs font-semibold text-gray-700">벡터 DB</div>
                <div className="text-[10px] text-gray-400">문서 임베딩<br />HNSW 인덱스</div>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-center card-hover">
                <TrendingUp className="w-5 h-5 mx-auto text-green-500 mb-1.5" />
                <div className="text-xs font-semibold text-gray-700">시세 API</div>
                <div className="text-[10px] text-gray-400">실시간 동기화<br />5분 간격</div>
              </div>
              <div className="p-3 bg-white border border-gray-200 rounded-xl text-center card-hover">
                <Globe className="w-5 h-5 mx-auto text-orange-500 mb-1.5" />
                <div className="text-xs font-semibold text-gray-700">뉴스 API</div>
                <div className="text-[10px] text-gray-400">금융 뉴스<br />실시간 인덱싱</div>
              </div>
            </div>

            <Arrow />

            {/* Row 6: RAG Pipeline */}
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-5 shadow-sm flow-animate" style={{ animationDelay: "500ms" }}>
              <div className="flex items-center gap-2 mb-4">
                <Search className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-sm text-indigo-700">RAG Pipeline</span>
                <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">Retrieval-Augmented Generation</span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto">
                {RAG_STEPS.map((step, i) => (
                  <div key={step.label} className="flex items-center">
                    <div className="px-3 py-2 bg-white border border-indigo-200 rounded-lg text-center min-w-[90px] card-hover">
                      <div className="text-[11px] font-semibold text-indigo-700">{step.label}</div>
                      <div className="text-[9px] text-indigo-400 mt-0.5">{step.sub}</div>
                    </div>
                    {i < RAG_STEPS.length - 1 && (
                      <div className="text-indigo-300 mx-1 text-xs flex-shrink-0">→</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Arrow />

            {/* Row 7: LLM + 가드레일 */}
            <div className="grid grid-cols-2 gap-3 flow-animate" style={{ animationDelay: "600ms" }}>
              <div className="p-4 bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-xl shadow-sm card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-orange-600" />
                  <span className="font-bold text-sm text-orange-700">Claude LLM</span>
                </div>
                <p className="text-[11px] text-orange-500">답변 생성 · 테이블/차트 구조화 · 근거 표시</p>
                <div className="flex gap-1.5 mt-2">
                  <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Haiku (경량)</span>
                  <span className="text-[9px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full">Sonnet (메인)</span>
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-red-50 to-rose-50 border-2 border-red-200 rounded-xl shadow-sm card-hover">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="w-4 h-4 text-red-600" />
                  <span className="font-bold text-sm text-red-700">가드레일</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    "금칙어 필터링 (욕설/혐오/부적절 권유)",
                    "할루시네이션 체크 (수치 교차 검증)",
                    "컴플라이언스 (면책 조항 자동 삽입)",
                  ].map((g) => (
                    <div key={g} className="flex items-start gap-1.5 text-[11px] text-red-600">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{g}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Arrow />

            {/* Row 8: 최종 응답 */}
            <div className="flex justify-center flow-animate" style={{ animationDelay: "700ms" }}>
              <div className="px-6 py-3 bg-gradient-to-r from-[#1428a0] to-[#4b6cb7] rounded-xl shadow-lg">
                <div className="flex items-center gap-2 text-white">
                  <MessageSquare className="w-4 h-4" />
                  <span className="font-semibold text-sm">최종 응답</span>
                </div>
                <p className="text-[11px] text-blue-200 mt-1">마크다운 테이블 + 차트 시각화 + 출처 표시 + 면책 조항</p>
              </div>
            </div>
          </div>

          {/* 사이드바: 스펙 카드 */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm sticky top-20">
              <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5" />
                시스템 사양
              </h3>
              <div className="space-y-3">
                {SPECS.map((spec) => (
                  <div key={spec.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-[#1428a0] flex-shrink-0">
                      {spec.icon}
                    </div>
                    <div>
                      <div className="text-[11px] text-gray-400">{spec.label}</div>
                      <div className="text-xs font-semibold text-gray-700">{spec.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <hr className="my-4 border-gray-100" />

              {/* 보안 아키텍처 */}
              <h3 className="text-xs font-semibold text-gray-400 mb-3 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                보안 아키텍처
              </h3>
              <div className="space-y-2 text-[11px]">
                {[
                  "WAF (DDoS 방어, SQL Injection 차단)",
                  "TLS 1.3 암호화 통신",
                  "VPC Private Subnet 격리",
                  "KMS 데이터 암호화 (AES-256)",
                  "PII 자동 마스킹 (비가역)",
                  "CloudTrail 감사 로그",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-1.5 text-gray-600">
                    <Shield className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>

              <hr className="my-4 border-gray-100" />

              {/* 네비게이션 */}
              <div className="space-y-2">
                <Link href="/" className="flex items-center gap-2 px-3 py-2 bg-[#1428a0] text-white rounded-lg text-xs font-medium hover:bg-[#0f1f7a] transition-colors">
                  <MessageSquare className="w-3.5 h-3.5" />
                  챗봇 데모 바로가기
                </Link>
                <Link href="/admin" className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                  관리자 대시보드
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
