import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { Calendar as CalendarIcon } from "lucide-react";
import { getAll, type TimeEntry } from "@/lib/db";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const GREENS = [
  "oklch(0.57 0.10 142)",
  "oklch(0.66 0.08 122)",
  "oklch(0.73 0.07 102)",
  "oklch(0.50 0.08 150)",
  "oklch(0.80 0.055 118)",
  "oklch(0.62 0.07 135)",
  "oklch(0.54 0.075 128)",
  "oklch(0.70 0.07 145)",
];

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fmtDur(ms: number) {
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m} 分`;
  const h = Math.floor(m / 60);
  const mm = m % 60;
  return mm === 0 ? `${h} 时` : `${h} 时 ${mm} 分`;
}

type Range = "day" | "week" | "month";

function inRange(d: Date, ref: Date, range: Range) {
  if (range === "day") return ymd(d) === ymd(ref);
  if (range === "week") {
    const r = new Date(ref);
    const day = (r.getDay() + 6) % 7; // 周一=0
    const start = new Date(r);
    start.setDate(r.getDate() - day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return d >= start && d < end;
  }
  // month
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export function SummaryPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [date, setDate] = useState<Date>(new Date());
  const [range, setRange] = useState<Range>("day");
  const [view, setView] = useState<"grid" | "line">("grid");

  useEffect(() => {
    getAll<TimeEntry>("entries").then(setEntries);
  }, []);

  useEffect(() => {
    const t = window.setInterval(
      () => setView((v) => (v === "grid" ? "line" : "grid")),
      6000,
    );
    return () => clearInterval(t);
  }, []);

  // 同名合并 + 时间范围筛选
  const merged = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of entries) {
      if (!inRange(new Date(e.startAt), date, range)) continue;
      map.set(e.activityName, (map.get(e.activityName) ?? 0) + e.duration);
    }
    const arr = Array.from(map.entries()).map(([name, value]) => ({
      name,
      value,
    }));
    arr.sort((a, b) => b.value - a.value);
    return arr;
  }, [entries, date, range]);

  const total = merged.reduce((s, x) => s + x.value, 0);
  const top3 = merged.slice(0, 3);
  const last1 = merged.length > 0 ? merged[merged.length - 1] : null;

  const rangeLabel =
    range === "day"
      ? ymd(date)
      : range === "week"
      ? `${ymd(date)} 所在周`
      : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

  const calendarPopover = (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-center bg-transparent p-1.5"
          style={{ color: "oklch(0.45 0.07 145)" }}
          aria-label="日历"
        >
          <CalendarIcon className="h-5 w-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end">
        {range === "month" ? (
          <MonthYearPicker value={date} onChange={setDate} />
        ) : (
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              if (!d) return;
              if (range === "week") {
                const r = new Date(d);
                const day = (r.getDay() + 6) % 7;
                r.setDate(r.getDate() - day);
                setDate(r);
              } else {
                setDate(d);
              }
            }}
            showWeekNumber={range === "week"}
            modifiers={
              range === "week"
                ? { inweek: (d) => inRange(d, date, "week") }
                : undefined
            }
            modifiersClassNames={
              range === "week"
                ? { inweek: "bg-primary/30 rounded-none" }
                : undefined
            }
            className={cn("p-3 pointer-events-auto")}
          />
        )}
      </PopoverContent>
    </Popover>
  );

  const [headerSlot, setHeaderSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setHeaderSlot(document.getElementById("shiji-header-slot"));
  }, []);

  return (
    <div className="pt-0 -mt-2 space-y-3">
      {headerSlot && createPortal(calendarPopover, headerSlot)}

      {/* 日期 —— 在大标题"总结"正下方，会随滚动消失 */}
      <div className="px-1 pt-0 pb-1 text-sm text-foreground/70">
        {rangeLabel}
      </div>

      {/* 维度切换 —— 固定在顶部，无背景遮罩，直接显出底图 */}
      <div className="sticky -top-2 z-20 -mx-4 px-4 pt-2 pb-2">
        <div className="flex w-full items-center gap-2">
          {(
            [
              ["day", "日总结"],
              ["week", "周总结"],
              ["month", "月总结"],
            ] as [Range, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setRange(k)}
              className={`btn-jade btn-jade-soft ${range === k ? "btn-jade-text-active" : ""} flex-1 rounded-full px-4 py-2.5 text-base transition`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 pt-2">
      {merged.length === 0 ? (
        <div className="mt-20 text-center text-foreground/50 text-sm">
          这段时间还没有记录
        </div>
      ) : (
        <>
          {/* 图1：事件 + 总时间 */}
          <section className="glass rounded-3xl p-4">
            <div className="px-1 pb-2 text-sm text-foreground/70">
              时间分布（事件 / 时长）
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={merged}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={renderLabelTime}
                    labelLine={{ stroke: "oklch(0.45 0.055 135 / 0.46)" }}
                  >
                    {merged.map((_, i) => (
                      <Cell key={i} fill={GREENS[i % GREENS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 图2：事件 + 百分比 */}
          <section className="glass rounded-3xl p-4">
            <div className="px-1 pb-2 text-sm text-foreground/70">
              占比分布（事件 / 百分比）
            </div>
            <div className="h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={merged}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={70}
                    label={(p) => renderLabelPct(p, total)}
                    labelLine={{ stroke: "oklch(0.45 0.055 135 / 0.46)" }}
                  >
                    {merged.map((_, i) => (
                      <Cell key={i} fill={GREENS[i % GREENS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* 图3 / 图4：网格 ↔ 折线 自动切换 */}
          <section className="glass rounded-3xl p-4">
            <div className="px-1 pb-2 flex items-center justify-between">
              <div className="text-sm text-foreground/70">
                {view === "grid" ? "网格视图" : "折线视图"}
              </div>
              <div className="flex gap-1">
                {(["grid", "line"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      view === v
                        ? "bg-primary text-primary-foreground"
                        : "text-foreground/60"
                    }`}
                  >
                    {v === "grid" ? "网格" : "折线"}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-56">
              {view === "line" ? (
                <ResponsiveContainer>
                  <LineChart
                    data={merged.map((m) => ({
                      name: m.name,
                      minutes: Math.round(m.value / 60000),
                    }))}
                    margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                  >
                    <CartesianGrid stroke="oklch(0.45 0.055 135 / 0.14)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "oklch(0.34 0.035 140)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "oklch(0.34 0.035 140)" }}
                      label={{
                        value: "分钟",
                        angle: -90,
                        position: "insideLeft",
                        style: { fontSize: 11 },
                      }}
                    />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="minutes"
                      stroke="oklch(0.48 0.085 140)"
                      strokeWidth={2}
                      dot={{ r: 5, fill: "oklch(0.56 0.085 134)" }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto pr-1">
                  {merged.map((m, i) => (
                    <div
                      key={m.name}
                      className="rounded-2xl px-3 py-3 text-sm"
                      style={{
                        background: `color-mix(in oklab, ${GREENS[i % GREENS.length]} 14%, oklch(0.992 0.007 90))`,
                      }}
                    >
                      <div className="font-medium text-foreground/85 truncate">
                        {m.name}
                      </div>
                      <div className="text-xs text-foreground/65">
                        {fmtDur(m.value)} ·{" "}
                        {((m.value / total) * 100).toFixed(0)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* 排行 */}
          <section className="glass rounded-3xl p-4">
            <div className="px-1 pb-3 text-sm text-foreground/70">
              {range === "day" ? "当日极端" : range === "week" ? "本周极端" : "本月极端"}
            </div>
            <div className="space-y-2">
              {top3.map((m, i) => (
                <Row
                  key={m.name}
                  rank={i === 0 ? "1" : i === 1 ? "2." : "3."}
                  m={m}
                  accent={i === 0}
                />
              ))}
              {last1 && top3.findIndex((x) => x.name === last1.name) === -1 && (
                <Row rank="最少" m={last1} />
              )}
            </div>
          </section>
        </>
      )}
      </div>
    </div>
  );
}

function Row({
  rank,
  m,
  accent,
}: {
  rank: string;
  m: { name: string; value: number };
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-background/40 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <span
          className={`rounded-full px-2 py-0.5 text-xs ${
            accent
              ? "bg-primary/85 text-primary-foreground"
              : "bg-muted text-foreground/70"
          }`}
        >
          {rank}
        </span>
        <span className="text-sm">{m.name}</span>
      </div>
      <span className="text-xs tabular-nums text-foreground/70">
        {fmtDur(m.value)}
      </span>
    </div>
  );
}

// 折线引出标签 —— 时间
function renderLabelTime(props: any) {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  return drawLabel(cx, cy, midAngle, outerRadius, name, fmtDur(value));
}
function renderLabelPct(props: any, total: number) {
  const { cx, cy, midAngle, outerRadius, name, value } = props;
  const pct = total ? ((value / total) * 100).toFixed(0) : "0";
  return drawLabel(cx, cy, midAngle, outerRadius, name, `${pct}%`);
}
function drawLabel(
  cx: number,
  cy: number,
  midAngle: number,
  outerRadius: number,
  name: string,
  sub: string,
) {
  const RAD = Math.PI / 180;
  const sin = Math.sin(-RAD * midAngle);
  const cos = Math.cos(-RAD * midAngle);
  const sx = cx + outerRadius * cos;
  const sy = cy + outerRadius * sin;
  const mx = cx + (outerRadius + 12) * cos;
  const my = cy + (outerRadius + 12) * sin;
  const right = cos >= 0;
  const ex = mx + (right ? 1 : -1) * 22;
  const ey = my;
  const tx = ex + (right ? 4 : -4);
  // 折行：每行 4 个汉字
  const lines: string[] = [];
  for (let i = 0; i < name.length; i += 4) lines.push(name.slice(i, i + 4));
  return (
    <g>
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke="oklch(0.45 0.055 135 / 0.52)"
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill="oklch(0.47 0.075 135)" />
      <text
        x={tx}
        y={ey - (lines.length > 1 ? 6 : 0)}
        textAnchor={right ? "start" : "end"}
        fill="oklch(0.30 0.035 142)"
        fontSize="11"
      >
        {lines.map((ln, i) => (
          <tspan key={i} x={tx} dy={i === 0 ? 0 : 12}>
            {ln}
          </tspan>
        ))}
      </text>
      <text
        x={tx}
        y={ey + 12 + (lines.length - 1) * 12}
        textAnchor={right ? "start" : "end"}
        fill="oklch(0.44 0.035 140)"
        fontSize="10"
      >
        {sub}
      </text>
    </g>
  );
}

function MonthYearPicker({
  value,
  onChange,
}: {
  value: Date;
  onChange: (d: Date) => void;
}) {
  const [year, setYear] = useState(value.getFullYear());
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
  return (
    <div className="p-3 w-64" style={{ fontFamily: "ui-sans-serif, system-ui, sans-serif" }}>
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setYear((y) => y - 1)}
          className="px-2 py-1 rounded hover:bg-muted text-sm"
        >
          ‹
        </button>
        <div className="font-medium">{year} 年</div>
        <button
          onClick={() => setYear((y) => y + 1)}
          className="px-2 py-1 rounded hover:bg-muted text-sm"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {months.map((m, i) => {
          const active =
            value.getFullYear() === year && value.getMonth() === i;
          return (
            <button
              key={i}
              onClick={() => onChange(new Date(year, i, 1))}
              className={`rounded-lg py-2 text-sm transition ${
                active
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground/75"
              }`}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

