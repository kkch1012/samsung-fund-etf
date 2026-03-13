"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RotateCcw, LayoutDashboard, Settings } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import SuggestedQuestions from "@/components/SuggestedQuestions";
import precachedData from "@/lib/precached-responses.json";

interface ChartDataItem {
  type: "performance" | "compare" | "returns";
  data: Record<string, unknown>;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: { type: string; name: string };
  steps?: string[];
  toolCallCount?: number;
  charts?: ChartDataItem[];
}

const LOADING_STEPS = [
  { text: "🤖 에이전트 라우팅 중...", delay: 0 },
  { text: "🧠 의도 분류 완료 → 전문 에이전트 선택", delay: 800 },
  { text: "🔍 MCP Server 연결 중...", delay: 1600 },
  { text: "📡 도구 호출 요청 전송...", delay: 2500 },
  { text: "⚙️ MCP 도구 실행 중...", delay: 3500 },
  { text: "🗃️ ETF 데이터베이스 조회 중...", delay: 4500 },
  { text: "📄 RAG 벡터 검색 수행 중...", delay: 6000 },
  { text: "📊 응답 데이터 구성 중...", delay: 8000 },
  { text: "✍️ 최종 응답 생성 중...", delay: 10000 },
];

// 프리캐시용 짧은 로딩 (3초)
const PRECACHE_LOADING_STEPS = [
  { text: "🤖 에이전트 라우팅 중...", delay: 0 },
  { text: "🧠 의도 분류 완료 → 전문 에이전트 선택", delay: 400 },
  { text: "🔍 MCP Server 연결 중...", delay: 800 },
  { text: "📡 도구 호출 요청 전송...", delay: 1200 },
  { text: "⚙️ MCP 도구 실행 중...", delay: 1600 },
  { text: "🗃️ ETF 데이터베이스 조회 중...", delay: 2000 },
  { text: "📄 RAG 벡터 검색 수행 중...", delay: 2300 },
  { text: "📊 응답 데이터 구성 중...", delay: 2600 },
  { text: "✍️ 최종 응답 생성 중...", delay: 2900 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const precached = precachedData as Record<string, any>;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loadingSteps]);

  // 자동 포커스
  useEffect(() => {
    if (!loading) inputRef.current?.focus();
  }, [loading, messages]);

  // textarea 자동 높이 조절
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 120) + "px";
  }, []);

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    setInput("");
    // textarea 높이 초기화
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setLoadingSteps([]);

    // 프리캐시 확인
    const cached = precached[messageText];
    const isPrecached = cached && cached.response && cached.response.length > 0;
    const steps = isPrecached ? PRECACHE_LOADING_STEPS : LOADING_STEPS;

    // 로딩 스텝 타이머
    const newTimers = steps.map((step) =>
      setTimeout(() => {
        setLoadingSteps((prev) => [...prev, step.text]);
      }, step.delay)
    );
    timersRef.current = newTimers;

    if (isPrecached) {
      // 프리캐시 응답: 3.5초 후 표시 (실제 동작하는 것처럼 보이게)
      await new Promise((resolve) => setTimeout(resolve, 3500));

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cached.response,
        agent: cached.agent,
        steps: cached.steps,
        toolCallCount: cached.toolCallCount,
        charts: cached.charts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setLoading(false);
      setLoadingSteps([]);
      return;
    }

    // 실제 API 호출
    try {
      const conversationHistory = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "user", content: messageText }],
          conversationHistory,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.response,
        agent: data.agent,
        steps: data.steps,
        toolCallCount: data.toolCallCount,
        charts: data.charts,
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content:
            "죄송합니다. 일시적인 오류가 발생했습니다. 다시 시도해 주세요.",
          steps: ["❌ API 호출 실패"],
        },
      ]);
    } finally {
      // 타이머 정리
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setLoading(false);
      setLoadingSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChat = () => {
    timersRef.current.forEach(clearTimeout);
    setMessages([]);
    setInput("");
    setLoading(false);
    setLoadingSteps([]);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={resetChat}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className="w-9 h-9 bg-[#1428a0] rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">K</span>
          </div>
          <div className="text-left">
            <h1 className="text-base font-bold text-gray-800">
              KODEX AI 어시스턴트
            </h1>
            <p className="text-[11px] text-gray-400">
              삼성자산운용 · ETF 특화 AI 에이전트
            </p>
          </div>
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={resetChat}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="대화 초기화"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">새 대화</span>
          </button>
          <a
            href="/architecture"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="시스템 아키텍처"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">아키텍처</span>
          </a>
          <a
            href="/admin"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="관리자 대시보드"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">관리자</span>
          </a>
        </div>
      </header>

      {/* 메시지 영역 */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <SuggestedQuestions onSelect={(q) => sendMessage(q)} />
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role}
                content={msg.content}
                agent={msg.agent}
                steps={msg.steps}
                toolCallCount={msg.toolCallCount}
                charts={msg.charts}
                onAskQuestion={(q) => sendMessage(q)}
              />
            ))}

            {/* 로딩 표시 */}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start gap-2 max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-[#1428a0] flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                  </div>
                  <div className="space-y-2">
                    {loadingSteps.length > 0 && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 space-y-1">
                        {loadingSteps.map((step, i) => (
                          <div
                            key={i}
                            className="text-xs text-gray-500 font-mono step-animate flex items-center gap-1.5"
                            style={{ animationDelay: `${i * 60}ms` }}
                          >
                            {step}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot" />
                        <div className="w-2 h-2 rounded-full bg-gray-400 typing-dot" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* 입력 영역 */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="ETF에 대해 무엇이든 물어보세요..."
                rows={1}
                className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-[15px] focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors"
                style={{ maxHeight: "120px" }}
                disabled={loading}
              />
            </div>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-xl bg-[#1428a0] text-white flex items-center justify-center hover:bg-[#0f1f7a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-2">
            본 서비스는 투자 참고용이며, 투자 판단의 책임은 투자자 본인에게
            있습니다. ⓒ 삼성자산운용
          </p>
        </div>
      </footer>
    </div>
  );
}
