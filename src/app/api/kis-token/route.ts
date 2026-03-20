import { NextResponse } from "next/server";

const BASE_URL = "https://openapi.koreainvestment.com:9443";

export async function GET() {
  try {
    const res = await fetch(`${BASE_URL}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: process.env.KIS_APP_KEY,
        appsecret: process.env.KIS_APP_SECRET,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      return NextResponse.json({
        token: data.access_token,
        message: "이 토큰을 Vercel 환경변수 KIS_ACCESS_TOKEN에 설정하세요. 24시간 유효합니다.",
      });
    }
    return NextResponse.json({ error: data.error_description || "토큰 발급 실패" }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
