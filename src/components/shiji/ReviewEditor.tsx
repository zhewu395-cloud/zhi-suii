import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Highlighter,
  Type as TypeIcon,
  Palette,
  Image as ImageIcon,
  Plus,
  Calendar as CalendarIcon,
  Minus,
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

type Panel = null | "size" | "color" | "font" | "link";

export function ReviewEditor({
  review,
  onClose,
  onSave,
  onOpenReview,
}: {
  review: Review;
  onClose: () => void;
  onSave: (r: Review) => void;
  onOpenReview?: (id: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const fontFileRef = useRef<HTMLInputElement>(null);
  const bgFileRef = useRef<HTMLInputElement>(null);

  const [draft, setDraft] = useState<Review>(review);

  // 工具栏面板
  const [panel, setPanel] = useState<Panel>(null);

  // 富文本样式状态
  const [fontSize, setFontSize] = useState(17);
  const [bgColor, setBgColor] = useState("oklch(0.99 0.005 145)");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("inherit");

  // 键盘联动：根据 visualViewport 算出键盘高度
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(
        0,
        window.innerHeight - vv.height - vv.offsetTop,
      );
      setKbOffset(offset);
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  const [linkMode, setLinkMode] = useState<"date" | "cat">("date");
  const [linkDate, setLinkDate] = useState<Date>(new Date());
  const [allReviews, setAllReviews] = useState<Review[]>([]);

  // 初始内容写入 contentEditable + 自动唤起键盘
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = review.content || "";
    }
    getAll<Review>("reviews").then(setAllReviews);
    // 自动聚焦正文，触发手机键盘
    const t = window.setTimeout(() => {
      editorRef.current?.focus();
      // 把光标放到末尾
      const el = editorRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(false);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }, 120);
    return () => window.clearTimeout(t);
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
  }, [draft, onSave]);

  // 保留选区，避免 toolbar 点击后丢失
  const savedRange = useRef<Range | null>(null);
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    const r = savedRange.current;
    if (!r) {
      editorRef.current?.focus();
      return;
    }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const exec = (cmd: string, val?: string) => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
  };

  // 自定义字号：包裹 span style="font-size: Xpx"
  const applyFontSize = (px: number) => {
    restoreSelection();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;
    const span = document.createElement("span");
    span.style.fontSize = `${px}px`;
    try {
      span.appendChild(range.extractContents());
      range.insertNode(span);
      sel.removeAllRanges();
      const r = document.createRange();
      r.selectNodeContents(span);
      sel.addRange(r);
      savedRange.current = r;
    } catch {
      /* ignore */
    }
  };

  const applyFontFamily = (family: string) => {
    restoreSelection();
    exec("fontName", family);
  };

  // 双击正文空白处收起键盘
  const lastTap = useRef(0);
  const onBodyTouch = (e: React.PointerEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      // 双击
      (document.activeElement as HTMLElement | null)?.blur();
      e.preventDefault();
    }
    lastTap.current = now;
  };

  const insertLink = (target: Review) => {
    restoreSelection();
    const a = document.createElement("a");
    a.href = `#review-${target.id}`;
    a.dataset.linkId = target.id;
    // 主题淡柳绿 + 无下划线，与正文明显区分
    a.style.color = "oklch(0.58 0.10 145)";
    a.style.textDecoration = "none";
    a.style.cursor = "pointer";
    a.textContent = `@${target.title?.trim() || target.date}`;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      sel.getRangeAt(0).insertNode(a);
    } else {
      editorRef.current?.appendChild(a);
    }
    const next = {
      ...draft,
      links: Array.from(new Set([...(draft.links ?? []), target.id])),
      content: editorRef.current?.innerHTML ?? draft.content,
    };
    setDraft(next);
    put("reviews", next);
    onSave(next);
    setPanel(null);
  };

  // 点击正文中的 @链接 跳转到目标复盘
  const onEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const a = target.closest<HTMLAnchorElement>("a[data-link-id]");
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.linkId;
    if (!id || !onOpenReview) return;
    // 先保存当前内容
    const html = editorRef.current?.innerHTML ?? "";
    const cur = { ...draft, content: html, updatedAt: Date.now() };
    put("reviews", cur).then(() => {
      onSave(cur);
      onOpenReview(id);
    });
  };

  const filteredLinkTargets =
    linkMode === "date"
      ? allReviews.filter(
          (r) => r.id !== review.id && r.date === ymd(linkDate),
        )
      : allReviews.filter((r) => r.id !== review.id);

  // 字体上传
  const onPickFont = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    const blob = new Blob([buf], { type: f.type || "font/ttf" });
    const url = URL.createObjectURL(blob);
    const fam = `user-font-${Date.now()}`;
    const ff = new FontFace(fam, `url(${url})`);
    await ff.load();
    (document as unknown as { fonts: FontFaceSet }).fonts.add(ff);
    setFontFamily(fam);
    applyFontFamily(fam);
    setPanel(null);
  };

  // 背景图片
  const onPickBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setBgImage(url);
  };

  const containerStyle: React.CSSProperties = bgImage
    ? {
        backgroundImage: `url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { background: bgColor };

  return (
    <div
      className="fixed inset-0 z-40 flex flex-col"
      style={containerStyle}
    >
      {/* 顶部：叶子 / 关闭 */}
      <header className="flex items-center justify-between px-3 pt-10 pb-1">
        <LeafBack onClick={onClose} />
      </header>

      {/* 标题 + 日期 */}
      <div className="px-5">
        <input
          ref={titleRef}
          value={draft.title ?? ""}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder="标题"
          className="w-full bg-transparent text-2xl font-medium outline-none py-1 placeholder:text-foreground/35"
          style={{ fontFamily }}
        />
        <div className="text-[11px] tracking-wide text-foreground/45 mt-0.5">
          {draft.date}
        </div>
      </div>

      {/* 正文 */}
      <div
        className="flex-1 overflow-y-auto px-5 pt-3"
        style={{ paddingBottom: `${kbOffset + 64}px` }}
        onPointerDown={onBodyTouch}
      >
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onTouchEnd={saveSelection}
          onClick={onEditorClick}
          className="min-h-[60vh] outline-none text-base leading-7 caret-[oklch(0.78_0.18_95)]"
          style={{ fontFamily, fontSize: `${fontSize}px` }}
        />
      </div>

      {/* 富文本工具栏 —— 吸附键盘 */}
      <div
        className="fixed left-0 right-0 z-50 transition-[bottom] duration-200 ease-out"
        style={{ bottom: `${kbOffset}px` }}
      >
        {/* 浮层面板 */}
        {panel === "size" && (
          <div
            className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-lg"
            style={{
              background: "oklch(0.99 0.006 145 / 0.96)",
              border: "1px solid oklch(0.82 0.05 145 / 0.5)",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                const v = Math.max(10, fontSize - 1);
                setFontSize(v);
                applyFontSize(v);
              }}
              className="grid h-7 w-7 place-items-center rounded-full bg-muted"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <input
              type="range"
              min={10}
              max={48}
              value={fontSize}
              onChange={(e) => {
                const v = Number(e.target.value);
                setFontSize(v);
                applyFontSize(v);
              }}
              className="flex-1 accent-[oklch(0.55_0.13_145)]"
            />
            <button
              onPointerDown={(e) => {
                e.preventDefault();
                const v = Math.min(48, fontSize + 1);
                setFontSize(v);
                applyFontSize(v);
              }}
              className="grid h-7 w-7 place-items-center rounded-full bg-muted"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <div className="w-12 text-right text-xs tabular-nums text-foreground/70">
              {fontSize}px
            </div>
          </div>
        )}

        {panel === "color" && (
          <div
            className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-3 shadow-lg"
            style={{
              background: "oklch(0.99 0.006 145 / 0.96)",
              border: "1px solid oklch(0.82 0.05 145 / 0.5)",
            }}
          >
            <label className="flex items-center gap-2 text-xs">
              <span>背景色</span>
              <input
                type="color"
                onChange={(e) => {
                  setBgImage(null);
                  setBgColor(e.target.value);
                }}
                className="h-7 w-9 rounded"
              />
            </label>
            <label className="flex items-center gap-2 text-xs">
              <span>文字色</span>
              <input
                type="color"
                onChange={(e) => exec("foreColor", e.target.value)}
                className="h-7 w-9 rounded"
              />
            </label>
            <button
              onClick={() => bgFileRef.current?.click()}
              className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs"
            >
              <ImageIcon className="h-3.5 w-3.5" /> 背景图
            </button>
            <input
              ref={bgFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPickBg}
            />
          </div>
        )}

        {panel === "font" && (
          <div
            className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-lg"
            style={{
              background: "oklch(0.99 0.006 145 / 0.96)",
              border: "1px solid oklch(0.82 0.05 145 / 0.5)",
            }}
          >
            <div className="text-xs text-foreground/70">字体</div>
            {["inherit", "serif", "ui-serif", "ui-monospace"].map((f) => (
              <button
                key={f}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setFontFamily(f);
                  applyFontFamily(f);
                }}
                className={`rounded-full px-2.5 py-1 text-xs ${
                  fontFamily === f ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}
                style={{ fontFamily: f }}
              >
                Aa
              </button>
            ))}
            <button
              onClick={() => fontFileRef.current?.click()}
              className="ml-auto rounded-full bg-muted px-3 py-1 text-xs"
            >
              导入本地…
            </button>
            <input
              ref={fontFileRef}
              type="file"
              accept=".ttf,.otf,font/*"
              className="hidden"
              onChange={onPickFont}
            />
          </div>
        )}

        {panel === "link" && (
          <div
            className="mx-3 mb-1 rounded-2xl p-3 shadow-lg max-h-[40vh] overflow-y-auto"
            style={{
              background: "oklch(0.99 0.006 145 / 0.98)",
              border: "1px solid oklch(0.82 0.05 145 / 0.5)",
            }}
          >
            <div className="mb-2 flex items-center gap-2">
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
            <div className="space-y-1">
              {filteredLinkTargets.length === 0 && (
                <div className="text-center text-xs text-foreground/50 py-4">
                  没有可链接的记录
                </div>
              )}
              {filteredLinkTargets.map((r) => (
                <button
                  key={r.id}
                  onClick={() => insertLink(r)}
                  className="w-full text-left rounded-xl bg-muted/60 px-3 py-2 active:bg-muted"
                >
                  <div className="flex justify-between text-[11px] text-foreground/60">
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
        )}

        {/* 工具栏主体 */}
        <div
          className="flex items-center justify-around px-2 py-2 border-t"
          style={{
            borderColor: "oklch(0.85 0.04 145 / 0.5)",
            backgroundImage:
              "linear-gradient(180deg, oklch(0.995 0.008 145) 0%, oklch(0.965 0.030 145) 100%)",
            boxShadow: "0 -4px 14px -10px oklch(0.55 0.07 145 / 0.35)",
            paddingBottom: kbOffset > 0 ? "8px" : "max(8px, env(safe-area-inset-bottom))",
          }}
          onPointerDown={(e) => {
            // 防止点击工具栏让 contentEditable 失焦
            e.preventDefault();
          }}
        >
          <ToolBtn onClick={() => exec("bold")} label="B">
            <Bold className="h-4.5 w-4.5" />
          </ToolBtn>
          <ToolBtn onClick={() => exec("italic")} label="I">
            <Italic className="h-4.5 w-4.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => exec("hiliteColor", "#fde68a")}
            label="H"
          >
            <Highlighter className="h-4.5 w-4.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => setPanel(panel === "size" ? null : "size")}
            label="A"
            active={panel === "size"}
          >
            <span className="text-base font-semibold">A</span>
          </ToolBtn>
          <ToolBtn
            onClick={() => setPanel(panel === "font" ? null : "font")}
            label="字体"
            active={panel === "font"}
          >
            <TypeIcon className="h-4.5 w-4.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => setPanel(panel === "color" ? null : "color")}
            label="调色"
            active={panel === "color"}
          >
            <Palette className="h-4.5 w-4.5" />
          </ToolBtn>
          <ToolBtn
            onClick={() => setPanel(panel === "link" ? null : "link")}
            label="链接"
            active={panel === "link"}
          >
            <Plus className="h-5 w-5" />
          </ToolBtn>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  onClick,
  children,
  label,
  active,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        // 阻止默认让编辑器保持焦点
        e.preventDefault();
        onClick();
      }}
      className={`grid h-9 w-9 place-items-center rounded-xl transition ${
        active
          ? "bg-primary/15 text-[oklch(0.40_0.12_145)]"
          : "text-foreground/75 active:bg-muted"
      }`}
    >
      {children}
    </button>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").trim();
}
