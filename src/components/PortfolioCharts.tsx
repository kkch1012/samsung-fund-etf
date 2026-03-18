"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: { month: string; value: number }[];
}

export default function PortfolioCharts({ data }: Props) {
  const minVal = Math.min(...data.map((d) => d.value)) * 0.98;
  const maxVal = Math.max(...data.map((d) => d.value)) * 1.02;
  const isPositive = data[data.length - 1].value >= data[0].value;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
        <defs>
          <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={isPositive ? "#ef4444" : "#3b82f6"} stopOpacity={0.15} />
            <stop offset="95%" stopColor={isPositive ? "#ef4444" : "#3b82f6"} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          interval={2}
        />
        <YAxis
          domain={[minVal, maxVal]}
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickFormatter={(v) => `${(v / 1).toLocaleString()}`}
          width={60}
        />
        <Tooltip
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
          formatter={(value) => [`${Number(value).toLocaleString()}만원`, "포트폴리오 가치"]}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={isPositive ? "#ef4444" : "#3b82f6"}
          strokeWidth={2}
          fill="url(#portfolioGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
