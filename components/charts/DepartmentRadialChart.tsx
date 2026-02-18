"use client";

import {
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Tooltip,
} from "recharts";

const performanceData = [
  { name: "Internal Audit", value: 88, fill: "#7c6cff" },
  { name: "Software", value: 75, fill: "#e87e8e" },
  { name: "Proj. Mgmt", value: 92, fill: "#5cc8a8" },
  { name: "Website Audit", value: 70, fill: "#6cb8e8" },
  { name: "Account", value: 83, fill: "#e8b86c" },
];

function RadialTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-2.5 text-xs font-semibold">
      <span style={{ color: payload[0].payload.fill }}>
        {payload[0].payload.name}:{" "}
      </span>
      <span className="text-foreground">{payload[0].value}%</span>
    </div>
  );
}

export default function DepartmentRadialChart() {
  return (
    <div>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius={25}
          outerRadius={95}
          barSize={10}
          data={performanceData}
          startAngle={90}
          endAngle={-270}
        >
          <RadialBar
            background={{ fill: "oklch(0.5 0.01 264 / 0.08)" }}
            dataKey="value"
            cornerRadius={8}
          />
          <Tooltip content={<RadialTooltip />} />
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-foreground"
            style={{ fontSize: 22, fontWeight: 800 }}
          >
            85%
          </text>
          <text
            x="50%"
            y="56%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-muted-foreground"
            style={{ fontSize: 9 }}
          >
            Average
          </text>
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
        {performanceData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: item.fill }}
            />
            <span className="text-xs text-muted-foreground font-medium truncate">
              {item.name}
            </span>
            <span
              className="text-xs font-bold ml-auto"
              style={{ color: item.fill }}
            >
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
