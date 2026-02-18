"use client";

import { useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

const recruitmentData = [
  { month: "Jan", Market: 32, Testing: 18, Product: 24 },
  { month: "Feb", Market: 48, Testing: 30, Product: 18 },
  { month: "Mar", Market: 28, Testing: 42, Product: 35 },
  { month: "Apr", Market: 60, Testing: 24, Product: 45 },
  { month: "May", Market: 38, Testing: 55, Product: 28 },
  { month: "Jun", Market: 72, Testing: 40, Product: 55 },
  { month: "Jul", Market: 34, Testing: 50, Product: 22 },
  { month: "Aug", Market: 56, Testing: 35, Product: 62 },
  { month: "Sep", Market: 45, Testing: 62, Product: 38 },
  { month: "Oct", Market: 42, Testing: 28, Product: 50 },
  { month: "Nov", Market: 65, Testing: 48, Product: 34 },
  { month: "Dec", Market: 50, Testing: 58, Product: 42 },
];

const barColors: Record<string, string> = {
  Market: "#7c6cff",
  Testing: "#5cc8a8",
  Product: "#e87e8e",
};

type FilterType = "All" | "Market" | "Testing" | "Product";

function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs font-medium">
      <p className="text-muted-foreground mb-1 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ background: p.fill }}
          />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-bold text-foreground">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export default function RecruitmentBarChart() {
  const [filter, setFilter] = useState<FilterType>("All");

  const visibleBars =
    filter === "All" ? ["Market", "Testing", "Product"] : [filter];

  return (
    <div>
      <div className="flex gap-1.5 mb-3">
        {(["All", "Market", "Testing", "Product"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
              filter === f
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={recruitmentData} barSize={6} barGap={2}>
          <XAxis
            dataKey="month"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10 }}
            className="fill-muted-foreground"
          />
          <YAxis hide />
          <Tooltip
            content={<CustomBarTooltip />}
            cursor={{ fill: "oklch(0.5 0.02 264 / 0.06)", radius: 6 }}
          />
          {visibleBars.map((bar) => (
            <Bar
              key={bar}
              dataKey={bar}
              fill={barColors[bar]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 justify-center">
        {["Market", "Testing", "Product"].map((b) => (
          <div key={b} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: barColors[b] }}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {b}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
