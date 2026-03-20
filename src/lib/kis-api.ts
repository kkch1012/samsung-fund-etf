const BASE_URL = "https://openapi.koreainvestment.com:9443";
const KIS_TIMEOUT = 3000; // 3초 타임아웃

let cachedToken: { token: string; expiresAt: number } | null = null;

function fetchWithTimeout(url: string, options: RequestInit, ms = KIS_TIMEOUT): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

async function getAccessToken(): Promise<string> {
  // 1) 환경변수에 토큰이 직접 설정되어 있으면 그것을 사용 (서버리스 안정성)
  if (process.env.KIS_ACCESS_TOKEN) {
    return process.env.KIS_ACCESS_TOKEN;
  }

  // 2) 메모리 캐시
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  if (!process.env.KIS_APP_KEY || !process.env.KIS_APP_SECRET) {
    throw new Error("KIS API keys not configured");
  }

  const res = await fetchWithTimeout(`${BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  }, 5000);

  if (!res.ok) {
    throw new Error(`KIS token error: ${res.status}`);
  }

  const data = await res.json();
  if (!data.access_token) throw new Error("No access_token in response");
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000,
  };
  return cachedToken.token;
}

function headers(token: string, trId: string) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    authorization: `Bearer ${token}`,
    appkey: process.env.KIS_APP_KEY!,
    appsecret: process.env.KIS_APP_SECRET!,
    tr_id: trId,
  };
}

export interface KISPrice {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  prevClose: number;
}

/** ETF/주식 현재가 조회 */
export async function getKISPrice(ticker: string): Promise<KISPrice | null> {
  try {
    const token = await getAccessToken();
    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: "J",
      fid_input_iscd: ticker,
    });

    const res = await fetchWithTimeout(
      `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-price?${params}`,
      { headers: headers(token, "FHKST01010100") }
    );

    if (!res.ok) return null;
    const data = await res.json();
    const o = data.output;
    if (!o) return null;

    return {
      ticker,
      name: o.hts_kor_isnm || ticker,
      price: Number(o.stck_prpr) || 0,
      change: Number(o.prdy_vrss) || 0,
      changeRate: Number(o.prdy_ctrt) || 0,
      volume: Number(o.acml_vol) || 0,
      high: Number(o.stck_hgpr) || 0,
      low: Number(o.stck_lwpr) || 0,
      open: Number(o.stck_oprc) || 0,
      prevClose: Number(o.stck_sdpr) || 0,
    };
  } catch (e) {
    console.error(`KIS price error for ${ticker}:`, e);
    return null;
  }
}

export interface KISDailyPrice {
  date: string;
  close: number;
  open: number;
  high: number;
  low: number;
  volume: number;
}

/** ETF/주식 일봉 데이터 (최근 1년, 2회 호출로 ~200일) */
export async function getKISDailyPrices(
  ticker: string
): Promise<KISDailyPrice[]> {
  try {
    const token = await getAccessToken();
    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    const today = new Date();
    const mid = new Date(today);
    mid.setDate(mid.getDate() - 130);
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const fetchChunk = async (from: Date, to: Date): Promise<KISDailyPrice[]> => {
      const params = new URLSearchParams({
        fid_cond_mrkt_div_code: "J",
        fid_input_iscd: ticker,
        fid_input_date_1: fmt(from),
        fid_input_date_2: fmt(to),
        fid_period_div_code: "D",
        fid_org_adj_prc: "0",
      });
      const res = await fetchWithTimeout(
        `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`,
        { headers: headers(token, "FHKST03010100") }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return (data.output2 || [])
        .map((item: Record<string, string>) => ({
          date: `${item.stck_bsop_date?.slice(0, 4)}-${item.stck_bsop_date?.slice(4, 6)}-${item.stck_bsop_date?.slice(6, 8)}`,
          close: Number(item.stck_clpr) || 0,
          open: Number(item.stck_oprc) || 0,
          high: Number(item.stck_hgpr) || 0,
          low: Number(item.stck_lwpr) || 0,
          volume: Number(item.acml_vol) || 0,
        }))
        .filter((d: KISDailyPrice) => d.close > 0)
        .reverse();
    };

    // 2회 병렬 호출: 최근 130일 + 그 이전 ~130일
    const [recent, older] = await Promise.all([
      fetchChunk(mid, today),
      fetchChunk(yearAgo, mid),
    ]);

    // 중복 제거 후 날짜순 정렬
    const map = new Map<string, KISDailyPrice>();
    for (const d of [...older, ...recent]) map.set(d.date, d);
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.error(`KIS daily error for ${ticker}:`, e);
    return [];
  }
}

/** 일봉 데이터에서 기간별 수익률을 코드로 계산 */
export interface CalculatedReturns {
  return1M: number | null;
  return3M: number | null;
  return6M: number | null;
  return1Y: number | null;
  source: "KIS_일봉_계산";
}

export function calculateReturnsFromDaily(daily: KISDailyPrice[]): CalculatedReturns {
  if (daily.length < 2) {
    return { return1M: null, return3M: null, return6M: null, return1Y: null, source: "KIS_일봉_계산" };
  }

  const latest = daily[daily.length - 1];
  const latestDate = new Date(latest.date);

  function findClosestPrice(monthsAgo: number): number | null {
    const target = new Date(latestDate);
    target.setMonth(target.getMonth() - monthsAgo);
    const targetStr = target.toISOString().slice(0, 10);

    let closest: KISDailyPrice | null = null;
    let minDiff = Infinity;
    for (const d of daily) {
      const diff = Math.abs(new Date(d.date).getTime() - new Date(targetStr).getTime());
      if (diff < minDiff) {
        minDiff = diff;
        closest = d;
      }
    }
    // 30일 이상 차이나면 null
    if (!closest || minDiff > 30 * 24 * 60 * 60 * 1000) return null;
    return closest.close;
  }

  function calcReturn(monthsAgo: number): number | null {
    const pastPrice = findClosestPrice(monthsAgo);
    if (!pastPrice || pastPrice === 0) return null;
    return Math.round(((latest.close - pastPrice) / pastPrice) * 10000) / 100;
  }

  return {
    return1M: calcReturn(1),
    return3M: calcReturn(3),
    return6M: calcReturn(6),
    return1Y: calcReturn(12),
    source: "KIS_일봉_계산",
  };
}
