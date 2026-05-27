import { useEffect, useMemo, useState } from "react";
import { getAll, type TimeEntry } from "@/lib/db";

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function hm(ts: number) {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDur(ms: number) {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m < 60) return `${m} 分钟`;
  const h = m / 60;
  if (Number.isInteger(h)) return `${h} 小时`;
  return `${h.toFixed(1)} 小时`;
}

/** 26 小时制：某天 02:00 → 次日 02:00 */
function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(2, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

type Node = {
  key: string;
  ts: number;
  kind: "start" | "end";
  name: string;
  duration: number;
};

export function TimelineView({ date }: { date: Date }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    getAll<TimeEntry>("entries").then(setEntries);
  }, []);

  const nodes = useMemo<Node[]>(() => {
    const { start, end } = dayBounds(date);
    const filtered = entries.filter(
      (e) => e.startAt >= start && e.startAt < end,
    );
    const list: Node[] = [];
    for (const e of filtered) {
      list.push({
        key: `${e.id}-s`,
        ts: e.startAt,
        kind: "start",
        name: e.activityName,
        duration: e.duration,
      });
      list.push({
        key: `${e.id}-e`,
        ts: e.endAt,
        kind: "end",
        name: e.activityName,
        duration: e.duration,
      });
    }
    return list.sort((a, b) => a.ts - b.ts);
  }, [entries, date]);

  if (nodes.length === 0) {
    return (
      <div className="mt-24 text-center text-foreground/50 text-sm">
        这一天还没有留下脚印
      </div>
    );
  }

  return (
    <div className="relative pl-24 pr-4 pt-3 pb-8">
      {/* 时间轴细线 */}
      <div
        className="absolute top-3 bottom-8"
        style={{
          left: "5.4rem",
          width: "1px",
          background:
            "linear-gradient(180deg, oklch(0.55 0.07 145 / 0) 0%, oklch(0.55 0.07 145 / 0.35) 8%, oklch(0.55 0.07 145 / 0.35) 92%, oklch(0.55 0.07 145 / 0) 100%)",
        }}
      />
      <ul className="space-y-4">
        {nodes.map((n) => {
          const isStart = n.kind === "start";
          const dotColor = isStart
            ? "oklch(0.82 0.10 145)" // 浅绿
            : "oklch(0.45 0.10 145)"; // 深绿
          const labelColor = isStart
            ? "oklch(0.50 0.08 145)"
            : "oklch(0.32 0.06 145)";
          return (
            <li key={n.key} className="relative min-h-[2.2rem]">
              {/* 节点 */}
              <span
                className="absolute -left-[1.85rem] top-[0.55rem] block h-[0.6rem] w-[0.6rem] rounded-full"
                style={{
                  background: dotColor,
                  boxShadow: "0 0 0 3px oklch(0.96 0.022 140 / 0.9)",
                }}
              />
              {/* 时间标签：在轴左侧 */}
              <div
                className="absolute -left-[6.2rem] top-0 w-[4.2rem] text-right leading-tight"
                style={{ color: "oklch(0.40 0.06 145)" }}
              >
                <div className="text-[15.5px] tabular-nums font-medium">
                  {hm(n.ts)}
                </div>
              </div>
              {/* 右侧文本 */}
              <div className="pt-0.5">
                <div
                  className="text-[16.5px] leading-snug"
                  style={{ color: labelColor, fontWeight: isStart ? 500 : 600 }}
                >
                  {n.name}
                  <span
                    className="mx-1 opacity-60"
                    style={{ fontWeight: 400 }}
                  >
                    ·
                  </span>
                  <span>{isStart ? "始" : "终"}</span>
                </div>
                {!isStart && (
                  <div
                    className="mt-0.5 text-[12.5px] tabular-nums"
                    style={{ color: "oklch(0.50 0.04 145 / 0.78)" }}
                  >
                    历时 {fmtDur(n.duration)}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
