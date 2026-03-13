"use client";

import { useState } from "react";
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

interface ChartDataItem {
  type: "performance" | "compare" | "returns";
  data: Record<string, unknown>;
}

interface ChatMessageProps {
  role: "user" | "assistant";
  content: string;
  agent?: { type: string; name: string };
  steps?: string[];
  toolCallCount?: number;
  charts?: ChartDataItem[];
  onAskQuestion?: (question: string) => void;
}

export default function ChatMessage({
  role,
  content,
  agent,
  steps,
  toolCallCount,
  charts,
  onAskQuestion,
}: ChatMessageProps) {
  const [showSteps, setShowSteps] = useState(true);

  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="flex items-start gap-2 max-w-[80%]">
          <div className="bg-[#1428a0] text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-[15px] leading-relaxed">
            {content}
          </div>
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-gray-600" />
          </div>
        </div>
      </div>
    );
  }

  const parsedSteps = (steps || []).map(parseStep);
  const { mainContent, questions: suggestedQuestions } = extractSuggestedQuestions(content);

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
          {parsedSteps.length > 0 && (
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
