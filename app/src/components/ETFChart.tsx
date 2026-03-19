"use client";

import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend,
  Area,
  AreaChart,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface PricePoint {
  date: string;
  price: number;
}

interface PerformanceChartProps {
  type: "performance";
  data: {
    ticker: string;
    name: string;
    priceHistory: PricePoint[];
  };
}

interface CompareChartProps {
  type: "compare";
  data: {
    etfs: {
      ticker: string;
      name: string;
      return1M: number;
      return3M: number;
      return6M: number;
      return1Y: number;
    }[];
  };
}

interface ReturnBarProps {
  type: "returns";
  data: {
    ticker: string;
    name: string;
    return1M: number;
    return3M: number;
    return6M: number;
    return1Y: number;
    return3Y: number;
  };
}

interface RadarChartProps {
  type: "radar";
  data: {
    etfs: {
      name: string;
      수익률: number;
      안정성: number;
      수수료: number;
      규모: number;
      성장성: number;
    }[];
  };
}

export type ChartData = PerformanceChartProps | CompareChartProps | ReturnBarProps | RadarChartProps;

const COLORS = ["#1428a0", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"];

function formatPrice(value: number) {
  if (value >= 10000) return `${(value / 10000).toFixed(1)}만`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}천`;
  return value.toLocaleString();
}

function PerformanceChart({ data }: { data: PerformanceChartProps["data"] }) {
  const history = data.priceHistory.filter((_, i, arr) => {
    // Sample every 4th point for cleaner chart
    if (arr.length <= 60) return true;
    return i % 4 === 0 || i === arr.length - 1;
  });

  const minPrice = Math.min(...history.map((h) => h.price)) * 0.98;
  const maxPrice = Math.max(...history.map((h) => h.price)) * 1.02;
  const isPositive = history[history.length - 1].price >= history[0].price;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 my-3">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-gray-800">{data.name}</h4>
          <p className="text-xs text-gray-400">{data.ticker} · 최근 1년 가격 추이</p>
        </div>
        <div className={`text-sm font-bold ${isPositive ? "text-red-500" : "text-blue-500"}`}>
          {history[history.length - 1].price.toLocaleString()}원
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={history} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={`gradient-${data.ticker}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={isPositive ? "#ef4444" : "#3b82f6"} stopOpacity={0.15} />
              <stop offset="95%" stopColor={isPositive ? "#ef4444" : "#3b82f6"} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(d) => d.slice(5)}
            interval={Math.floor(history.length / 6)}
          />
          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={formatPrice}
            width={50}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            labelFormatter={(d) => `${d}`}
            formatter={(value) => [`${Number(value).toLocaleString()}원`, "가격"]}
          />
          <Area
            type="monotone"
            dataKey="price"
            stroke={isPositive ? "#ef4444" : "#3b82f6"}
            strokeWidth={1.5}
            fill={`url(#gradient-${data.ticker})`}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CompareChart({ data }: { data: CompareChartProps["data"] }) {
  const periods = [
    { key: "return1M", label: "1개월" },
    { key: "return3M", label: "3개월" },
    { key: "return6M", label: "6개월" },
    { key: "return1Y", label: "1년" },
  ];

  const chartData = periods.map((p) => {
    const point: Record<string, string | number> = { period: p.label };
    data.etfs.forEach((etf) => {
      point[etf.name] = etf[p.key as keyof typeof etf] as number;
    });
    return point;
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 my-3">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-gray-800">ETF 수익률 비교</h4>
        <p className="text-xs text-gray-400">
          {data.etfs.map((e) => e.name).join(" vs ")}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6b7280" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}%`}
            width={45}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [`${Number(value).toFixed(2)}%`]}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="square"
            iconSize={10}
          />
          {data.etfs.map((etf, i) => (
            <Bar
              key={etf.ticker}
              dataKey={etf.name}
              fill={COLORS[i % COLORS.length]}
              radius={[3, 3, 0, 0]}
              barSize={20}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ReturnsChart({ data }: { data: ReturnBarProps["data"] }) {
  const returns = [
    { period: "1개월", value: data.return1M },
    { period: "3개월", value: data.return3M },
    { period: "6개월", value: data.return6M },
    { period: "1년", value: data.return1Y },
    { period: "3년", value: data.return3Y },
  ].filter((r) => r.value !== 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 my-3">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-gray-800">{data.name} 기간별 수익률</h4>
        <p className="text-xs text-gray-400">{data.ticker}</p>
      </div>
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={returns} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="period" tick={{ fontSize: 11, fill: "#6b7280" }} />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            tickFormatter={(v) => `${v}%`}
            width={45}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "수익률"]}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={36}>
            {returns.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.value >= 0 ? "#ef4444" : "#3b82f6"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ETFRadarChart({ data }: { data: RadarChartProps["data"] }) {
  const metrics = ["수익률", "안정성", "수수료", "규모", "성장성"];
  const chartData = metrics.map((metric) => {
    const point: Record<string, string | number> = { metric };
    data.etfs.forEach((etf) => {
      point[etf.name] = etf[metric as keyof typeof etf] as number;
    });
    return point;
  });

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 my-3">
      <div className="mb-3">
        <h4 className="text-sm font-bold text-gray-800">ETF 종합 비교 (레이더)</h4>
        <p className="text-xs text-gray-400">
          {data.etfs.map((e) => e.name).join(" vs ")} · 5축 분석
        </p>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={chartData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="metric"
            tick={{ fontSize: 11, fill: "#4b5563" }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 9, fill: "#9ca3af" }}
          />
          {data.etfs.map((etf, i) => (
            <Radar
              key={etf.name}
              name={etf.name}
              dataKey={etf.name}
              stroke={COLORS[i % COLORS.length]}
              fill={COLORS[i % COLORS.length]}
              fillOpacity={0.15}
              strokeWidth={2}
            />
          ))}
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            iconType="square"
            iconSize={10}
          />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            formatter={(value) => [`${Number(value).toFixed(0)}점`]}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function ETFChart({ chart }: { chart: ChartData }) {
  switch (chart.type) {
    case "performance":
      return <PerformanceChart data={chart.data} />;
    case "compare":
      return <CompareChart data={chart.data} />;
    case "returns":
      return <ReturnsChart data={chart.data} />;
    case "radar":
      return <ETFRadarChart data={chart.data} />;
    default:
      return null;
  }
}
