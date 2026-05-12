import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { listSessions, type Session } from "@/lib/db";
import { format, startOfDay, startOfWeek, startOfMonth } from "date-fns";
import { zhCN } from "date-fns/locale";

export const Route = createFileRoute("/summary")({
  component: SummaryPage,
});

function fmtDur(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}小时${m}分`;
  return `${m}分${sec % 60}秒`;
}

function SummaryPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const dayStart = startOfDay(now).getTime();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }).getTime();
    const monthStart = startOfMonth(now).getTime();
    const sumBy = (cutoff: number) =>
      sessions
        .filter((s) => s.startAt >= cutoff)
        .reduce<Record<string, number>>((acc, s) => {
          acc[s.activityName] = (acc[s.activityName] ?? 0) + s.duration;
          return acc;
        }, {});
    return {
      day: sumBy(dayStart),
      week: sumBy(weekStart),
      month: sumBy(monthStart),
    };
  }, [sessions]);

  const renderRow = (data: Record<string, number>) => {
    const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
    if (entries.length === 0)
      return (
        <div className="py-3 text-sm text-foreground/40">暂无记录</div>
      );
    const max = entries[0][1];
    return (
      <div className="space-y-2">
        {entries.map(([name, sec]) => (
          <div key={name}>
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-foreground/80">{name}</span>
              <span className="text-foreground/60">{fmtDur(sec)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-foreground/10">
              <div
                className="h-full rounded-full bg-[#7aa055]"
                style={{ width: `${(sec / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <AppShell>
      <h1 className="mb-6 text-3xl font-semibold tracking-wide text-foreground/80">
        总结
      </h1>

      {[
        { title: "今日", data: stats.day },
        { title: "本周", data: stats.week },
        { title: "本月", data: stats.month },
      ].map((s) => (
        <div
          key={s.title}
          className="mb-4 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
        >
          <div className="mb-3 text-base font-medium text-foreground/80">
            {s.title}
          </div>
          {renderRow(s.data)}
        </div>
      ))}

      <div className="mt-6 rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm">
        <div className="mb-3 text-base font-medium text-foreground/80">
          最近记录
        </div>
        {sessions.slice(0, 10).map((s) => (
          <div
            key={s.id}
            className="flex justify-between border-b border-foreground/5 py-2 text-sm last:border-0"
          >
            <span className="text-foreground/80">{s.activityName}</span>
            <span className="text-foreground/50">
              {format(s.startAt, "MM-dd HH:mm", { locale: zhCN })} ·{" "}
              {fmtDur(s.duration)}
            </span>
          </div>
        ))}
        {sessions.length === 0 && (
          <div className="py-3 text-sm text-foreground/40">暂无记录</div>
        )}
      </div>
    </AppShell>
  );
}
