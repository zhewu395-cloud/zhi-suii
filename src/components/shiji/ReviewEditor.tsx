import { useEffect, useRef, useState } from "react";
import {
  Bold,
  List,
  Type,
  Palette,
  Plus,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { LeafBack } from "./LeafBack";
import { put, getAll, type Review, type ReviewCategory } from "@/lib/db";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const ymd = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const CAT_LABEL: Record<ReviewCategory, string> = {
  pending: "待定",
  sundry: "琐碎记",
  day: "日复盘",
  week: "周复盘",
  month: "月复盘",
};

export function ReviewEditor({
  review,
  onClose,
  onSave,
}: {
  review: Review;
  onClose: () => void;
  onSave: (r: Review) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Review>(review);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkMode, setLinkMode] = useState<"date" | "cat">("date");
  const [linkDate, setLinkDate] = useState<Date>(new Date());
  const [allReviews, setAllReviews] = useState<Review[]>([]);

  // 初始内容写入 contentEditable
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = review.content || "";
    }
    getAll<Review>("reviews").then(setAllReviews);
  }, [review.id]);

  // 自动保存
  useEffect(() => {
    const t = window.setInterval(async () => {
      const html = editorRef.current?.innerHTML ?? "";
      if (html !== draft.content) {
        const next = { ...draft, content: html, updatedAt: Date.now() };
        setDraft(next);
        await put("reviews", next);
        onSave(next);
      }
    }, 1500);
    return () => clearInterval(t);
  }, [draft]);

  const exec = (cmd: string, val?: string) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  };

  const insertLink = (target: Review) => {
    const a = document.createElement("a");
    a.href = `#review-${target.id}`;
    a.dataset.linkId = target.id;
    a.className = "text-primary underline";
    a.textContent = `🔗 ${target.title || target.date}（${CAT_LABEL[target.category]}）`;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      sel.getRangeAt(0).insertNode(a);
    } else {
      editorRef.current?.appendChild(a);
    }
    // 同步 links
    const next = {
      ...draft,
      links: Array.from(new Set([...(draft.links ?? []), target.id])),
      content: editorRef.current?.innerHTML ?? draft.content,
    };
    setDraft(next);
    put("reviews", next);
    onSave(next);
    setLinkOpen(false);
  };

  const filteredLinkTargets =
    linkMode === "date"
      ? allReviews.filter(
          (r) => r.id !== review.id && r.date === ymd(linkDate),
        )
      : allReviews.filter((r) => r.id !== review.id);

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={{ backgroundColor: "#F2EEE2" }}
    >
      <header className="flex items-center justify-between px-3 pt-10 pb-2">
        <LeafBack onClick={onClose} />
        <button
          onClick={() => setLinkOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full glass text-primary"
          aria-label="链接"
        >
          <Plus className="h-5 w-5" />
        </button>
      </header>

      <div className="px-4">
        <input
          value={draft.title ?? ""}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="标题"
          className="w-full bg-transparent text-xl font-medium outline-none py-2"
        />
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-1 px-3 py-2 border-y border-border/60 bg-background/40">
        <ToolBtn onClick={() => exec("bold")}>
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn onClick={() => exec("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </ToolBtn>
        <select
          onChange={(e) => exec("fontSize", e.target.value)}
          defaultValue="3"
          className="rounded-md bg-muted/50 px-2 py-1 text-xs"
        >
          <option value="2">小</option>
          <option value="3">中</option>
          <option value="5">大</option>
          <option value="7">特大</option>
        </select>
        <label className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted/60 cursor-pointer">
          <Palette className="h-4 w-4" />
          <input
            type="color"
            className="hidden"
            onChange={(e) => exec("foreColor", e.target.value)}
          />
        </label>
        <ToolBtn onClick={() => exec("italic")}>
          <Type className="h-4 w-4" />
        </ToolBtn>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="text-xs text-foreground/55 mb-2">{draft.date}</div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="outline-none text-base leading-7"
          style={{ fontFamily: "inherit" }}
        />
      </div>


      {linkOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/35 px-5"
          onClick={() => setLinkOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-base font-medium">链接过去复盘</div>
              <button
                onClick={() => setLinkOpen(false)}
                className="grid h-7 w-7 place-items-center rounded-full bg-muted"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mb-3 flex gap-2">
              {(["date", "cat"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setLinkMode(m)}
                  className={`rounded-full px-3 py-1 text-xs ${
                    linkMode === m
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground/65"
                  }`}
                >
                  {m === "date" ? "按日期" : "按分类"}
                </button>
              ))}
              {linkMode === "date" && (
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="ml-auto flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {ymd(linkDate)}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="single"
                      selected={linkDate}
                      onSelect={(d) => d && setLinkDate(d)}
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1">
              {filteredLinkTargets.length === 0 && (
                <div className="text-center text-sm text-foreground/50 py-6">
                  没有可链接的记录
                </div>
              )}
              {filteredLinkTargets.map((r) => (
                <button
                  key={r.id}
                  onClick={() => insertLink(r)}
                  className="w-full text-left rounded-xl bg-muted/50 px-3 py-2 hover:bg-muted"
                >
                  <div className="flex justify-between text-xs text-foreground/60">
                    <span>{CAT_LABEL[r.category]}</span>
                    <span>{r.date}</span>
                  </div>
                  <div className="text-sm truncate">
                    {r.title || stripHtml(r.content) || "（空）"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ToolBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="grid h-7 w-7 place-items-center rounded-md hover:bg-muted/60"
    >
      {children}
    </button>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").trim();
}
