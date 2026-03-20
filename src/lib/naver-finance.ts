export interface NaverETFPrice {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  marketCap: number;
  nav: number;
  threeMonthReturn: number;
}

let cache: { data: Map<string, NaverETFPrice>; fetchedAt: number } | null = null;
const CACHE_TTL = 30_000; // 30초 캐시

async function fetchAllETF(): Promise<Map<string, NaverETFPrice>> {
  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
    return cache.data;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3000);

  try {
    const res = await fetch("https://finance.naver.com/api/sise/etfItemList.nhn", {
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`Naver API ${res.status}`);
    const buf = await res.arrayBuffer();
    let decoded: string;
    try {
      decoded = new TextDecoder("euc-kr").decode(buf);
    } catch {
      decoded = new TextDecoder("utf-8").decode(buf);
    }
    const json = JSON.parse(decoded);
    const items = json?.result?.etfItemList || [];

    const map = new Map<string, NaverETFPrice>();
    for (const item of items) {
      // 이름이 깨진 경우 ticker를 이름으로 사용 (chat API에서 DB 이름으로 덮어씌움)
      const nameOk = item.itemname && !/[\udca0-\udcff]/.test(item.itemname);
      map.set(item.itemcode, {
        ticker: item.itemcode,
        name: nameOk ? item.itemname : item.itemcode,
        price: item.nowVal || 0,
        change: item.changeVal || 0,
        changeRate: item.changeRate || 0,
        volume: item.quant || 0,
        marketCap: item.marketSum || 0,
        nav: item.nav || 0,
        threeMonthReturn: item.threeMonthEarnRate || 0,
      });
    }

    cache = { data: map, fetchedAt: Date.now() };
    return map;
  } catch {
    clearTimeout(timer);
    return cache?.data || new Map();
  }
}

export async function getNaverETFPrice(ticker: string): Promise<NaverETFPrice | null> {
  const map = await fetchAllETF();
  return map.get(ticker) || null;
}

export async function getNaverETFPrices(tickers: string[]): Promise<Map<string, NaverETFPrice>> {
  const map = await fetchAllETF();
  const result = new Map<string, NaverETFPrice>();
  for (const t of tickers) {
    const p = map.get(t);
    if (p) result.set(t, p);
  }
  return result;
}
