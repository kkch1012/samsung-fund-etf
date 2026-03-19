import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "KODEX AI 어시스턴트 | 삼성자산운용",
  description: "ETF 특화 AI 에이전트 - MCP + RAG + 멀티에이전트 기반 KODEX ETF 투자 상담 시스템",
  keywords: ["ETF", "KODEX", "삼성자산운용", "AI", "MCP", "RAG", "챗봇"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        {children}
      </body>
    </html>
  );
}
