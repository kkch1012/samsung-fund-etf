-- ============================================
-- KODEX ETF AI 어시스턴트 — Supabase DB 스키마
-- ============================================

-- 1. 채팅 세션
create table if not exists chat_sessions (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  model text default 'haiku',
  message_count int default 0,
  last_message_at timestamptz default now()
);

-- 2. 채팅 메시지
create table if not exists chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  agent_type text,
  agent_name text,
  tool_call_count int default 0,
  model text,
  created_at timestamptz default now()
);

-- 3. 투자 성향 진단 결과
create table if not exists quiz_results (
  id uuid default gen_random_uuid() primary key,
  investor_type text not null,
  risk_level int,
  total_score int,
  answers jsonb,
  ai_analysis jsonb,
  ai_portfolio jsonb,
  created_at timestamptz default now()
);

-- 4. ETF 실시간 시세 캐시
create table if not exists etf_prices (
  ticker text primary key,
  name text,
  price numeric,
  change_val numeric,
  change_rate numeric,
  volume bigint,
  updated_at timestamptz default now()
);

-- 5. 사용자 피드백
create table if not exists feedback (
  id uuid default gen_random_uuid() primary key,
  message_id uuid,
  session_id uuid,
  rating int check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- 인덱스
create index if not exists idx_messages_session on chat_messages(session_id);
create index if not exists idx_messages_created on chat_messages(created_at);
create index if not exists idx_quiz_created on quiz_results(created_at);
create index if not exists idx_etf_prices_updated on etf_prices(updated_at);

-- RLS 정책 (공개 접근 — 시연용)
alter table chat_sessions enable row level security;
alter table chat_messages enable row level security;
alter table quiz_results enable row level security;
alter table etf_prices enable row level security;
alter table feedback enable row level security;

create policy "Public access" on chat_sessions for all using (true) with check (true);
create policy "Public access" on chat_messages for all using (true) with check (true);
create policy "Public access" on quiz_results for all using (true) with check (true);
create policy "Public access" on etf_prices for all using (true) with check (true);
create policy "Public access" on feedback for all using (true) with check (true);
