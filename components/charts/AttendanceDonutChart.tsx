"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

interface AttendanceDonutChartProps {
  present?: number;
  absent?: number;
  halfDay?: number;
  leave?: number;
  holiday?: number;
}

const COLORS = ["#7c6cff", "#e87e8e", "#5cc8a8", "#e8b86c"];

function DonutLabel({ cx, cy, present }: { cx?: number; cy?: number; present?: number }) {
  return (
    <g>
      <text
        x={cx}
        y={(cy ?? 0) - 8}
        textAnchor="middle"
        className="fill-foreground"
        style={{ fontSize: 28, fontWeight: 800, fontFamily: "inherit" }}
      >
        {present || 0}
      </text>
      <text
        x={cx}
        y={(cy ?? 0) + 14}
        textAnchor="middle"
        className="fill-muted-foreground"
        style={{ fontSize: 11, fontFamily: "inherit" }}
      >
        Present Today
      </text>
    </g>
  );
}

function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const colors = ["#7c6cff", "#e87e8e", "#5cc8a8", "#e8b86c"];
  return (
    <div className="bg-card border border-border rounded-xl shadow-xl p-3 text-xs font-semibold">
      <span style={{ color: colors[payload[0].payload.index] }}>
        {payload[0].name}:{" "}
      </span>
      <span className="text-card-foreground">{payload[0].value}</span>
    </div>
  );
}

export default function AttendanceDonutChart({ 
  present = 0, 
  absent = 0, 
  halfDay = 0, 
  leave = 0,
  holiday = 0 
}: AttendanceDonutChartProps) {
  const attendanceData = [
    { name: "Present", value: present, index: 0 },
    { name: "Absent", value: absent, index: 1 },
    { name: "Half Day", value: halfDay, index: 2 },
    { name: "Leave", value: leave, index: 3 },
  ];

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={attendanceData}
            cx="50%"
            cy="50%"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            dataKey="value"
            labelLine={false}
            label={(props) => <DonutLabel {...props} present={present} />}
          >
            {attendanceData.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} stroke="none" />
            ))}
          </Pie>
          <Tooltip content={<CustomPieTooltip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-1">
        {attendanceData.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: COLORS[item.index] }}
            />
            <span className="text-xs text-muted-foreground font-medium">
              {item.name}
            </span>
            <span className="text-xs font-bold text-foreground ml-auto">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

