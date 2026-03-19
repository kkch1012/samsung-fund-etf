"use client";

import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import {
  Bot,
  User,
  ChevronDown,
  ChevronUp,
  Cpu,
  Database,
  Search,
  FileText,
  Newspaper,
  Target,
  BarChart3,
  MessageSquare,
  MousePointerClick,
} from "lucide-react";

const ETFChart = dynamic(() => import("./ETFChart"), { ssr: false });

interface Step {
  text: string;
  icon: React.ReactNode;
}

function parseStep(raw: string): Step {
  if (raw.includes("MCP Server")) {
    if (raw.includes("ETF상품") || raw.includes("ETF상세"))
      return { text: raw, icon: <Database className="w-3.5 h-3.5 text-blue-500" /> };
    if (raw.includes("수익률") || raw.includes("비교분석"))
      return { text: raw, icon: <BarChart3 className="w-3.5 h-3.5 text-green-500" /> };
    if (raw.includes("뉴스"))
      return { text: raw, icon: <Newspaper className="w-3.5 h-3.5 text-orange-500" /> };
    if (raw.includes("추천"))
      return { text: raw, icon: <Target className="w-3.5 h-3.5 text-purple-500" /> };
    return { text: raw, icon: <Cpu className="w-3.5 h-3.5 text-blue-500" /> };
  }
  if (raw.includes("RAG") || raw.includes("벡터") || raw.includes("임베딩"))
    return { text: raw, icon: <Search className="w-3.5 h-3.5 text-indigo-500" /> };
  if (raw.includes("문서") || raw.includes("컨텍스트"))
    return { text: raw, icon: <FileText className="w-3.5 h-3.5 text-teal-500" /> };
  if (raw.includes("에이전트"))
    return { text: raw, icon: <Bot className="w-3.5 h-3.5 text-violet-500" /> };
  if (raw.includes("✅"))
    return { text: raw, icon: <div className="w-3.5 h-3.5 flex items-center justify-center text-green-500 text-xs">✓</div> };
  return { text: raw, icon: <Cpu className="w-3.5 h-3.5 text-gray-400" /> };
}

// 응답 끝부분에서 추천 질문 추출
function extractSuggestedQuestions(content: string): { mainContent: string; questions: string[] } {
  const lines = content.split("\n");
  const questions: string[] = [];
  let cutIndex = lines.length;

  // 끝에서부터 추천 질문 패턴 탐색
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    // "- 질문?" 또는 "1. 질문?" 패턴
    const bulletMatch = line.match(/^[-•]\s*(.+[?？])$/);
    const numberMatch = line.match(/^\d+[.)]\s*(.+[?？])$/);
    // "**질문?**" 패턴
    const boldMatch = line.match(/^\*\*(.+[?？])\*\*$/);

    if (bulletMatch) {
      questions.unshift(bulletMatch[1].replace(/\*\*/g, "").trim());
      cutIndex = i;
    } else if (numberMatch) {
      questions.unshift(numberMatch[1].replace(/\*\*/g, "").trim());
      cutIndex = i;
    } else if (boldMatch) {
      questions.unshift(boldMatch[1].trim());
      cutIndex = i;
    } else if (line === "" && questions.length > 0) {
      // 빈 줄은 건너뛰기
      cutIndex = i;
      continue;
    } else if (questions.length > 0) {
      // 추천 질문 헤더 라인 (예: "추가 질문:", "더 궁금한 점:") 제거
      if (line.includes("궁금") || line.includes("질문") || line.includes("추가") || line.includes("알고 싶") || line.includes("문의")) {
        cutIndex = i;
      }
      break;
    } else if (line === "") {
      continue;
    } else {
      break;
    }
  }

  if (questions.length === 0) {
    return { mainContent: content, questions: [] };
  }

  const mainContent = lines.slice(0, cutIndex).join("\n").trimEnd();
  return { mainContent, questions };
}

// === 역질문(슬롯 필링) 선택지 추출 ===
interface SlotOption {
  label: string;       // 버튼에 표시할 짧은 텍스트
  fullText: string;    // 클릭 시 전송할 전체 텍스트
  emoji?: string;      // 이모지
}

function extractSlotFillingOptions(content: string): SlotOption[] {
  const options: SlotOption[] = [];
  const lines = content.split("\n");

  // 역질문 패턴 감지: "여쭤볼게요", "알려주세요", "찾으시나요", "어떠신가요" 등이 포함되면 슬롯 필링
  const isSlotFilling = lines.some(line => {
    const l = line.toLowerCase();
    return (
      l.includes("여쭤볼게요") ||
      l.includes("여쭤볼께요") ||
      l.includes("알려주세요") ||
      l.includes("어떤") && l.includes("찾") ||
      l.includes("찾으시나요") ||
      l.includes("어떠신가요") ||
      l.includes("어떻게 되") ||
      l.includes("생각하시") ||
      l.includes("어떠세요") ||
      l.includes("어떤가요") ||
      l.includes("좀 더 정확한") ||
      l.includes("맞춤") && l.includes("위해") ||
      l.includes("위해 몇 가지")
    );
  });

  if (!isSlotFilling) return [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 패턴 1: "• **국내 반도체** ETF (삼성전자, SK하이닉스 등 한국 기업)" → "국내 반도체 ETF"
    // 패턴 2: "• 수익률 위주로 찾으시나요?" → "수익률 위주"
    // 패턴 3: "1️⃣ **투자 목적**이 무엇인가요? (안정적 배당 수익 / 자산 성장 / 분산 투자)"
    // 패턴 4: "- **국내 반도체 ETF** 를 찾으시나요, **해외 반도체 ETF** 를 찾으시나요?"

    // 괄호 안에 슬래시로 구분된 옵션 추출: (안정적 배당 수익 / 자산 성장 / 분산 투자)
    const parenSlashMatch = trimmed.match(/\(([^)]+\/[^)]+)\)/);
    if (parenSlashMatch) {
      const opts = parenSlashMatch[1].split("/").map(o => o.trim()).filter(o => o.length > 0);
      for (const opt of opts) {
        const clean = opt.replace(/\*\*/g, "").trim();
        if (clean.length > 0 && clean.length < 30) {
          options.push({
            label: clean,
            fullText: clean,
          });
        }
      }
      continue;
    }

    // 볼드 텍스트로 된 선택지 추출 (한 줄에 여러 볼드가 있는 경우)
    // "**국내 반도체** ETF를 찾으시나요, **해외 반도체** ETF를 찾으시나요?"
    const boldParts = trimmed.match(/\*\*([^*]+)\*\*/g);
    if (boldParts && boldParts.length >= 2 && (trimmed.includes("찾으시") || trimmed.includes("나요") || trimmed.includes("기준"))) {
      for (const bp of boldParts) {
        const clean = bp.replace(/\*\*/g, "").trim();
        // 키워드 필터: 너무 일반적인 단어 제외
        if (clean.length > 1 && clean.length < 25 && !clean.includes("질문") && !clean.includes("추가")) {
          // 문맥에 맞는 전체 텍스트 구성
          const suffix = trimmed.includes("ETF") ? " ETF" : "";
          options.push({
            label: clean + suffix,
            fullText: clean + suffix,
          });
        }
      }
      continue;
    }

    // 불릿/넘버 리스트 선택지: "• 국내 반도체 ETF (삼성전자 ...)" → "국내 반도체 ETF"
    const bulletMatch = trimmed.match(/^[•\-]\s*\*?\*?(.+?)(?:\*\*)?(?:\s*\(.*\))?(?:\s*[?？])?$/);
    if (bulletMatch) {
      let label = bulletMatch[1].replace(/\*\*/g, "").trim();
      // 괄호 이후 제거
      label = label.replace(/\s*\(.*$/, "").trim();
      // "~를 찾으시나요" 등의 질문형 어미 제거
      label = label.replace(/[를을이가은는]\s*(찾으시나요|위주로|어떠신가요|생각하시나요).*$/, "").trim();
      // "~위주로 찾으시나요?" → 핵심 키워드만
      if (label.includes("위주로")) {
        label = label.replace(/\s*위주로.*$/, "").trim();
      }

      if (label.length > 1 && label.length < 30 && !label.match(/^[0-9️⃣]+$/) && !label.includes("이런 것")) {
        options.push({
          label,
          fullText: label,
        });
      }
    }

    // 넘버 이모지 리스트: "1️⃣ **투자 목적**이 무엇인가요?"
    const emojiNumMatch = trimmed.match(/^[1-9]️⃣\s*\*?\*?(.+?)(?:\*\*)?(?:이|이란|이\s|은|는|를|이\s*무엇).*$/);
    if (emojiNumMatch && !parenSlashMatch) {
      const label = emojiNumMatch[1].replace(/\*\*/g, "").trim();
      if (label.length > 1 && label.length < 20) {
        // 이건 카테고리 헤더이므로 선택지로 추가하지 않음 (하위 옵션이 있을 때)
        // 하지만 하위 옵션이 없으면 추가
        // -> 일단 스킵, 괄호 옵션에서 이미 처리됨
      }
    }
  }

  // 중복 제거
  const unique = options.filter((opt, idx, arr) =>
    arr.findIndex(o => o.label === opt.label) === idx
  );

  return unique;
}

interface ChartDataItem {
  type: "performance" | "compare" | "returns" | "radar";
  data: Record<string, unknown>;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  agent?: { type: string; name: string };
  steps?: string[];
  toolCallCount?: number;
  charts?: ChartDataItem[];
  imageUrl?: string;
  onAskQuestion?: (question: string) => void;
  showProcessSteps?: boolean;
  isTyping?: boolean;
  onTypingComplete?: () => void;
}

export default function ChatMessage({
  role,
  content,
  agent,
  steps,
  toolCallCount,
  charts,
  imageUrl,
  onAskQuestion,
  showProcessSteps = true,
  isTyping = false,
  onTypingComplete,
}: ChatMessageProps) {
  const [showSteps, setShowSteps] = useState(true);
  const [selectedOptions, setSelectedOptions] = useState<Set<string>>(new Set());
  const [displayedContent, setDisplayedContent] = useState("");
  const [typingDone, setTypingDone] = useState(!isTyping);
  const typingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 타이핑 효과
  useEffect(() => {
    if (role !== "assistant" || !isTyping) {
      setDisplayedContent(content);
      setTypingDone(true);
      return;
    }

    setDisplayedContent("");
    setTypingDone(false);
    let idx = 0;
    const totalLen = content.length;
    // 속도: 전체 길이에 따라 조절 (짧으면 느리게, 길면 빠르게)
    const charsPerTick = Math.max(1, Math.ceil(totalLen / 120));
    const interval = 15;

    typingTimerRef.current = setInterval(() => {
      idx += charsPerTick;
      if (idx >= totalLen) {
        setDisplayedContent(content);
        setTypingDone(true);
        if (typingTimerRef.current) clearInterval(typingTimerRef.current);
        onTypingComplete?.();
      } else {
        setDisplayedContent(content.slice(0, idx));
      }
    }, interval);

    return () => {
      if (typingTimerRef.current) clearInterval(typingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTyping, content, role]);

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-2 max-w-[80%]">
          <div className="space-y-2">
            {imageUrl && (
              <div className="flex justify-end">
                <img
                  src={imageUrl}
                  alt="업로드된 차트"
                  className="max-w-[280px] rounded-xl border border-gray-200 shadow-sm"
                />
              </div>
            )}
            <div className="bg-[#1428a0] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-relaxed">
              {content}
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  const parsedSteps = (steps || []).map(parseStep);
  const contentForParsing = typingDone ? content : displayedContent;
  const { mainContent, questions: suggestedQuestions } = extractSuggestedQuestions(contentForParsing);
  const slotOptions = typingDone ? extractSlotFillingOptions(content) : [];

  // 선택지 클릭 핸들러
  const handleOptionClick = (option: SlotOption) => {
    if (!onAskQuestion) return;

    setSelectedOptions(prev => {
      const next = new Set(prev);
      if (next.has(option.label)) {
        next.delete(option.label);
      } else {
        next.add(option.label);
      }
      return next;
    });
  };

  // 선택 완료 후 전송
  const handleSendSelected = () => {
    if (!onAskQuestion || selectedOptions.size === 0) return;
    const text = Array.from(selectedOptions).join(", ");
    setSelectedOptions(new Set());
    onAskQuestion(text);
  };

  // 단일 옵션 바로 전송
  const handleDirectSend = (option: SlotOption) => {
    if (!onAskQuestion) return;
    onAskQuestion(option.fullText);
  };

  return (
    <div className="flex justify-start mb-4">
      <div className="flex items-start gap-2 max-w-[85%]">
        <div className="w-8 h-8 rounded-full bg-[#1428a0] flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="space-y-2">
          {/* 에이전트 뱃지 */}
          {agent && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {agent.name}
              </span>
              {toolCallCount !== undefined && toolCallCount > 0 && (
                <span className="text-xs text-gray-400">
                  도구 {toolCallCount}회 호출
                </span>
              )}
            </div>
          )}

          {/* MCP/RAG 처리 과정 */}
          {showProcessSteps && parsedSteps.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowSteps(!showSteps)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <span className="flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" />
                  <span className="font-medium">AI 처리 과정</span>
                  <span className="text-gray-400">
                    ({parsedSteps.length}단계)
                  </span>
                </span>
                {showSteps ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {showSteps && (
                <div className="px-3 pb-2 space-y-1.5 border-t border-gray-100">
                  {parsedSteps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 text-xs text-gray-600 step-animate pt-1.5"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      <span className="mt-0.5 flex-shrink-0">{step.icon}</span>
                      <span className="font-mono">{step.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 메시지 본문 */}
          <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 text-[15px] leading-relaxed shadow-sm">
            <div
              className="chat-content prose prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(mainContent) }}
            />
          </div>

          {/* 역질문 선택지 (슬롯 필링) 버튼 */}
          {slotOptions.length > 0 && onAskQuestion && (
            <div className="slot-filling-options">
              <div className="flex items-center gap-1.5 mb-2">
                <MousePointerClick className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-xs font-medium text-violet-600">아래에서 선택하세요</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {slotOptions.map((opt, i) => {
                  const isSelected = selectedOptions.has(opt.label);
                  return (
                    <button
                      key={i}
                      onClick={() => slotOptions.length <= 3 ? handleDirectSend(opt) : handleOptionClick(opt)}
                      className={`
                        slot-option-chip
                        flex items-center gap-1.5 text-[13px] font-medium
                        px-3.5 py-2 rounded-xl
                        border transition-all duration-200
                        hover:shadow-md hover:-translate-y-0.5
                        active:scale-95
                        ${isSelected
                          ? "bg-violet-100 text-violet-800 border-violet-300 shadow-sm ring-2 ring-violet-200"
                          : "bg-white text-gray-700 border-gray-200 hover:border-violet-300 hover:text-violet-700 hover:bg-violet-50"
                        }
                      `}
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {opt.emoji && <span>{opt.emoji}</span>}
                      {isSelected && <span className="text-violet-500">✓</span>}
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              {/* 다중 선택 모드일 때 전송 버튼 */}
              {slotOptions.length > 3 && selectedOptions.size > 0 && (
                <button
                  onClick={handleSendSelected}
                  className="mt-2 flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition-colors shadow-sm"
                >
                  <MousePointerClick className="w-3.5 h-3.5" />
                  선택 완료 ({selectedOptions.size}개)
                </button>
              )}
            </div>
          )}

          {/* 차트 시각화 */}
          {charts && charts.length > 0 && (
            <div className="space-y-2">
              {charts.map((chart, i) => (
                <ETFChart key={i} chart={chart as import("./ETFChart").ChartData} />
              ))}
            </div>
          )}

          {/* 추천 질문 버튼 */}
          {suggestedQuestions.length > 0 && onAskQuestion && (
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => onAskQuestion(q)}
                  className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  <MessageSquare className="w-3 h-3" />
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 간단한 마크다운 → HTML 변환
function formatMarkdown(text: string): string {
  let html = text;

  // 테이블
  html = html.replace(
    /\|(.+)\|\n\|[-| :]+\|\n((?:\|.+\|\n?)*)/g,
    (match) => {
      const rows = match.trim().split("\n");
      const headers = rows[0]
        .split("|")
        .filter((c) => c.trim())
        .map((c) => `<th>${c.trim()}</th>`)
        .join("");
      const body = rows
        .slice(2)
        .map(
          (row) =>
            `<tr>${row
              .split("|")
              .filter((c) => c.trim())
              .map((c) => `<td>${c.trim()}</td>`)
              .join("")}</tr>`
        )
        .join("");
      return `<table><thead><tr>${headers}</tr></thead><tbody>${body}</tbody></table>`;
    }
  );

  // 볼드
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // 이탤릭
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // 인라인 코드
  html = html.replace(/`(.+?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>');
  // 헤딩
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-base font-bold mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold mt-3 mb-1">$1</h2>');
  // 리스트
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc">$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal">$2</li>');
  // 경고
  html = html.replace(
    /⚠️(.+?)$/gm,
    '<div class="bg-amber-50 border border-amber-200 rounded px-3 py-1.5 text-xs text-amber-800 mt-2">⚠️$1</div>'
  );
  // 줄바꿈
  html = html.replace(/\n\n/g, "<br/><br/>");
  html = html.replace(/\n/g, "<br/>");

  return html;
}
