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
  if (m < 60) return `${m} 分`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h} 时` : `${h} 时 ${mm} 分`;
}

/** 26 小时制：某天 02:00 → 次日 02:00 */
function dayBounds(d: Date) {
  const start = new Date(d);
  start.setHours(2, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 1);
  return { start: start.getTime(), end: end.getTime() };
}

export function TimelineView({ date }: { date: Date }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);

  useEffect(() => {
    getAll<TimeEntry>("entries").then(setEntries);
  }, []);

  const list = useMemo(() => {
    const { start, end } = dayBounds(date);
    return entries
      .filter((e) => e.startAt >= start && e.startAt < end)
      .sort((a, b) => a.startAt - b.startAt);
  }, [entries, date]);

  if (list.length === 0) {
    return (
      <div className="mt-24 text-center text-foreground/50 text-sm">
        这一天还没有留下脚印
      </div>
    );
  }

  return (
    <div className="relative pl-20 pr-2 pt-2 pb-6">
      {/* 时间轴细线 */}
      <div
        className="absolute top-2 bottom-6"
        style={{
          left: "4.6rem",
          width: "1px",
          background:
            "linear-gradient(180deg, oklch(0.55 0.07 145 / 0) 0%, oklch(0.55 0.07 145 / 0.35) 8%, oklch(0.55 0.07 145 / 0.35) 92%, oklch(0.55 0.07 145 / 0) 100%)",
        }}
      />
      <ul className="space-y-3.5">
        {list.map((e) => (
          <li key={e.id} className="relative">
            {/* 节点 */}
            <span
              className="absolute -left-[1.45rem] top-3 block h-2 w-2 rounded-full"
              style={{
                background: "oklch(0.62 0.09 142)",
                boxShadow: "0 0 0 3px oklch(0.95 0.025 140 / 0.85)",
              }}
            />
            {/* 时间标签：在轴左侧 */}
            <div
              className="absolute -left-[5.0rem] top-1.5 w-[3.3rem] text-right leading-tight"
              style={{ color: "oklch(0.40 0.06 145)" }}
            >
              <div className="text-[12px] tabular-nums font-medium">
                {hm(e.startAt)}
              </div>
              <div
                className="text-[10.5px] tabular-nums"
                style={{ color: "oklch(0.55 0.045 145 / 0.85)" }}
              >
                {hm(e.endAt)}
              </div>
            </div>
            {/* 卡片 */}
            <div
              className="rounded-2xl px-3.5 py-2.5"
              style={{
                background:
                  "linear-gradient(180deg, oklch(0.985 0.012 140 / 0.85), oklch(0.955 0.022 140 / 0.75))",
                border: "1px solid oklch(0.65 0.05 145 / 0.20)",
                boxShadow: "0 1px 2px oklch(0.50 0.05 145 / 0.06)",
              }}
            >
              <div
                className="text-[14px] font-medium truncate"
                style={{ color: "oklch(0.30 0.055 145)" }}
              >
                {e.activityName}
              </div>
              <div
                className="mt-0.5 text-[11px] tabular-nums"
                style={{ color: "oklch(0.46 0.045 145 / 0.85)" }}
              >
                持续 {fmtDur(e.duration)}
              </div>
              {e.note && (
                <div
                  className="mt-1 text-[11.5px] leading-snug"
                  style={{ color: "oklch(0.42 0.04 145 / 0.90)" }}
                >
                  {e.note}
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
