import { NextRequest } from "next/server";
import { getKISPrice, getKISDailyPrices } from "@/lib/kis-api";

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get("ticker");
  if (!ticker) {
    return Response.json({ error: "ticker required" }, { status: 400 });
  }

  const [price, daily] = await Promise.all([
    getKISPrice(ticker),
    getKISDailyPrices(ticker),
  ]);

  if (!price) {
    return Response.json({ error: "not found" }, { status: 404 });
  }

  return Response.json({ price, daily });
}
