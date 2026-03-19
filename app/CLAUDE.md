# 삼성자산운용 ETF AI 에이전트 – 데모 시안

## 프로젝트 개요
- 삼성자산운용 디지털플랫폼팀 RFP 대응 데모 시안
- ETF 특화 AI 챗봇 (MCP + RAG + 멀티에이전트)
- 제출처: james.nam@samsung.com / 마감: 2026-03-16 (일) 17:00

## 기술 스택
- **프레임워크**: Next.js 16.1.6 + React 19 + TypeScript
- **스타일**: Tailwind CSS 4
- **AI**: OpenRouter API → `anthropic/claude-opus-4.6` (function calling)
- **차트**: recharts 3 (dynamic import, SSR disabled)
- **배포**: Vercel (https://app-one-psi-71.vercel.app)

## 환경변수
- `OPENROUTER_API_KEY` – OpenRouter API 키 (Vercel에도 설정됨)
- Supabase는 현재 미사용 (시드 데이터로 동작)

## 디렉토리 구조
```
src/
├── app/
│   ├── page.tsx              # 메인 챗봇 UI
│   ├── layout.tsx            # 루트 레이아웃
│   ├── globals.css           # 전역 스타일 + 애니메이션
│   ├── admin/page.tsx        # 관리자 대시보드 (4탭: overview/conversations/tools/rag)
│   ├── architecture/page.tsx # 시스템 아키텍처 시각화
│   └── api/chat/route.ts     # 챗봇 API (OpenRouter + function calling)
├── components/
│   ├── ChatMessage.tsx       # 메시지 렌더링 (마크다운 테이블 + 차트)
│   ├── ETFChart.tsx          # recharts 차트 (performance/compare/returns)
│   └── SuggestedQuestions.tsx # 환영화면 + 추천 질문 + 아키텍처 다이어그램
└── lib/
    ├── agents.ts             # 멀티에이전트 시스템 (상담/분석/추천 + 라우터)
    ├── tools.ts              # MCP 도구 7개 정의
    └── etf-data.ts           # KODEX ETF 230개 시드 데이터 + 투자설명서 5건 + 뉴스 6건
```

## 핵심 아키텍처
1. **멀티에이전트 라우팅**: classifyIntent() 키워드 분류 → 상담/분석/추천 에이전트 선택
2. **MCP 도구 7개**: ETF검색, 상세조회, 수익률, 비교, 문서RAG, 뉴스, 추천
3. **Function Calling Loop**: 한 질문에 최대 10회 도구 호출 (에이전트가 2~4개 도구 연쇄 사용)
4. **차트 시각화**: get_etf_performance → AreaChart, compare_etfs → BarChart 자동 생성

## 빌드 & 배포
```bash
npm run build          # 빌드
npm run dev            # 로컬 개발서버 (localhost:3000)
npx vercel --prod      # Vercel 프로덕션 배포
```

## 산출물 현황
- [x] 데모 웹 시안 (챗봇 + 아키텍처 + 관리자)
- [x] 서약서 (비즈니스 가이드라인) – /Users/bottle/samsung-fund/서약서_비즈니스_가이드라인.md
- [x] 개인정보 수집이용 동의서 – /Users/bottle/samsung-fund/개인정보_수집이용_동의서.md
- [ ] 제안서
- [ ] 견적서
