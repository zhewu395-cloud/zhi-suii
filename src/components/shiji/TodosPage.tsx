import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Check, X, Calendar as CalendarIcon, Filter } from "lucide-react";
import { getAll, put, del, uid, type Todo } from "@/lib/db";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { fireBurst, ParticleLayer } from "./ParticleBurst";

const today = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const fmtDate = (d: string) => {
  const [y, m, day] = d.split("-");
  return `${y} 年 ${parseInt(m)} 月 ${parseInt(day)} 日`;
};

export function TodosPage() {
  const [list, setList] = useState<Todo[]>([]);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState<Date>(new Date());
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const [pressedGroup, setPressedGroup] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<Date | null>(null);

  const load = async () => {
    const rows = await getAll<Todo>("todos");
    setList(rows);
  };
  useEffect(() => {
    load();
  }, []);

  const fmtDateInput = (d: Date) => {
    const y = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  };

  const add = async () => {
    if (!title.trim()) return;
    await put("todos", {
      id: uid(),
      title: title.trim(),
      details: details.trim() || undefined,
      date: fmtDateInput(date),
      done: false,
      createdAt: Date.now(),
    });
    setTitle("");
    setDetails("");
    setDate(new Date());
    setAdding(false);
    load();
  };

  const todayStr = today();

  const fmtKey = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const filterKey = filterDate ? fmtKey(filterDate) : null;

  // 分组：今日在最上，其余按日期降序（仅展示有未完成或当天的组）
  const groups = useMemo(() => {
    const map = new Map<string, Todo[]>();
    for (const t of list) {
      if (filterKey) {
        if (t.date !== filterKey) continue;
      } else {
        // 往日只显示未完成 + 当天显示全部
        if (t.date !== todayStr && t.done) continue;
      }
      (map.get(t.date) ?? map.set(t.date, []).get(t.date)!).push(t);
    }
    // 排序：今日优先，其后按日期降序
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === todayStr) return -1;
      if (b === todayStr) return 1;
      return a < b ? 1 : -1;
    });
    // 组内：未完成按 createdAt 升序，已完成按 doneAt 升序（沉底）
    for (const k of keys) {
      const arr = map.get(k)!;
      arr.sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        if (a.done) return (a.doneAt ?? 0) - (b.doneAt ?? 0);
        return a.createdAt - b.createdAt;
      });
    }
    return keys.map((k) => [k, map.get(k)!] as const);
  }, [list, todayStr, filterKey]);

  const toggle = async (t: Todo, ev: React.MouseEvent) => {
    if (!t.done) {
      // 以任务条整体的几何中心为发射源
      const row = (ev.currentTarget as HTMLElement).closest<HTMLElement>("[data-todo-row]");
      const target = row ?? (ev.currentTarget as HTMLElement);
      const rect = target.getBoundingClientRect();
      const x = (rect.left + rect.width / 2) / window.innerWidth;
      const y = (rect.top + rect.height / 2) / window.innerHeight;
      fireBurst({ x, y });
      await put("todos", { ...t, done: true, doneAt: Date.now() });

      // 检查今日是否全部完成 → 全屏烟花
      const todayItems = list.filter((x) => x.date === todayStr);
      const willAllDone = todayItems.every((x) => x.id === t.id || x.done);
      if (t.date === todayStr && willAllDone && todayItems.length > 0) {
        window.setTimeout(() => {
          fireBurst({ x: 0.5, y: 0.45, full: true });
        }, 200);
      }
    } else {
      await put("todos", { ...t, done: false, doneAt: undefined });
    }
    load();
  };

  const remove = async (id: string) => {
    await del("todos", id);
    setPressedItem(null);
    load();
  };
  const removeGroup = async (d: string) => {
    const ids = list.filter((t) => t.date === d).map((t) => t.id);
    for (const id of ids) await del("todos", id);
    setPressedGroup(null);
    load();
  };

  const pressTimer = useRef<number | null>(null);
  const startPress = (cb: () => void) => {
    pressTimer.current = window.setTimeout(cb, 550) as unknown as number;
  };
  const cancelPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
  };

  return (
    <div
      className="pt-0 -mt-1"
      onClick={() => {
        setPressedItem(null);
        setPressedGroup(null);
      }}
    >
      <ParticleLayer />
      <div className="sticky -top-2 z-20 -mx-4 px-4 pt-1 pb-1 flex items-center justify-end gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => e.stopPropagation()}
              className="btn-jade grid h-10 w-10 place-items-center rounded-full active:scale-95 transition relative"
              aria-label="按日期筛选"
            >
              <Filter className="h-4 w-4" />
              {filterDate && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0"
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 pt-2">
              <span className="text-xs text-foreground/60">按日期筛选</span>
              {filterDate && (
                <button
                  onClick={() => setFilterDate(null)}
                  className="text-xs text-primary"
                >
                  清除
                </button>
              )}
            </div>
            <Calendar
              mode="single"
              selected={filterDate ?? undefined}
              onSelect={(d) => setFilterDate(d ?? null)}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAdding(true);
          }}
          className="btn-jade grid h-10 w-10 place-items-center rounded-full active:scale-95 transition"
          aria-label="添加"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>

      {groups.length === 0 && (
        <div className="mt-16 text-center text-foreground/50 text-sm">
          {filterDate ? "该日期没有待办" : "还没有待办，点击右上角「+」开始"}
        </div>
      )}

      {groups.map(([d, items]) => {
        const isToday = d === todayStr;
        return (
          <div
            key={d}
            className="relative mb-4 rounded-3xl px-3 py-3"
            style={{
              backgroundImage:
                "linear-gradient(160deg, oklch(0.972 0.016 130 / 0.78) 0%, oklch(0.952 0.030 138 / 0.78) 100%)",
              border: "1px solid oklch(0.80 0.040 138 / 0.24)",
              boxShadow: "0 2px 10px -8px oklch(0.45 0.07 140 / 0.20)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
            }}
          >
            <div
              className="px-1 pb-2 text-xs text-foreground/65 select-none flex items-center gap-2"
              onMouseDown={(e) => {
                e.stopPropagation();
                startPress(() => setPressedGroup(d));
              }}
              onMouseUp={cancelPress}
              onTouchStart={(e) => {
                e.stopPropagation();
                startPress(() => setPressedGroup(d));
              }}
              onTouchEnd={cancelPress}
            >
              {isToday && <span>今日 ·</span>}
              <span>{fmtDate(d)}</span>
            </div>
            {pressedGroup === d && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeGroup(d);
                }}
                className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-primary/85 text-primary-foreground shadow"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="space-y-2">
              {items.map((t) => (
                <div
                  key={t.id}
                  data-todo-row
                  className="relative flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-500"
                  style={{
                    background: "oklch(0.93 0.050 132 / 0.85)",
                    border: "1px solid oklch(0.75 0.060 132 / 0.40)",
                    boxShadow: "0 2px 8px -6px oklch(0.45 0.06 132 / 0.35)",
                    filter: t.done ? "brightness(0.94) saturate(0.7)" : undefined,
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    startPress(() => setPressedItem(t.id));
                  }}
                  onMouseUp={cancelPress}
                  onMouseLeave={cancelPress}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    startPress(() => setPressedItem(t.id));
                  }}
                  onTouchEnd={cancelPress}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(t, e);
                    }}
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition ${
                      t.done
                        ? "bg-primary border-primary text-primary-foreground"
                        : "border-foreground/30"
                    }`}
                  >
                    {t.done && <Check className="h-4 w-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`truncate ${t.done ? "line-through opacity-80" : ""}`}
                    >
                      {t.title}
                    </div>
                    {t.details && (
                      <div
                        className={`truncate text-xs ${t.done ? "line-through opacity-70" : "text-foreground/55"}`}
                      >
                        {t.details}
                      </div>
                    )}
                  </div>
                  {pressedItem === t.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(t.id);
                      }}
                      className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary/85 text-primary-foreground shadow"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 视觉中心：屏幕上方 38%，高度随内容自适应 */}
      {adding && (
        <div
          className="fixed inset-0 z-30 bg-black/35 px-4"
          onClick={() => setAdding(false)}
        >
          <div
            className="absolute left-1/2 -translate-x-1/2 w-[92%] max-w-sm rounded-[28px] bg-background shadow-2xl flex flex-col overflow-hidden animate-scale-in"
            style={{ top: "30%" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部：任务名 —— 固定不被挤压 */}
            <div className="px-5 pt-4 pb-2 shrink-0">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="任务名"
                className="w-full bg-transparent text-base font-medium outline-none"
              />
            </div>
            {/* 分割线 —— 固定不被挤压 */}
            <div className="mx-5 h-px bg-border shrink-0" />
            {/* 中部：详情 —— 自动延伸 */}
            <div className="px-5 pt-2 pb-1">
              <textarea
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  const ta = e.currentTarget;
                  ta.style.height = "auto";
                  ta.style.height = Math.min(ta.scrollHeight, 280) + "px";
                }}
                placeholder="详细内容（可选）"
                rows={2}
                className="block w-full resize-none bg-transparent text-sm text-foreground/75 outline-none min-h-[48px]"
                style={{ maxHeight: 280 }}
              />
            </div>
            {/* 底部：日期 + 操作 —— 固定 */}
            <div className="px-5 pb-4 pt-1 flex items-center justify-between shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 rounded-full bg-muted/70 px-3 py-1 text-xs text-foreground/70">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {fmtDateInput(date)}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <div className="flex gap-2">
                <button
                  onClick={() => setAdding(false)}
                  className="rounded-full px-3 py-1 text-sm text-foreground/65"
                >
                  取消
                </button>
                <button
                  onClick={add}
                  className="rounded-full bg-primary px-4 py-1 text-sm text-primary-foreground"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
