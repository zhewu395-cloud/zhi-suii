import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Bubble } from "@/components/Bubble";
import { ChevronLeft } from "lucide-react";
import { addSession, getDB, type Activity } from "@/lib/db";

export const Route = createFileRoute("/timer/$id")({
  component: TimerPage,
});

function fmt(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function TimerPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [activity, setActivity] = useState<Activity | null>(null);
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    (async () => {
      const db = await getDB();
      const a = (await db.get("activities", id)) as Activity | undefined;
      if (a) setActivity(a);
    })();
  }, [id]);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        if (startRef.current != null) {
          setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
        }
      }, 250);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  function handleStart() {
    startRef.current = Date.now();
    setElapsed(0);
    setRunning(true);
  }

  async function handleStop() {
    setRunning(false);
    const start = startRef.current ?? Date.now();
    const end = Date.now();
    const dur = Math.floor((end - start) / 1000);
    if (activity && dur > 0) {
      await addSession({
        activityId: activity.id,
        activityName: activity.name,
        startAt: start,
        endAt: end,
        duration: dur,
      });
    }
    navigate({ to: "/" });
  }

  return (
    <AppShell>
      <button
        onClick={() => navigate({ to: "/" })}
        className="mb-2 flex items-center gap-1 text-sm text-foreground/60"
      >
        <ChevronLeft className="h-4 w-4" /> 返回
      </button>
      <div className="mb-6 text-center text-lg text-foreground/70">
        {activity?.name ?? "..."}
      </div>

      <div className="flex flex-col items-center gap-12 pt-16">
        <div className="flex h-64 w-64 items-center justify-center rounded-full border border-[#a8c98a]/50 bg-[#bcd99a]/55 shadow-[0_8px_30px_rgba(120,160,90,0.25)] backdrop-blur-sm">
          <div className="text-5xl font-light tracking-wider text-white drop-shadow-sm">
            {fmt(elapsed)}
          </div>
        </div>

        <Bubble
          variant="ghost"
          className="h-14 w-36"
          onClick={running ? handleStop : handleStart}
        >
          {running ? "结束" : "开始"}
        </Bubble>
      </div>
    </AppShell>
  );
}
