"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Loader2, RotateCcw, LayoutDashboard, Settings, ImagePlus, X, ClipboardList, PieChart, Newspaper, UserCircle, Zap, Brain, Eye, EyeOff, Crown } from "lucide-react";
import ChatMessage from "@/components/ChatMessage";
import SuggestedQuestions from "@/components/SuggestedQuestions";

interface ChartDataItem {
  type: "performance" | "compare" | "returns" | "radar";
  data: Record<string, unknown>;
}

interface SuggestedAction {
  label: string;
  query: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  agent?: { type: string; name: string };
  steps?: string[];
  toolCallCount?: number;
  charts?: ChartDataItem[];
  /** 비교 시연용 다음 단계 버튼 (API 또는 프리캐시) */
  suggestedActions?: SuggestedAction[];
  imageUrl?: string;
}

const LOADING_STEPS = [
  { text: "🤖 에이전트 라우팅 중...", delay: 0 },
  { text: "🧠 의도 분류 완료 → 전문 에이전트 선택", delay: 400 },
  { text: "🔍 MCP Server 연결 중...", delay: 800 },
  { text: "📡 도구 호출 요청 전송...", delay: 1200 },
  { text: "⚙️ MCP 도구 실행 중...", delay: 1800 },
  { text: "🗃️ ETF 데이터베이스 조회 중...", delay: 2500 },
  { text: "📄 RAG 벡터 검색 수행 중...", delay: 3500 },
  { text: "📊 응답 데이터 구성 중...", delay: 5000 },
  { text: "🛡️ 컴플라이언스 검증 중...", delay: 7000 },
  { text: "✍️ 최종 응답 생성 중...", delay: 9000 },
  { text: "📝 마크다운 포맷팅 중...", delay: 12000 },
  { text: "✅ 거의 완료되었습니다...", delay: 16000 },
];

const IMAGE_LOADING_STEPS = [
  { text: "🖼️ 이미지 수신 완료...", delay: 0 },
  { text: "🔍 Claude Vision 모델 연결 중...", delay: 500 },
  { text: "📊 차트 패턴/트렌드 분석 중...", delay: 1200 },
  { text: "🎯 관련 KODEX ETF 매칭 중...", delay: 2500 },
  { text: "🛡️ 컴플라이언스 검증 중...", delay: 4000 },
  { text: "✍️ 분석 결과 생성 중...", delay: 5500 },
];


export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [pendingImage, setPendingImage] = useState<{ base64: string; mimeType: string; preview: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<"opus" | "sonnet" | "haiku">("haiku");
  const [showProcessSteps, setShowProcessSteps] = useState(true);
  const [typingMessageId, setTypingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const autoScrollRef = useRef(true);
  const programmaticScrollRef = useRef(false);

  useEffect(() => {
    if (!autoScrollRef.current) return;
    programmaticScrollRef.current = true;
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    setTimeout(() => { programmaticScrollRef.current = false; }, 50);
  }, [messages, loadingSteps]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    let lastScrollTop = el.scrollTop;
    const onScroll = () => {
      if (programmaticScrollRef.current) {
        lastScrollTop = el.scrollTop;
        return;
      }
      if (el.scrollTop < lastScrollTop) {
        autoScrollRef.current = false;
      }
      lastScrollTop = el.scrollTop;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

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

  // 이미지 업로드 핸들러
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("이미지 크기는 10MB 이하만 가능합니다.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      setPendingImage({
        base64,
        mimeType: file.type,
        preview: dataUrl,
      });
    };
    reader.readAsDataURL(file);
    // reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  // 이미지 분석 전송
  const sendImageAnalysis = async () => {
    if (!pendingImage || loading) return;

    const imageData = pendingImage;
    setPendingImage(null);

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: "차트 이미지를 분석해주세요",
      imageUrl: imageData.preview,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setLoadingSteps([]);

    // 이미지 분석용 로딩 스텝
    const newTimers = IMAGE_LOADING_STEPS.map((step) =>
      setTimeout(() => {
        setLoadingSteps((prev) => [...prev, step.text]);
      }, step.delay)
    );
    timersRef.current = newTimers;

    try {
      const res = await fetch("/api/analyze-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: imageData.base64,
          mimeType: imageData.mimeType,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();

      const msgId = (Date.now() + 1).toString();
      const assistantMsg: Message = {
        id: msgId,
        role: "assistant",
        content: data.response,
        agent: data.agent,
        steps: data.steps,
        toolCallCount: data.toolCallCount,
        charts: data.charts,
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setTypingMessageId(msgId);
    } catch (error) {
      console.error("Image analysis error:", error);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "이미지 분석 중 오류가 발생했습니다. 다시 시도해 주세요.",
          steps: ["❌ 이미지 분석 실패"],
        },
      ]);
    } finally {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setLoading(false);
      setLoadingSteps([]);
    }
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    // 이미지가 대기 중이면 이미지 분석으로 전환
    if (pendingImage) {
      sendImageAnalysis();
      return;
    }

    setInput("");
    // textarea 높이 초기화
    if (inputRef.current) inputRef.current.style.height = "auto";

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
    };
    setMessages((prev) => [...prev, userMsg]);
    autoScrollRef.current = true;
    setLoading(true);
    setLoadingSteps([]);

    // 로딩 스텝 타이머
    const newTimers = LOADING_STEPS.map((step) =>
      setTimeout(() => {
        setLoadingSteps((prev) => [...prev, step.text]);
      }, step.delay)
    );
    timersRef.current = newTimers;

    // API 스트리밍 호출
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
          model: selectedModel,
        }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);

      const msgId = (Date.now() + 1).toString();
      let streamedContent = "";
      let metaReceived = false;
      let msgMeta: Partial<Message> = {};

      // 스트리밍 메시지를 먼저 추가 (빈 내용)
      const placeholderMsg: Message = {
        id: msgId,
        role: "assistant",
        content: "",
      };
      setMessages((prev) => [...prev, placeholderMsg]);

      // 로딩 종료 (타이핑 표시로 전환)
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setLoading(false);
      setLoadingSteps([]);

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const stripped = line.replace(/^data: /, "").trim();
          if (!stripped) continue;
          try {
            const evt = JSON.parse(stripped);
            if (evt.type === "meta") {
              metaReceived = true;
              msgMeta = {
                agent: evt.agent,
                steps: evt.steps,
                toolCallCount: evt.toolCallCount,
                charts: evt.charts,
                suggestedActions: evt.suggestedActions,
              };
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, ...msgMeta } : m
                )
              );
            } else if (evt.type === "token") {
              streamedContent += evt.token;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, content: streamedContent } : m
                )
              );
            } else if (evt.type === "replace") {
              streamedContent = evt.content;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === msgId ? { ...m, content: streamedContent } : m
                )
              );
            } else if (evt.type === "done") {
              // 완료
            }
          } catch {
            // 파싱 실패 무시
          }
        }
      }

      // 스트리밍 완료 — 최종 상태 반영
      if (!metaReceived) {
        // 비스트리밍 폴백 (슬롯 필링 등 즉시 응답)
        try {
          const fallback = JSON.parse(streamedContent || buffer);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === msgId
                ? {
                    ...m,
                    content: fallback.response || streamedContent,
                    agent: fallback.agent,
                    steps: fallback.steps,
                    toolCallCount: fallback.toolCallCount,
                    charts: fallback.charts,
                    suggestedActions: fallback.suggestedActions,
                  }
                : m
            )
          );
        } catch {
          // JSON이 아닌 경우 streamedContent 그대로 유지
        }
      }
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
    setPendingImage(null);
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
            href="/quiz"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="투자 성향 진단"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">투자 진단</span>
          </a>
          <a
            href="/portfolio"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="포트폴리오 시뮬레이터"
          >
            <PieChart className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">포트폴리오</span>
          </a>
          <a
            href="/briefing"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="시장 브리핑"
          >
            <Newspaper className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">시장 브리핑</span>
          </a>
          <a
            href="/mypage"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="나의 투자 성향"
          >
            <UserCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">마이</span>
          </a>
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
      <main ref={mainRef} className="flex-1 overflow-y-auto px-4 py-6">
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
                suggestedActions={msg.suggestedActions}
                imageUrl={msg.imageUrl}
                onAskQuestion={(q) => sendMessage(q)}
                showProcessSteps={showProcessSteps}
                isTyping={false}
                onTypingComplete={() => {}}
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
                    {showProcessSteps && loadingSteps.length > 0 && (
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

      {/* 이미지 프리뷰 */}
      {pendingImage && (
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex-shrink-0">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <div className="relative">
              <img
                src={pendingImage.preview}
                alt="업로드 이미지"
                className="w-16 h-16 object-cover rounded-lg border border-gray-300"
              />
              <button
                onClick={() => setPendingImage(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">차트 이미지가 선택되었습니다</p>
              <p className="text-xs text-gray-400">전송 버튼을 클릭하면 AI가 분석합니다</p>
            </div>
            <button
              onClick={sendImageAnalysis}
              disabled={loading}
              className="px-4 py-2 bg-[#1428a0] text-white text-sm rounded-lg hover:bg-[#0f1f7a] disabled:opacity-40 transition-colors"
            >
              분석하기
            </button>
          </div>
        </div>
      )}

      {/* 입력 영역 */}
      <footer className="bg-white border-t border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-end gap-2">
            {/* 이미지 업로드 버튼 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-11 h-11 rounded-xl border border-gray-300 text-gray-500 flex items-center justify-center hover:bg-gray-50 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
              title="차트 이미지 업로드"
            >
              <ImagePlus className="w-5 h-5" />
            </button>
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
          {/* 모델 선택 + 토글 + 면책조항 */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* 모델 선택 */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={() => setSelectedModel("opus")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${selectedModel === "opus"
                    ? "bg-white text-purple-700 shadow-sm border border-purple-200"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Crown className="w-3 h-3" />
                  Opus
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModel("sonnet")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${selectedModel === "sonnet"
                    ? "bg-white text-blue-700 shadow-sm border border-blue-200"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Brain className="w-3 h-3" />
                  Sonnet
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedModel("haiku")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${selectedModel === "haiku"
                    ? "bg-white text-amber-700 shadow-sm border border-amber-200"
                    : "text-gray-500 hover:text-gray-700"
                    }`}
                >
                  <Zap className="w-3 h-3" />
                  Haiku
                </button>
              </div>
              {/* AI 처리과정 토글 */}
              <button
                type="button"
                onClick={() => setShowProcessSteps((prev) => !prev)}
                className={`relative z-10 flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all border ${showProcessSteps
                    ? "bg-white text-green-700 border-green-200 shadow-sm"
                    : "bg-gray-100 text-gray-400 border-transparent hover:text-gray-600"
                  }`}
                title={showProcessSteps ? "AI 처리과정 숨기기" : "AI 처리과정 보기"}
              >
                {showProcessSteps ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                <span className="hidden sm:inline">처리과정</span>
              </button>
            </div>
            <p className="text-[10px] text-gray-400 hidden sm:block">
              본 서비스는 투자 참고용이며, 투자 판단의 책임은 투자자 본인에게
              있습니다. ⓒ 삼성자산운용
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
