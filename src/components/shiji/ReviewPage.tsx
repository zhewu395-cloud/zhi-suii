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

const CAT_BUCKETS: { key: ReviewCategory; label: string }[] = [
  { key: "sundry", label: "琐碎记" },
  { key: "day", label: "日复盘" },
];

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
          <div className="flex gap-1">
            {(["week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => {
                  setLongView(v);
                  setOpenCat(v);
                }}
                className={`rounded-full px-3 py-1 text-xs ${
                  cat === v
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground/65"
                }`}
              >
                {v === "week" ? "周" : "月"}
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
      {/* 顶部日期下划线 */}
      <div className="px-1">
        <span className="leaf-underline text-base text-foreground/85">
          {today}
        </span>
      </div>

      {/* 1/3 圆角书写区 */}
      <button
        onClick={startNew}
        className="block w-full text-left rounded-3xl px-5 py-6 transition active:scale-[0.99]"
        style={{
          height: "33vh",
          minHeight: 200,
          background:
            "color-mix(in oklab, oklch(0.55 0.13 148) 12%, oklch(0.985 0.018 105))",
          border: "1px solid color-mix(in oklab, oklch(0.5 0.13 148) 25%, transparent)",
        }}
      >
        <div className="text-foreground/55">点击此处书写……</div>
      </button>

      {/* 4 个分类（无加号） */}
      <div className="px-1 space-y-3">
        {/* 琐碎记 / 日复盘 */}
        {CAT_BUCKETS.map((b) => (
          <DropZone
            key={b.key}
            label={b.label}
            active={hoverCat === b.key && !!draggingId}
            onClick={() => setOpenCat(b.key)}
            onDragOver={(e) => {
              e.preventDefault();
              setHoverCat(b.key);
            }}
            onDragLeave={() => setHoverCat(null)}
            onDrop={() => draggingId && moveTo(draggingId, b.key)}
          />
        ))}

        {/* 长复盘：拖入时分裂为周 / 月 */}
        {!longSplit ? (
          <DropZone
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
          <div className="grid grid-cols-2 gap-3">
            <DropZone
              label="周复盘"
              active={hoverCat === "week" && !!draggingId}
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
            <DropZone
              label="月复盘"
              active={hoverCat === "month" && !!draggingId}
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

      {/* 待定区域 */}
      {pending.length > 0 && (
        <div className="px-1">
          <div className="px-1 pb-2 text-xs text-foreground/55">
            待定（拖动到上方分类）
          </div>
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
                className={`glass rounded-2xl px-4 py-2.5 cursor-grab active:cursor-grabbing ${
                  draggingId === r.id ? "opacity-50" : ""
                }`}
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
        </div>
      )}

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

function DropZone({
  label,
  active,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  label: string;
  active: boolean;
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
      className={`w-full rounded-2xl px-5 py-4 text-left text-base transition ${
        active
          ? "bg-primary/10 border border-primary"
          : "glass border-transparent"
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
