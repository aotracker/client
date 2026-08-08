"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatFame } from "@/lib/utils";
import type { PlayerFameDay } from "@/lib/db/queries";

interface FameOverTimeChartProps {
  fameByDay: PlayerFameDay[];
}

const KILL_COLOR = "hsl(var(--stat-kill))";
const DEATH_COLOR = "hsl(var(--stat-death))";

function formatDayLabel(day: string): string {
  const d = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function FameOverTimeChart({ fameByDay }: FameOverTimeChartProps) {
  if (fameByDay.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No fame data in the last 30 days
      </p>
    );
  }

  const data = fameByDay.map((row) => ({
    ...row,
    label: formatDayLabel(row.day),
  }));

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="20%"
          barGap={2}
        >
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatFame(v)}
            width={44}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            formatter={(value, name) => [
              formatFame(typeof value === "number" ? value : Number(value)),
              name === "earned" ? "Earned" : "Lost",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "hsl(var(--muted-foreground))" }}
            formatter={(value) => (value === "earned" ? "Earned" : "Lost")}
          />
          <Bar
            dataKey="earned"
            fill={KILL_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
          <Bar
            dataKey="lost"
            fill={DEATH_COLOR}
            radius={[3, 3, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
