import { useEffect, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import bg from "@/assets/bg-willow.png";
import { EventsPage } from "./shiji/EventsPage";
import { TimerPage } from "./shiji/TimerPage";
import { TodosPage } from "./shiji/TodosPage";
import { ReviewPage } from "./shiji/ReviewPage";
import { SummaryPage } from "./shiji/SummaryPage";
import { SettingsSheet } from "./shiji/SettingsSheet";
import { Settings } from "lucide-react";
import type { Activity } from "@/lib/db";

type Tab = "events" | "summary" | "todos" | "review";

const TAB_TITLE: Record<Tab, string> = {
  events: "时迹",
  summary: "总结",
  todos: "待办",
  review: "复盘",
};

export function ShijiApp() {
  const [tab, setTab] = useState<Tab>("events");
  const [timing, setTiming] = useState<Activity | null>(null);
  const [inTimer, setInTimer] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {}, []);

  const startTiming = (a: Activity) => {
    setTiming(a);
    setInTimer(true);
  };

  return (
    <div
      className="relative mx-auto flex h-[100dvh] w-full max-w-[480px] flex-col overflow-hidden"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* 原图背景直出，无任何蒙层 */}

      <header className="relative z-10 flex items-center justify-between px-5 pt-12 pb-3">
        <h1 className="text-3xl font-semibold tracking-[0.15em] text-foreground/90 drop-shadow-sm">
          {inTimer ? "" : TAB_TITLE[tab]}
        </h1>
        <button
          onClick={() => setSettingsOpen(true)}
          className="grid h-10 w-10 place-items-center rounded-full glass text-foreground/80 active:scale-95 transition"
          aria-label="设置"
        >
          <Settings className="h-5 w-5" />
        </button>
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-4 pb-28">
        {inTimer ? (
          <TimerPage activity={timing} onDone={() => setInTimer(false)} />
        ) : (
          <>
            {tab === "events" && <EventsPage onStart={startTiming} />}
            {tab === "summary" && <SummaryPage />}
            {tab === "todos" && <TodosPage />}
            {tab === "review" && <ReviewPage />}
          </>
        )}
      </main>

      {!inTimer && (
        <nav className="absolute bottom-0 left-0 right-0 z-20 px-2 pt-2 pb-6 bg-[oklch(0.995_0.006_95/0.55)] backdrop-blur-xl border-t border-white/30">
          <div className="grid grid-cols-4 gap-1">
            {(
              [
                ["events", "事件"],
                ["summary", "总结"],
                ["todos", "待办"],
                ["review", "复盘"],
              ] as [Tab, string][]
            ).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setTab(k)}
                className={`py-2 text-base bg-transparent transition-colors ${
                  tab === k
                    ? "text-[oklch(0.55_0.12_148)] font-semibold"
                    : "text-foreground/45"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}

      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}

export default function ShijiAppClient() {
  return (
    <ClientOnly fallback={<div className="h-[100dvh]" />}>
      <ShijiApp />
    </ClientOnly>
  );
}
