import { useEffect, useMemo, useState } from "react";
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
  "oklch(0.55 0.14 148)",
  "oklch(0.65 0.12 140)",
  "oklch(0.72 0.11 130)",
  "oklch(0.45 0.13 155)",
  "oklch(0.78 0.09 120)",
  "oklch(0.60 0.10 165)",
  "oklch(0.50 0.12 138)",
  "oklch(0.68 0.13 150)",
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

  return (
    <div className="pt-2 space-y-5">
      {/* 维度切换 */}
      <div className="glass flex rounded-full p-1">
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
            className={`flex-1 rounded-full py-1.5 text-sm transition ${
              range === k
                ? "bg-primary text-primary-foreground font-medium"
                : "text-foreground/65"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* 日期筛选 —— 随维度切换视图 */}
      <div className="flex items-center justify-between px-1">
        <div className="text-sm text-foreground/70">{rangeLabel}</div>
        <Popover>
          <PopoverTrigger asChild>
            <button className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-foreground/80">
              <CalendarIcon className="h-4 w-4" />
              {range === "day" ? "选日" : range === "week" ? "选周" : "选月"}
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
                    // 归一到当周周一
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
                    ? {
                        inweek: (d) => inRange(d, date, "week"),
                      }
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
      </div>

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
                    labelLine={{ stroke: "oklch(0.5 0.1 148 / 0.5)" }}
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
                    labelLine={{ stroke: "oklch(0.5 0.1 148 / 0.5)" }}
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
                    <CartesianGrid stroke="oklch(0.5 0.1 148 / 0.15)" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "oklch(0.35 0.06 148)" }}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "oklch(0.35 0.06 148)" }}
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
                      stroke="oklch(0.5 0.14 148)"
                      strokeWidth={2}
                      dot={{ r: 5, fill: "oklch(0.55 0.14 148)" }}
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
                        background: `color-mix(in oklab, ${GREENS[i % GREENS.length]} 22%, oklch(0.98 0.018 105))`,
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
        stroke="oklch(0.5 0.1 148 / 0.6)"
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill="oklch(0.5 0.13 148)" />
      <text
        x={tx}
        y={ey - (lines.length > 1 ? 6 : 0)}
        textAnchor={right ? "start" : "end"}
        fill="oklch(0.30 0.06 148)"
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
        fill="oklch(0.45 0.06 148)"
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

