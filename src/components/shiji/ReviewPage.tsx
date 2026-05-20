import { useEffect, useMemo, useState } from "react";
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
        <div className="flex items-center justify-between">
          <LeafBack onClick={() => setOpenCat(null)} />
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
        <div className="mt-4 px-1 text-base font-medium leaf-underline">
          {cat === "week" ? "周复盘" : "月复盘"}
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
    const label = openCat === "sundry" ? "琐碎记" : "日复盘";
    return (
      <div className="pt-2">
        <LeafBack onClick={() => setOpenCat(null)} />
        <div className="mt-4 px-1 text-base font-medium leaf-underline">
          {label}
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

  // ===== 主视图 =====
  return (
    <div className="pt-2 space-y-5">
      {/* 信纸书写区 —— 奶白纯色底，仅浅绿横线，日期写在第一根横线上 */}
      <button
        onClick={startNew}
        className="block w-full text-left rounded-3xl px-6 pt-3 pb-5 transition active:scale-[0.99] overflow-hidden"
        style={{
          height: "32vh",
          minHeight: 200,
          backgroundColor: "#FBFAF4",
          backgroundImage:
            "repeating-linear-gradient(to bottom, transparent 0px, transparent 31px, oklch(0.82 0.06 142 / 0.42) 31px, oklch(0.82 0.06 142 / 0.42) 32px)",
          border: "1px solid oklch(0.85 0.03 130 / 0.30)",
          lineHeight: "32px",
        }}
      >
        <div className="text-foreground/55 text-[11px] tracking-wide leading-[32px]">
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
            style={{ borderColor: "oklch(0.80 0.04 130 / 0.40)" }}
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
                  backgroundImage: "linear-gradient(160deg, oklch(0.968 0.018 130 / 0.80) 0%, oklch(0.948 0.035 140 / 0.80) 100%)",
                  border: "1px solid oklch(0.78 0.045 138 / 0.26)",
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
        <div
          key={r.id}
          onClick={() => onOpen(r)}
          className="rounded-2xl px-4 py-3 cursor-pointer"
          style={{
            background:
              "color-mix(in oklab, oklch(0.55 0.13 148) 10%, oklch(0.985 0.018 105))",
            border:
              "1px solid color-mix(in oklab, oklch(0.5 0.13 148) 18%, transparent)",
          }}
        >
          <div className="flex items-center justify-between text-xs text-foreground/55">
            <span>{r.date}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRemove(r.id);
              }}
              className="text-foreground/40"
            >
              删除
            </button>
          </div>
          <div className="text-sm font-medium truncate">
            {r.title || "未命名"}
          </div>
          <div
            className="text-xs text-foreground/65 truncate"
            style={{ display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical", overflow: "hidden" }}
          >
            {stripHtml(r.content) || "—"}
          </div>
        </div>
      ))}
    </div>
  );
}
