import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
  if (m < 60) return `${m}min`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm === 0 ? `${h}h` : `${h}h${rm}min`;
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

// 统一深柳绿（与软件文字色一致）
const TEXT_COLOR = "oklch(0.32 0.06 145)";
const MUTED_COLOR = "oklch(0.40 0.05 145 / 0.72)";

export function TimelineView({ date }: { date: Date }) {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const titleRef = useRef<HTMLSpanElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [axisLeft, setAxisLeft] = useState(120);

  useEffect(() => {
    getAll<TimeEntry>("entries").then(setEntries);
  }, []);

  useLayoutEffect(() => {
    function measure() {
      if (!titleRef.current || !wrapRef.current) return;
      const t = titleRef.current.getBoundingClientRect();
      const w = wrapRef.current.getBoundingClientRect();
      setAxisLeft(t.right - w.left);
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
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

  // 1.3x 尺寸
  const TIME_FS = 20; // 15.5 * 1.3
  const EVENT_FS = 21; // 16.5 * 1.3
  const DUR_FS = 16; // 12.5 * 1.3
  const LINE_W = 1.5;
  const GAP_LEFT = 12; // 线左侧到时间数字的间距
  const GAP_RIGHT = 18; // 线右侧到事件文字的间距

  return (
    <div ref={wrapRef} className="relative px-4 pt-3 pb-8">
      {/* 顶部标题 */}
      <div
        className="mb-4 flex items-baseline gap-3"
        style={{ color: TEXT_COLOR }}
      >
        <span className="text-sm" style={{ color: MUTED_COLOR }}>
          {date.getFullYear()}-{pad(date.getMonth() + 1)}-{pad(date.getDate())}
        </span>
        <span
          ref={titleRef}
          className="text-base font-medium tracking-wide"
        >
          时间线
        </span>
      </div>

      {nodes.length === 0 ? (
        <div className="mt-20 text-center text-foreground/50 text-sm">
          这一天还没有留下脚印
        </div>
      ) : (
        <>
          {/* 时间轴细线：垂直落在“线”字右下方 */}
          <div
            className="absolute"
            style={{
              left: axisLeft - LINE_W / 2,
              top: "4.2rem",
              bottom: "2rem",
              width: LINE_W,
              background:
                "linear-gradient(180deg, oklch(0.55 0.07 145 / 0) 0%, oklch(0.5 0.07 145 / 0.4) 8%, oklch(0.5 0.07 145 / 0.4) 92%, oklch(0.55 0.07 145 / 0) 100%)",
            }}
          />
          <ul className="relative space-y-5">
            {nodes.map((n) => {
              const isStart = n.kind === "start";
              // 圆点：毛玻璃 + 内侧色彩区分
              const dotInner = isStart
                ? "oklch(0.82 0.10 145 / 0.55)"
                : "oklch(0.42 0.10 145 / 0.55)";
              return (
                <li
                  key={n.key}
                  className="relative"
                  style={{ minHeight: `${EVENT_FS * 1.6}px` }}
                >
                  {/* 时间（轴左） */}
                  <div
                    className="absolute top-0 text-right leading-tight tabular-nums"
                    style={{
                      right: `calc(100% - ${axisLeft - GAP_LEFT}px)`,
                      width: "4.6rem",
                      color: TEXT_COLOR,
                      fontSize: `${TIME_FS}px`,
                      fontWeight: 500,
                    }}
                  >
                    {hm(n.ts)}
                  </div>
                  {/* 毛玻璃圆点（精准居中在线上） */}
                  <span
                    className="absolute rounded-full"
                    style={{
                      left: axisLeft,
                      top: `${TIME_FS * 0.55}px`,
                      transform: "translate(-50%, -50%)",
                      width: "0.36rem",
                      height: "0.36rem",
                      background: dotInner,
                      border: "1px solid oklch(0.5 0.07 145 / 0.45)",
                      backdropFilter: "blur(4px)",
                      WebkitBackdropFilter: "blur(4px)",
                      boxShadow:
                        "0 0 0 2px oklch(0.96 0.022 140 / 0.85), 0 1px 2px oklch(0.3 0.05 145 / 0.15)",
                    }}
                  />
                  {/* 事件（轴右） */}
                  <div
                    className="absolute top-0"
                    style={{
                      left: axisLeft + GAP_RIGHT,
                      right: 0,
                      color: TEXT_COLOR,
                    }}
                  >
                    <div
                      className="leading-snug"
                      style={{
                        fontSize: `${EVENT_FS}px`,
                        fontWeight: 500,
                      }}
                    >
                      {n.name}
                      <span className="mx-1 opacity-55" style={{ fontWeight: 400 }}>
                        ·
                      </span>
                      <span>{isStart ? "始" : "终"}</span>
                    </div>
                    {!isStart && (
                      <div
                        className="mt-0.5 tabular-nums"
                        style={{
                          fontSize: `${DUR_FS * 0.5}px`,
                          color: MUTED_COLOR,
                        }}
                      >
                        用时{fmtDur(n.duration)}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
