import { useEffect, useRef, useState } from "react";
import { ClientOnly } from "@tanstack/react-router";
import bg from "@/assets/bg-willow.png";
import { EventsPage } from "./shiji/EventsPage";
import { TimerPage } from "./shiji/TimerPage";
import { TodosPage } from "./shiji/TodosPage";
import { ReviewPage } from "./shiji/ReviewPage";
import { SummaryPage } from "./shiji/SummaryPage";
import { SettingsSheet } from "./shiji/SettingsSheet";
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
  const [titleOverride, setTitleOverride] = useState<string | null>(null);

  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<string | null>).detail;
      setTitleOverride(d ?? null);
    };
    window.addEventListener("shiji-title", h);
    return () => window.removeEventListener("shiji-title", h);
  }, []);

  useEffect(() => {
    setTitleOverride(null);
  }, [tab]);

  const startTiming = (a: Activity) => {
    setTiming(a);
    setInTimer(true);
  };

  const longPressTimer = useRef<number | null>(null);
  const startLongPress = () => {
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    longPressTimer.current = window.setTimeout(() => {
      setSettingsOpen(true);
    }, 550);
  };
  const cancelLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
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
        <h1
          className="text-3xl font-semibold tracking-[0.15em] text-foreground/90 drop-shadow-sm select-none cursor-pointer"
          onPointerDown={startLongPress}
          onPointerUp={cancelLongPress}
          onPointerLeave={cancelLongPress}
          onPointerCancel={cancelLongPress}
          onContextMenu={(e) => e.preventDefault()}
        >
          {inTimer ? "" : (titleOverride ?? TAB_TITLE[tab])}
        </h1>
        <div id="shiji-header-slot" className="flex items-center" />
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
        <nav
          className="absolute bottom-0 left-0 right-0 z-20 px-2 pt-3 pb-7 border-t"
          style={{
            borderColor: "oklch(0.85 0.04 145 / 0.40)",
            backgroundImage:
              "linear-gradient(180deg, oklch(0.995 0.008 145) 0%, oklch(0.975 0.030 145) 50%, oklch(0.935 0.055 145) 100%)",
            boxShadow: "0 -6px 20px -14px oklch(0.55 0.07 145 / 0.30)",
          }}
        >
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
                className={`py-2 text-base leading-relaxed bg-transparent transition-colors ${
                  tab === k
                    ? "text-[oklch(0.40_0.12_145)] font-semibold"
                    : "text-foreground/55"
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
