import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// === 채팅 세션 ===

export async function createChatSession(model: string = "haiku") {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({ model, message_count: 0 })
    .select("id")
    .single();
  if (error) {
    console.error("createChatSession error:", error.message);
    return null;
  }
  return data.id as string;
}

export async function saveChatMessage(params: {
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  agentType?: string;
  agentName?: string;
  toolCallCount?: number;
  model?: string;
}) {
  const { error } = await supabase.from("chat_messages").insert({
    session_id: params.sessionId,
    role: params.role,
    content: params.content,
    agent_type: params.agentType,
    agent_name: params.agentName,
    tool_call_count: params.toolCallCount || 0,
    model: params.model,
  });

  if (!error) {
    await supabase
      .from("chat_sessions")
      .update({
        message_count: undefined, // will use RPC or manual increment
        last_message_at: new Date().toISOString(),
      })
      .eq("id", params.sessionId);
  }

  if (error) console.error("saveChatMessage error:", error.message);
}

// === 퀴즈 결과 ===

export async function saveQuizResult(params: {
  investorType: string;
  riskLevel: number;
  totalScore: number;
  answers: unknown;
  aiAnalysis: unknown;
  aiPortfolio: unknown;
}) {
  const { data, error } = await supabase
    .from("quiz_results")
    .insert({
      investor_type: params.investorType,
      risk_level: params.riskLevel,
      total_score: params.totalScore,
      answers: params.answers,
      ai_analysis: params.aiAnalysis,
      ai_portfolio: params.aiPortfolio,
    })
    .select("id")
    .single();
  if (error) console.error("saveQuizResult error:", error.message);
  return data?.id || null;
}

// === ETF 시세 캐시 ===

export async function upsertETFPrice(params: {
  ticker: string;
  name: string;
  price: number;
  changeVal: number;
  changeRate: number;
  volume: number;
}) {
  const { error } = await supabase.from("etf_prices").upsert(
    {
      ticker: params.ticker,
      name: params.name,
      price: params.price,
      change_val: params.changeVal,
      change_rate: params.changeRate,
      volume: params.volume,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "ticker" }
  );
  if (error) console.error("upsertETFPrice error:", error.message);
}

// === 피드백 ===

export async function saveFeedback(params: {
  messageId?: string;
  sessionId?: string;
  rating: number;
  comment?: string;
}) {
  const { error } = await supabase.from("feedback").insert({
    message_id: params.messageId,
    session_id: params.sessionId,
    rating: params.rating,
    comment: params.comment,
  });
  if (error) console.error("saveFeedback error:", error.message);
}

// === 통계 (관리자용) ===

export async function getStats() {
  const [sessions, messages, quizzes] = await Promise.all([
    supabase.from("chat_sessions").select("id", { count: "exact", head: true }),
    supabase.from("chat_messages").select("id", { count: "exact", head: true }),
    supabase.from("quiz_results").select("id", { count: "exact", head: true }),
  ]);

  return {
    totalSessions: sessions.count || 0,
    totalMessages: messages.count || 0,
    totalQuizzes: quizzes.count || 0,
  };
}
