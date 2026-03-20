# ETF 투자 분석 서비스 - Cursor 프로젝트 규칙

## 🚨 최우선 원칙: AI는 절대 금융 데이터를 생성하지 않는다

이 프로젝트는 한국 ETF 투자 분석 서비스이다. 금융 데이터의 정확성이 서비스의 신뢰성과 직결되므로, 아래 규칙을 반드시 준수한다.

### 절대 금지 사항
- AI(LLM)가 ETF 종목코드, 상품명, 현재가, 수익률, AUM, 총보수, 배당수익률 등 수치 데이터를 추측하거나 생성하는 것을 금지한다
- AI가 "기억"이나 "학습 데이터"에 의존하여 금융 정보를 제공하는 것을 금지한다
- 외부 API나 DB에서 조회되지 않는 데이터를 임의로 채워넣는 것을 금지한다

### 핵심 아키텍처 원칙
```
[사용자 질문] → [AI: 의도 파악 & 쿼리 설계] → [코드: API/DB 조회] → [AI: 조회 결과 해석 & 설명]
                     ↑ AI 역할                    ↑ 코드 역할              ↑ AI 역할
                  분석/추론만 담당              데이터 조회만 담당        결과 설명만 담당
```

---

## 📐 시스템 아키텍처

### 3계층 데이터 구조

```
Layer 1: 정적 DB (Static Database)
├── ETF 마스터 테이블: 종목코드, 정식 상품명, 운용사, 기초지수, 총보수, 상장일, 카테고리
├── 이 데이터는 KRX 공시 또는 운용사 공식 사이트에서 수집
├── 주기적 업데이트 (월 1회 또는 신규 상장/변경 시)
└── AI가 이 데이터를 수정하거나 임의 생성하는 것을 절대 금지

Layer 2: 실시간 API (Real-time Data)
├── 현재가, 등락률, 거래량: 증권사 API 또는 KRX 시세 API
├── AUM(순자산): 운용사 API 또는 금융데이터 제공업체
├── 기간별 수익률: NAV 기반 계산 또는 데이터 제공업체 API
└── 반드시 코드로 호출하고, API 응답 원본을 그대로 사용

Layer 3: AI 분석 (LLM Analysis)
├── 조회된 데이터를 기반으로 투자 포인트 해석
├── ETF 간 비교 분석 및 장단점 설명
├── 투자 스타일별 추천 이유 설명
└── 수치 데이터를 직접 만들지 않고, Layer 1-2에서 받은 데이터만 인용
```

### 디렉토리 구조

```
src/
├── db/
│   ├── etf_master.json          # ETF 마스터 데이터 (정적)
│   ├── seed_etf_master.ts       # KRX/운용사에서 마스터 데이터 수집 스크립트
│   └── validate_etf.ts          # ETF 데이터 검증 유틸리티
├── api/
│   ├── market_data.ts           # 실시간 시세 조회 API 클라이언트
│   ├── fund_info.ts             # 펀드 정보 조회 (AUM, 수익률 등)
│   └── types.ts                 # API 응답 타입 정의
├── tools/
│   ├── search_etf.ts            # ETF 검색 도구
│   ├── compare_etfs.ts          # ETF 비교 도구
│   ├── recommend_etf.ts         # ETF 추천 도구
│   └── get_realtime_price.ts    # 실시간 시세 조회 도구
├── prompts/
│   └── system_prompt.ts         # AI 시스템 프롬프트
└── utils/
    └── data_validator.ts        # 출력 데이터 검증 레이어
```

---

## 📊 ETF 마스터 DB 설계

### 스키마

```typescript
interface ETFMaster {
  ticker: string;          // 종목코드 (예: "091160")
  name: string;            // 정식 상품명 (예: "KODEX 반도체")
  asset_manager: string;   // 운용사 (예: "삼성자산운용")
  brand: string;           // 브랜드 (예: "KODEX", "TIGER", "RISE" 등)
  category: string;        // 카테고리 (예: "국내주식/반도체")
  base_index: string;      // 기초지수
  total_fee: number;       // 총보수 (연, %)
  listing_date: string;    // 상장일 (YYYY-MM-DD)
  is_active: boolean;      // 현재 상장 여부
  dividend_cycle: string;  // 분배금 주기 (예: "월배당", "분기배당")
  last_updated: string;    // 마스터 데이터 최종 업데이트일
}
```

### 마스터 데이터 수집 소스 (우선순위)
1. 한국거래소(KRX) 정보데이터시스템: https://data.krx.co.kr
2. 각 운용사 공식 사이트 (삼성자산운용, 미래에셋, KB자산운용 등)
3. 금융투자협회 전자공시: https://dis.kofia.or.kr

### 마스터 데이터 검증 규칙
- 종목코드는 반드시 6자리 숫자
- 상품명과 브랜드 매칭 검증 (KODEX = 삼성자산운용, TIGER = 미래에셋 등)
- 총보수는 0% ~ 2% 범위 내
- 상장일은 미래 날짜 불가

---

## 🔧 도구(Tool) 함수 구현 규칙

### 모든 도구 함수의 필수 구조

```typescript
// ✅ 올바른 패턴: 데이터는 코드로 조회, AI는 해석만
async function searchETF(query: string): Promise<ToolResult> {
  // Step 1: 마스터 DB에서 검색
  const candidates = await db.searchETF(query);
  
  if (candidates.length === 0) {
    return { 
      success: false, 
      message: "해당 조건에 맞는 ETF를 찾을 수 없습니다.",
      data: null 
    };
  }
  
  // Step 2: 각 후보의 실시간 데이터 조회
  const enriched = await Promise.all(
    candidates.map(async (etf) => {
      const realtime = await marketAPI.getPrice(etf.ticker);
      const fundInfo = await fundAPI.getInfo(etf.ticker);
      return {
        ...etf,           // 마스터 DB 데이터
        ...realtime,       // 실시간 시세
        ...fundInfo,       // AUM, 수익률 등
      };
    })
  );
  
  // Step 3: 구조화된 데이터 반환 (AI는 이것만 사용)
  return {
    success: true,
    data: enriched,
    data_timestamp: new Date().toISOString(),
    source: "KRX/삼성자산운용 API"  // 데이터 출처 명시
  };
}

// ❌ 금지 패턴: AI에게 데이터 생성을 맡기는 것
async function searchETF_WRONG(query: string): Promise<string> {
  // AI에게 "KODEX 반도체 ETF 목록을 알려줘"라고 프롬프트를 보내는 것
  const response = await llm.chat("KODEX 반도체 관련 ETF 목록과 수익률을 알려줘");
  return response; // ← 이러면 AI가 데이터를 만들어냄
}
```

### 도구별 데이터 흐름

#### search_etf_products (ETF 검색)
```
입력: 검색 키워드 (예: "KODEX 반도체")
처리:
  1. etf_master DB에서 name, category LIKE 검색
  2. 매칭된 종목코드로 실시간 API 호출
  3. 결과를 JSON으로 반환
출력: { ticker, name, price, change, volume, aum, total_fee }[]
AI 역할: 검색 결과를 자연어로 설명, 각 ETF의 특징 비교
```

#### compare_etfs (ETF 비교)
```
입력: 두 ETF의 종목코드 (예: "379810", "494300")
처리:
  1. etf_master DB에서 두 ETF 기본 정보 조회 → 없으면 에러 반환
  2. 실시간 API로 가격/수익률/AUM 조회
  3. 수익률 비교 데이터 구성
출력: { etf1: {...}, etf2: {...}, comparison: {...} }
AI 역할: 비교 결과를 해석하여 투자 포인트 설명
```

#### recommend_etf (ETF 추천)
```
입력: 카테고리 (예: "배당", "반도체", "커버드콜")
처리:
  1. etf_master DB에서 해당 카테고리 ETF 목록 조회
  2. 각 ETF의 실시간 데이터 조회 (수익률, AUM 등)
  3. 수익률/AUM/보수 기준 정렬
출력: { recommendations: [...], sort_criteria, data_timestamp }
AI 역할: 추천 사유와 투자 스타일별 적합성 설명
```

---

## 🛡️ 데이터 검증 레이어

### 출력 전 필수 검증

모든 도구 함수의 최종 출력에 대해 아래 검증을 수행한다:

```typescript
function validateETFOutput(data: any): ValidationResult {
  const errors: string[] = [];
  
  // 1. 종목코드 존재 여부 확인
  if (!masterDB.exists(data.ticker)) {
    errors.push(`종목코드 ${data.ticker}가 마스터 DB에 존재하지 않음`);
  }
  
  // 2. 상품명-종목코드-운용사 매칭 검증
  const master = masterDB.get(data.ticker);
  if (master && data.name !== master.name) {
    errors.push(`상품명 불일치: ${data.name} vs ${master.name}`);
  }
  if (master && data.brand && !master.name.startsWith(data.brand)) {
    errors.push(`브랜드 불일치: ${data.brand}는 ${master.asset_manager} 상품이 아님`);
  }
  
  // 3. 수치 범위 검증
  if (data.total_fee && (data.total_fee < 0 || data.total_fee > 2)) {
    errors.push(`총보수 이상: ${data.total_fee}%`);
  }
  if (data.price && data.price <= 0) {
    errors.push(`가격 이상: ${data.price}`);
  }
  if (data.aum && data.aum < 0) {
    errors.push(`AUM 이상: ${data.aum}`);
  }
  
  // 4. 레버리지 ETF 수익률 일관성 (기초 ETF 대비)
  // 5. 데이터 타임스탬프 확인 (너무 오래된 데이터 경고)
  
  return { valid: errors.length === 0, errors };
}
```

### API 호출 실패 시 처리

```typescript
// ✅ 올바른 처리: 데이터 없음을 명시
if (!apiResponse || apiResponse.error) {
  return {
    ticker: etf.ticker,
    name: etf.name,         // 마스터 DB에서 가져온 것만 반환
    total_fee: etf.total_fee,
    price: null,             // 조회 실패 시 null
    aum: null,
    returns_1y: null,
    data_status: "실시간 데이터 조회 실패 - 마스터 정보만 표시"
  };
}

// ❌ 금지: 조회 실패 시 AI가 추정값을 채워넣는 것
```

---

## 💬 AI 시스템 프롬프트

도구 함수가 AI에게 분석을 요청할 때 사용하는 시스템 프롬프트:

```typescript
const SYSTEM_PROMPT = `
당신은 한국 ETF 투자 분석 어시스턴트입니다.

## 절대 규칙

1. **수치 데이터는 제공된 JSON에서만 인용하세요.**
   - 종목코드, 상품명, 현재가, 수익률, AUM, 총보수 등 모든 수치는
     반드시 [DATA] 블록에 제공된 값만 사용합니다.
   - [DATA]에 없는 수치는 "데이터 없음" 또는 "조회 불가"로 표시합니다.
   - 절대로 수치를 추측하거나 기억에 의존하여 작성하지 마세요.

2. **존재하지 않는 ETF 상품을 언급하지 마세요.**
   - [DATA]에 포함되지 않은 ETF 상품을 추가로 추천하거나 언급하지 않습니다.
   - "~도 있습니다", "~도 고려해볼 수 있습니다" 등으로 
     데이터에 없는 상품을 소개하지 마세요.

3. **데이터 출처와 기준 시점을 명시하세요.**
   - "3월 18일 기준", "장중 시세 기준" 등 데이터 시점을 안내합니다.

4. **투자 판단은 사용자에게 맡기세요.**
   - "~해야 합니다", "~을 추천합니다"보다 
     "~한 특징이 있습니다", "~를 고려해볼 수 있습니다"로 표현합니다.
   - 투자 위험 고지를 포함합니다.

## 당신의 역할
- 제공된 데이터를 읽기 쉽게 정리
- ETF 간 차이점과 특징을 분석
- 투자 스타일별 적합성을 설명
- 커버드콜, 레버리지 등 전략의 원리를 설명

## 금지 역할
- 종목코드, 상품명 생성
- 가격, 수익률, AUM 등 수치 생성
- 존재하지 않는 ETF 상품 언급
`;
```

---

## 📡 실시간 데이터 API 연동

### 추천 데이터 소스

#### 1순위: 한국거래소(KRX) 정보데이터시스템
- ETF 시세: https://data.krx.co.kr
- 장점: 공식 데이터, 무료
- 단점: 실시간 아닌 지연 시세, 크롤링 필요

#### 2순위: 네이버 금융 / 다음 금융
- 비공식 API로 시세 조회 가능
- 장점: 실시간에 가까운 시세
- 단점: 비공식이라 변경 가능성

#### 3순위: 증권사 Open API
- 한국투자증권, 키움증권 등 Open API
- 장점: 공식 실시간 데이터
- 단점: API 키 필요, 호출 제한

#### 4순위: FunETF / ETFCheck 등 ETF 전문 사이트
- ETF 특화 데이터 (수익률, 분배금, 구성종목)
- 크롤링으로 수집 가능

### API 클라이언트 구현 패턴

```typescript
class MarketDataClient {
  // 캐시: 동일 종목 반복 조회 방지 (TTL: 장중 1분, 장외 1시간)
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  
  async getPrice(ticker: string): Promise<PriceData | null> {
    // 캐시 확인
    const cached = this.cache.get(ticker);
    if (cached && Date.now() - cached.timestamp < this.getTTL()) {
      return cached.data;
    }
    
    // API 호출 (fallback 체인)
    try {
      const data = await this.primaryAPI.getPrice(ticker);
      this.cache.set(ticker, { data, timestamp: Date.now() });
      return data;
    } catch {
      try {
        return await this.fallbackAPI.getPrice(ticker);
      } catch {
        return null; // 모든 소스 실패 시 null 반환 (AI가 채우지 않음)
      }
    }
  }
}
```

---

## 🧪 테스트 체크리스트

### 도구 함수 테스트 시 반드시 확인할 항목

```
□ 존재하지 않는 종목코드 입력 시 → 에러 반환 (AI 생성 아님)
□ 상품명-종목코드-운용사 매칭이 올바른가
□ 총보수가 마스터 DB 값과 일치하는가
□ 다른 운용사 상품을 KODEX로 표기하지 않는가
□ 같은 ETF를 여러 번 조회해도 동일한 정적 데이터가 반환되는가
□ API 장애 시 null/에러를 반환하고, AI가 임의 값을 채우지 않는가
□ 수익률 기준일이 명시되어 있는가
□ 레버리지 ETF 가격이 기초 ETF 대비 논리적으로 일관된가
```

### 알려진 함정 (이전 테스트에서 발견)
- "KODEX 200커버드콜ATM" → 존재하지 않는 상품 (TIGER 200커버드콜이 유사)
- "KODEX 200고배당커버드콜ATM" → RISE(KB자산운용) 상품임
- "KODEX 배당성장" 270800 → 270800은 KB RISE KQ High Dividend, 실제는 211900
- "KODEX 미국배당다우존스" 390200 → 실제 종목코드는 489250
- 같은 ETF인데 도구마다 총보수가 다르게 표시되는 현상

---

## 🔄 마스터 데이터 유지보수

### 업데이트 트리거
- 신규 ETF 상장 시
- ETF 상품명 변경 시 (예: "KODEX 배당성장" → "KODEX 코리아배당성장")
- ETF 상장폐지 시
- 총보수 변경 시

### 업데이트 프로세스
```
1. KRX 전체 ETF 목록 크롤링
2. 기존 마스터 DB와 diff 비교
3. 신규/변경/폐지 항목 로깅
4. 수동 검증 후 DB 반영
5. 변경 이력 기록
```

---

## 📝 코드 작성 시 주의사항

### DO (해야 할 것)
- ETF 관련 수치는 항상 API/DB에서 조회
- 조회 실패 시 null 반환, "데이터 없음" 명시
- 데이터 출처와 기준 시점 항상 포함
- 마스터 DB에 없는 종목코드는 에러 처리
- 캐시 TTL 설정으로 불필요한 API 호출 방지

### DON'T (하지 말 것)
- LLM 프롬프트로 ETF 목록이나 수치 데이터 생성
- API 실패 시 AI에게 "적절한 값을 채워넣으라"고 요청
- 하드코딩된 ETF 데이터를 프롬프트에 포함
- 마스터 DB 검증 없이 AI가 반환한 종목코드를 신뢰
- 운용사-브랜드 매칭 검증 생략
