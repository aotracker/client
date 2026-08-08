"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ContentType } from "@/lib/albion/types";
import type { PlayerContentMixEntry } from "@/lib/db/queries";

interface ContentMixChartProps {
  contentMix: PlayerContentMixEntry[];
}

const LABELS: Record<ContentType, string> = {
  ZVZ: "ZvZ",
  SOLO: "1v1",
  GROUP: "Group",
};

const COLORS: Record<ContentType, string> = {
  ZVZ: "#ef4444",
  SOLO: "#3b82f6",
  GROUP: "#f59e0b",
};

const ORDER: ContentType[] = ["SOLO", "GROUP", "ZVZ"];

export function ContentMixChart({ contentMix }: ContentMixChartProps) {
  const byType = new Map(contentMix.map((e) => [e.contentType, e.count]));
  const data = ORDER.map((contentType) => ({
    contentType,
    name: LABELS[contentType],
    count: byType.get(contentType) ?? 0,
  })).filter((d) => d.count > 0);

  const total = data.reduce((sum, d) => sum + d.count, 0);

  if (total === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No content mix data in the last 30 days
      </p>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={72}
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.contentType}
                fill={COLORS[entry.contentType]}
                stroke="hsl(var(--card))"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 8,
              fontSize: 12,
              color: "hsl(var(--foreground))",
            }}
            formatter={(value, _name, item) => {
              const count = typeof value === "number" ? value : Number(value);
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              const label =
                (item?.payload as { name?: string } | undefined)?.name ??
                "Content";
              return [`${count} (${pct}%)`, label];
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => (
              <span className="text-muted-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
