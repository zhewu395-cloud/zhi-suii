import { useEffect, useMemo, useRef, useState } from "react";
import { getAll, put, del, uid, type Review, type ReviewCategory } from "@/lib/db";
import { ReviewEditor } from "./ReviewEditor";
import { LeafBack } from "./LeafBack";

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, "").trim();


export function ReviewPage() {
  const [list, setList] = useState<Review[]>([]);
  const [editing, setEditing] = useState<Review | null>(null);
  const [openCat, setOpenCat] = useState<ReviewCategory | "long" | null>(null);
  const [longView, setLongView] = useState<"week" | "month">("week");
  const [longSplit, setLongSplit] = useState(false);
  const [hoverCat, setHoverCat] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const today = ymd(new Date());

  const load = async () => {
    const rows = await getAll<Review>("reviews");
    // 兼容老数据
    const fixed = rows.map((r) => ({
      ...r,
      category: (r.category ?? r.type ?? "pending") as ReviewCategory,
    }));
    setList(fixed);
  };
  useEffect(() => {
    load();
  }, []);

  // 进入子视图时，把顶部"复盘"大标题换为对应分类名
  useEffect(() => {
    const titleMap: Record<string, string> = {
      sundry: "琐碎记",
      day: "日复盘",
      week: "周复盘",
      month: "月复盘",
      long: "长复盘",
    };
    const detail = openCat ? titleMap[openCat] ?? null : null;
    window.dispatchEvent(new CustomEvent("shiji-title", { detail }));
    return () => {
      window.dispatchEvent(new CustomEvent("shiji-title", { detail: null }));
    };
  }, [openCat]);

  const startNew = () => {
    const r: Review = {
      id: uid(),
      category: "pending",
      title: "",
      date: today,
      content: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setEditing(r);
  };

  const onSave = (r: Review) => {
    setList((prev) => {
      const i = prev.findIndex((x) => x.id === r.id);
      if (i === -1) return [...prev, r];
      const next = [...prev];
      next[i] = r;
      return next;
    });
  };

  const pending = useMemo(
    () =>
      list
        .filter((r) => r.category === "pending")
        .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt)),
    [list],
  );

  // 分类后 → 移动
  const moveTo = async (id: string, cat: ReviewCategory) => {
    const r = list.find((x) => x.id === id);
    if (!r) return;
    const next = { ...r, category: cat, updatedAt: Date.now() };
    await put("reviews", next);
    onSave(next);
    setHoverCat(null);
    setDraggingId(null);
  };

  const removeReview = async (id: string) => {
    await del("reviews", id);
    setList((prev) => prev.filter((x) => x.id !== id));
  };

  // ===== 长复盘视图 =====
  if (openCat === "long" || openCat === "week" || openCat === "month") {
    const cat = openCat === "long" ? longView : openCat;
    const rows = list
      .filter((r) => r.category === cat)
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));
    return (
      <div className="pt-2">
        {!editing && (
          <LeafBack
            onClick={() => setOpenCat(null)}
            className="!fixed top-1 left-1 z-50"
          />
        )}
        <div className="flex items-center justify-end">
          <div className="flex gap-2">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setLongView(v);
                  setOpenCat(v);
                }}
                className={`btn-jade ${cat === v ? "btn-jade-active" : ""} rounded-full px-3 py-1 text-xs`}
              >
                {v === "week" ? "周复盘" : "月复盘"}
              </button>
            ))}
          </div>
        </div>
        <CardList rows={rows} onOpen={setEditing} onRemove={removeReview} />
        {editing && (
          <ReviewEditor
            review={editing}
            onClose={() => {
              setEditing(null);
              load();
            }}
            onSave={onSave}
          />
        )}
      </div>
    );
  }
  if (openCat === "sundry" || openCat === "day") {
    const rows = list
      .filter((r) => r.category === openCat)
      .sort((a, b) => (b.updatedAt ?? b.createdAt) - (a.updatedAt ?? a.createdAt));

    return (
      <div className="pt-2">
        {!editing && (
          <LeafBack
            onClick={() => setOpenCat(null)}
            className="!fixed top-1 left-1 z-50"
          />
        )}
        <CardList rows={rows} onOpen={setEditing} onRemove={removeReview} />
        {editing && (
          <ReviewEditor
            review={editing}
            onClose={() => {
              setEditing(null);
              load();
            }}
            onSave={onSave}
          />
        )}
      </div>
    );
  }

  // ===== 主视图 =====
  return (
    <div className="pt-2 space-y-5">
      {/* 信纸书写区 —— 奶白纯色底，仅浅绿横线，日期写在第一根横线上 */}
      <button
        onClick={startNew}
        className="block w-full text-left rounded-3xl px-6 pt-2 pb-5 transition active:scale-[0.99] overflow-hidden"
        style={{
          height: "32vh",
          minHeight: 200,
          backgroundColor: "oklch(0.945 0.045 145)",
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, oklch(0.70 0.07 145 / 0.35) 31px, oklch(0.70 0.07 145 / 0.35) 32px)",
          border: "1px solid oklch(0.82 0.050 145 / 0.45)",
          lineHeight: "32px",
        }}
      >
        <div className="text-foreground/60 text-[11px] tracking-wide leading-[32px] h-[32px]">
          {today}
        </div>
      </button>

      {/* 横向并排：琐碎记 / 日复盘 / 长复盘 */}
      <div className="grid grid-cols-3 gap-2 px-1">
        <HDropZone
          label="琐碎记"
          active={hoverCat === "sundry" && !!draggingId}
          onClick={() => setOpenCat("sundry")}
          onDragOver={(e) => {
            e.preventDefault();
            setHoverCat("sundry");
          }}
          onDragLeave={() => setHoverCat(null)}
          onDrop={() => draggingId && moveTo(draggingId, "sundry")}
        />
        <HDropZone
          label="日复盘"
          active={hoverCat === "day" && !!draggingId}
          onClick={() => setOpenCat("day")}
          onDragOver={(e) => {
            e.preventDefault();
            setHoverCat("day");
          }}
          onDragLeave={() => setHoverCat(null)}
          onDrop={() => draggingId && moveTo(draggingId, "day")}
        />
        {!longSplit ? (
          <HDropZone
            label="长复盘"
            active={hoverCat === "long" && !!draggingId}
            onClick={() => {
              setLongView("week");
              setOpenCat("long");
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverCat("long");
              if (draggingId) setLongSplit(true);
            }}
            onDragLeave={() => setHoverCat(null)}
          />
        ) : (
          <div className="grid grid-rows-2 gap-1.5">
            <HDropZone
              label="周"
              active={hoverCat === "week" && !!draggingId}
              compact
              onClick={() => {
                setLongView("week");
                setOpenCat("week");
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverCat("week");
              }}
              onDragLeave={() => setHoverCat(null)}
              onDrop={() => {
                if (draggingId) moveTo(draggingId, "week");
                setLongSplit(false);
              }}
            />
            <HDropZone
              label="月"
              active={hoverCat === "month" && !!draggingId}
              compact
              onClick={() => {
                setLongView("month");
                setOpenCat("month");
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverCat("month");
              }}
              onDragLeave={() => setHoverCat(null)}
              onDrop={() => {
                if (draggingId) moveTo(draggingId, "month");
                setLongSplit(false);
              }}
            />
          </div>
        )}
      </div>

      {/* 待定区域 —— 大留白拖拽区 */}
      <div className="px-1 min-h-[40vh]">
        <div className="px-1 pb-2 text-xs text-foreground/55">
          待定（拖动到上方分类）
        </div>
        {pending.length === 0 ? (
          <div
            className="rounded-3xl border border-dashed py-10 text-center text-xs text-foreground/40"
            style={{ borderColor: "oklch(0.80 0.04 145 / 0.40)" }}
          >
            暂无待定内容
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div
                key={r.id}
                draggable
                onDragStart={() => setDraggingId(r.id)}
                onDragEnd={() => {
                  setDraggingId(null);
                  setHoverCat(null);
                  setLongSplit(false);
                }}
                onClick={() => setEditing(r)}
                className={`rounded-2xl px-4 py-2.5 cursor-grab active:cursor-grabbing ${
                  draggingId === r.id ? "opacity-50" : ""
                }`}
                style={{
                  backgroundImage: "linear-gradient(160deg, oklch(0.968 0.018 145 / 0.80) 0%, oklch(0.948 0.035 145 / 0.80) 100%)",
                  border: "1px solid oklch(0.78 0.045 145 / 0.26)",
                  backdropFilter: "blur(6px)",
                  WebkitBackdropFilter: "blur(6px)",
                }}
              >
                <div className="flex justify-between text-xs text-foreground/55">
                  <span>{r.date}</span>
                </div>
                <div className="truncate text-sm">
                  {r.title || stripHtml(r.content).slice(0, 40) || "（空）"}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <ReviewEditor
          review={editing}
          onClose={() => {
            setEditing(null);
            load();
          }}
          onSave={onSave}
        />
      )}
    </div>
  );
}

function HDropZone({
  label,
  active,
  compact,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  active: boolean;
  compact?: boolean;
  onClick: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`btn-jade ${active ? "btn-jade-active" : ""} w-full rounded-2xl text-center transition ${
        compact ? "py-2 text-sm" : "py-5 text-base"
      }`}
    >
      {label}
    </button>
  );
}

function CardList({
  rows,
  onOpen,
  onRemove,
}: {
  rows: Review[];
  onOpen: (r: Review) => void;
  onRemove: (id: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <div className="mt-10 text-center text-foreground/50 text-sm">
        还没有记录
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r) => (
        <SwipeCard key={r.id} r={r} onOpen={onOpen} onRemove={onRemove} />
      ))}
    </div>
  );
}

function SwipeCard({
  r,
  onOpen,
  onRemove,
}: {
  r: Review;
  onOpen: (r: Review) => void;
  onRemove: (id: string) => void;
}) {
  const [armed, setArmed] = useState(false);
  const [dx, setDx] = useState(0);
  const startX = useRef<number | null>(null);
  const moved = useRef(false);
  const pressTimer = useRef<number | null>(null);

  const reset = () => {
    setArmed(false);
    setDx(0);
    startX.current = null;
    moved.current = false;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startX.current = e.clientX;
    moved.current = false;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => setArmed(true), 450);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (startX.current === null) return;
    const d = e.clientX - startX.current;
    if (Math.abs(d) > 4) moved.current = true;
    if (armed) setDx(d);
  };
  const onPointerUp = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    if (armed && Math.abs(dx) > 90) {
      onRemove(r.id);
      return;
    }
    if (!moved.current && !armed) {
      onOpen(r);
    }
    reset();
  };

  const trashOpacity = Math.min(1, Math.abs(dx) / 90);

  return (
    <div className="relative">
      {armed && (
        <div
          className="absolute inset-y-0 right-3 flex items-center pointer-events-none"
          style={{ opacity: 0.35 + trashOpacity * 0.65 }}
        >
          <span className="text-base">🗑️</span>
        </div>
      )}
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={reset}
        className="rounded-2xl px-4 py-2.5 cursor-pointer select-none touch-pan-y"
        style={{
          transform: `translateX(${dx}px)`,
          transition: dx === 0 ? "transform 0.2s ease" : undefined,
          backgroundImage:
            "linear-gradient(160deg, oklch(0.968 0.018 145 / 0.80) 0%, oklch(0.948 0.035 145 / 0.80) 100%)",
          border: armed
            ? "1px solid oklch(0.55 0.13 145 / 0.55)"
            : "1px solid oklch(0.78 0.045 145 / 0.26)",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
        }}
      >
        <div className="text-xs text-foreground/55">{r.date}</div>
        <div className="truncate text-sm">
          {r.title || stripHtml(r.content).slice(0, 40) || "（空）"}
        </div>
      </div>
    </div>
  );
}
