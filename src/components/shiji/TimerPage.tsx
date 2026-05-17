import { useEffect, useRef, useState } from "react";
import { put, uid, type Activity, type TimeEntry, getAll } from "@/lib/db";
import { LeafBack } from "./LeafBack";

function fmt(ms: number) {
  const s = Math.floor(ms / 1000);
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function TimerPage({
  activity,
  onDone,
}: {
  activity: Activity | null;
  onDone: () => void;
}) {
  const [running, setRunning] = useState(false);
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [recent, setRecent] = useState<TimeEntry[]>([]);
  const [recentIdx, setRecentIdx] = useState(0);
  const ref = useRef<number | null>(null);

  const load = async () => {
    const rows = await getAll<TimeEntry>("entries");
    setRecent(rows.sort((a, b) => b.startAt - a.startAt).slice(0, 3));
  };
  useEffect(() => {
    load();
  }, []);

  // 自动开始计时
  useEffect(() => {
    if (activity && !running && start === null) {
      setStart(Date.now());
      setNow(Date.now());
      setRunning(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activity]);

  useEffect(() => {
    if (running) {
      ref.current = window.setInterval(
        () => setNow(Date.now()),
        1000,
      ) as unknown as number;
      return () => {
        if (ref.current) clearInterval(ref.current);
      };
    }
  }, [running]);

  // 最近记录 3 条以上的轮播（>3 自动隐藏，但严格只保存 3）
  useEffect(() => {
    if (recent.length <= 1) return;
    const t = window.setInterval(
      () => setRecentIdx((i) => (i + 1) % recent.length),
      3000,
    );
    return () => clearInterval(t);
  }, [recent.length]);

  const toggle = async () => {
    if (!running) {
      setStart(Date.now());
      setNow(Date.now());
      setRunning(true);
      return;
    }
    if (!start) return;
    const endAt = Date.now();
    const e: TimeEntry = {
      id: uid(),
      activityId: activity?.id ?? "unknown",
      activityName: activity?.name ?? "未指定",
      startAt: start,
      endAt,
      duration: endAt - start,
    };
    await put("entries", e);
    setRunning(false);
    setStart(null);
    load();
  };

  const elapsed = running && start ? now - start : 0;

  return (
    <div className="flex flex-col items-center pt-2">
      <div className="w-full sticky top-0 z-10">
        <LeafBack onClick={onDone} />
      </div>

      {/* 大圆 —— sticky 跟随滚动，浮在最上层 */}
      <div className="sticky top-2 z-40 mt-6 mb-2">
        <button
          onClick={toggle}
          className="grid h-72 w-72 place-items-center rounded-full glass breathe-slow shadow-2xl active:scale-95 transition mx-auto"
        >
          <div className="text-5xl font-light tabular-nums text-foreground/85">
            {fmt(elapsed)}
          </div>
        </button>
      </div>

      {/* 事件名 —— 2倍字号 */}
      <div className="mt-4 text-3xl font-medium text-foreground/85 tracking-wider">
        {activity?.name ?? "未指定"}
      </div>

      <button
        onClick={toggle}
        className="mt-10 rounded-full bg-primary text-primary-foreground px-12 py-3 text-base shadow-lg active:scale-95 transition"
      >
        {running ? "结束" : "开始"}
      </button>

      {recent.length > 0 && (
        <div className="mt-10 w-full max-w-sm">
          <h3 className="px-2 pb-2 text-sm text-foreground/60">最近记录</h3>
          <div className="space-y-2">
            {recent.slice(0, 3).map((r) => (
              <div
                key={r.id}
                className="glass rounded-2xl px-4 py-3 flex justify-between text-sm"
              >
                <span>{r.activityName}</span>
                <span className="tabular-nums text-foreground/70">
                  {fmt(r.duration)}
                </span>
              </div>
            ))}
          </div>
          <div className="hidden">{recentIdx}</div>
        </div>
      )}
      <div className="h-20" />
    </div>
  );
}
