const BASE_URL = "https://openapi.koreainvestment.com:9443";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/oauth2/tokenP`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "client_credentials",
      appkey: process.env.KIS_APP_KEY,
      appsecret: process.env.KIS_APP_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`KIS token error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + 23 * 60 * 60 * 1000, // 23시간 캐시
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

    const res = await fetch(
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

/** ETF/주식 일봉 데이터 (최근 100일) */
export async function getKISDailyPrices(
  ticker: string
): Promise<KISDailyPrice[]> {
  try {
    const token = await getAccessToken();
    const today = new Date();
    const ago = new Date(today);
    ago.setDate(ago.getDate() - 150);

    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    const params = new URLSearchParams({
      fid_cond_mrkt_div_code: "J",
      fid_input_iscd: ticker,
      fid_input_date_1: fmt(ago),
      fid_input_date_2: fmt(today),
      fid_period_div_code: "D",
      fid_org_adj_prc: "0",
    });

    const res = await fetch(
      `${BASE_URL}/uapi/domestic-stock/v1/quotations/inquire-daily-itemchartprice?${params}`,
      { headers: headers(token, "FHKST03010100") }
    );

    if (!res.ok) return [];
    const data = await res.json();
    const items = data.output2 || [];

    return items
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
  } catch (e) {
    console.error(`KIS daily error for ${ticker}:`, e);
    return [];
  }
}
