import { useEffect, useRef, useState, useCallback } from "react";
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
  Search,
  Maximize2,
  Minimize2,
  ChevronLeft,
  Heading,
  Undo2,
  Redo2,
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

type Panel = null | "size" | "color" | "font" | "link" | "highlight" | "heading";

const HL_PRESETS = [
  "#fde68a", // 暖黄
  "#bbf7d0", // 嫩绿
  "#bae6fd", // 浅蓝
  "#fecaca", // 浅粉
  "#e9d5ff", // 浅紫
  "#fed7aa", // 浅橙
];

const HL_FAV_KEY = "shiji.hl.favorites.v1";
const HL_CUR_KEY = "shiji.hl.current.v1";

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

  const [panel, setPanel] = useState<Panel>(null);
  const [linkClosing, setLinkClosing] = useState(false);

  // 富文本样式状态
  const [fontSize, setFontSize] = useState(17);
  const [bgColor, setBgColor] = useState("oklch(0.99 0.005 145)");
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [fontFamily, setFontFamily] = useState<string>("inherit");

  // 高亮颜色记忆
  const [hlColor, setHlColor] = useState<string>(() => {
    try { return localStorage.getItem(HL_CUR_KEY) || "#fde68a"; } catch { return "#fde68a"; }
  });
  const [hlFavs, setHlFavs] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(HL_FAV_KEY) || "[]"); } catch { return []; }
  });

  // 工具栏激活状态：根据当前选区动态计算
  const [fmt, setFmt] = useState({
    bold: false,
    italic: false,
    highlight: false,
    block: "" as "" | "H1" | "H2" | "H3" | "OL",
  });

  // Undo/Redo 可用性
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // 键盘联动
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
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

  const [linkMode, setLinkMode] = useState<"date" | "cat" | "keyword">("date");
  const [linkDate, setLinkDate] = useState<Date>(new Date());
  const [allReviews, setAllReviews] = useState<Review[]>([]);
  const [linkCat, setLinkCat] = useState<"sundry" | "day" | "long" | null>(null);
  const [linkKeyword, setLinkKeyword] = useState("");
  const [linkFull, setLinkFull] = useState(false);
  const [linkPreview, setLinkPreview] = useState<Review | null>(null);

  // 初始内容写入 contentEditable + 自动唤起键盘
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      editorRef.current.innerHTML = review.content || "";
    }
    getAll<Review>("reviews").then(setAllReviews);
    const t = window.setTimeout(() => {
      editorRef.current?.focus();
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

  // 选区 / 格式状态侦测
  const detectFormat = useCallback(() => {
    if (!editorRef.current) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const node = sel.anchorNode;
    if (!node || !editorRef.current.contains(node)) return;
    try {
      const bold = document.queryCommandState("bold");
      const italic = document.queryCommandState("italic");
      // highlight：往上找带 background-color 的祖先
      let highlight = false;
      let cur: Node | null = node;
      while (cur && cur !== editorRef.current) {
        if (cur.nodeType === 1) {
          const el = cur as HTMLElement;
          const bg = el.style.backgroundColor;
          if (bg && bg !== "transparent" && bg !== "rgba(0, 0, 0, 0)") {
            highlight = true;
            break;
          }
        }
        cur = cur.parentNode;
      }
      // block 类型
      let block: typeof fmt.block = "";
      let p: Node | null = node;
      while (p && p !== editorRef.current) {
        if (p.nodeType === 1) {
          const tag = (p as HTMLElement).tagName;
          if (tag === "H1" || tag === "H2" || tag === "H3") { block = tag as typeof block; break; }
          if (tag === "OL") { block = "OL"; break; }
        }
        p = p.parentNode;
      }
      setFmt({ bold, italic, highlight, block });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const h = () => detectFormat();
    document.addEventListener("selectionchange", h);
    return () => document.removeEventListener("selectionchange", h);
  }, [detectFormat]);

  // 选区保留
  const savedRange = useRef<Range | null>(null);
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange();
    }
  };
  const restoreSelection = () => {
    const r = savedRange.current;
    if (!r) { editorRef.current?.focus(); return; }
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(r);
  };

  const exec = (cmd: string, val?: string) => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, val);
    detectFormat();
    refreshUndoRedo();
  };

  const refreshUndoRedo = () => {
    try {
      setCanUndo(document.queryCommandEnabled("undo"));
      setCanRedo(document.queryCommandEnabled("redo"));
    } catch { /* ignore */ }
  };

  // 高亮：toggle
  const toggleHighlight = (color?: string) => {
    restoreSelection();
    const c = color || hlColor;
    if (fmt.highlight && !color) {
      // 移除：透明
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("hiliteColor", false, "transparent");
    } else {
      document.execCommand("styleWithCSS", false, "true");
      document.execCommand("hiliteColor", false, c);
      setHlColor(c);
      try { localStorage.setItem(HL_CUR_KEY, c); } catch { /* */ }
    }
    detectFormat();
    refreshUndoRedo();
  };

  // 块级（H1/H2/H3/OL）：toggle
  const applyBlock = (kind: "H1" | "H2" | "H3" | "OL") => {
    restoreSelection();
    document.execCommand("styleWithCSS", false, "true");
    if (kind === "OL") {
      if (fmt.block === "OL") {
        document.execCommand("insertOrderedList");
      } else {
        document.execCommand("insertOrderedList");
        // 给最近 OL 加 lower-alpha 列表样式
        const sel = window.getSelection();
        let n: Node | null = sel?.anchorNode ?? null;
        while (n && n !== editorRef.current) {
          if (n.nodeType === 1 && (n as HTMLElement).tagName === "OL") {
            (n as HTMLElement).style.listStyleType = "lower-alpha";
            (n as HTMLElement).style.paddingLeft = "1.5em";
            break;
          }
          n = n.parentNode;
        }
      }
    } else {
      if (fmt.block === kind) {
        document.execCommand("formatBlock", false, "P");
      } else {
        document.execCommand("formatBlock", false, kind);
      }
    }
    detectFormat();
    refreshUndoRedo();
  };

  const addFav = (c: string) => {
    setHlFavs((prev) => {
      if (prev.includes(c)) return prev;
      const next = [c, ...prev].slice(0, 6);
      try { localStorage.setItem(HL_FAV_KEY, JSON.stringify(next)); } catch { /* */ }
      return next;
    });
  };

  // 自定义字号
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
    } catch { /* ignore */ }
  };

  const applyFontFamily = (family: string) => {
    restoreSelection();
    exec("fontName", family);
  };

  const lastTap = useRef(0);
  const onBodyTouch = (e: React.PointerEvent) => {
    const now = Date.now();
    if (now - lastTap.current < 320) {
      (document.activeElement as HTMLElement | null)?.blur();
      e.preventDefault();
    }
    lastTap.current = now;
  };

  const onEditorInput = () => {
    refreshUndoRedo();
    detectFormat();
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const r = sel.getRangeAt(0).cloneRange();
    r.collapse(false);
    let rect = r.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      const node = sel.anchorNode?.nodeType === 1
        ? (sel.anchorNode as HTMLElement)
        : sel.anchorNode?.parentElement;
      if (node) rect = node.getBoundingClientRect();
    }
    const safeBottom = window.innerHeight - kbOffset - 56 - 24;
    if (rect.bottom > safeBottom) {
      const container = editorRef.current?.parentElement;
      container?.scrollBy({ top: rect.bottom - safeBottom, behavior: "smooth" });
    }
  };

  const insertLink = (target: Review) => {
    restoreSelection();
    const a = document.createElement("a");
    a.href = `#review-${target.id}`;
    a.dataset.linkId = target.id;
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
    closeLinkPanel();
  };

  const closeLinkPanel = () => {
    setLinkClosing(true);
    window.setTimeout(() => {
      setPanel(null);
      setLinkClosing(false);
      setLinkFull(false);
    }, 240);
  };

  const onEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const a = target.closest<HTMLAnchorElement>("a[data-link-id]");
    if (!a) return;
    e.preventDefault();
    const id = a.dataset.linkId;
    if (!id || !onOpenReview) return;
    const html = editorRef.current?.innerHTML ?? "";
    const cur = { ...draft, content: html, updatedAt: Date.now() };
    put("reviews", cur).then(() => { onSave(cur); onOpenReview(id); });
  };

  const filteredLinkTargets = (() => {
    const base = allReviews.filter((r) => r.id !== review.id);
    if (linkMode === "date") return base.filter((r) => r.date === ymd(linkDate));
    if (linkMode === "cat") {
      if (!linkCat) return [];
      if (linkCat === "long") return base.filter((r) => r.category === "week" || r.category === "month");
      return base.filter((r) => r.category === linkCat);
    }
    const kw = linkKeyword.trim().toLowerCase();
    if (!kw) return [];
    return base.filter(
      (r) =>
        (r.title ?? "").toLowerCase().includes(kw) ||
        stripHtml(r.content).toLowerCase().includes(kw),
    );
  })();

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

  const onPickBg = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setBgImage(url);
  };

  const containerStyle: React.CSSProperties = bgImage
    ? { backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: bgColor };

  // 历史控制
  const doUndo = () => { restoreSelection(); document.execCommand("undo"); refreshUndoRedo(); detectFormat(); };
  const doRedo = () => { restoreSelection(); document.execCommand("redo"); refreshUndoRedo(); detectFormat(); };

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={containerStyle}>
      {/* 顶部：叶子返回 + 历史控制 */}
      <header className="flex items-center justify-between px-3 pt-10 pb-1">
        <LeafBack onClick={onClose} />
        <div className="flex items-center gap-1">
          <HistoryArrow dir="undo" disabled={!canUndo} onClick={doUndo} />
          <HistoryArrow dir="redo" disabled={!canRedo} onClick={doRedo} />
        </div>
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
        style={{ paddingBottom: `${kbOffset + 96}px`, scrollPaddingBottom: `${kbOffset + 96}px` }}
        onPointerDown={onBodyTouch}
      >
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onMouseUp={() => { saveSelection(); detectFormat(); }}
          onKeyUp={() => { saveSelection(); onEditorInput(); }}
          onInput={onEditorInput}
          onTouchEnd={() => { saveSelection(); detectFormat(); }}
          onClick={onEditorClick}
          className="min-h-[60vh] outline-none text-base leading-7 caret-[oklch(0.78_0.18_95)] review-editor"
          style={{ fontFamily, fontSize: `${fontSize}px` }}
        />
      </div>

      {/* 富文本工具栏 */}
      <div
        className="fixed left-0 right-0 z-50 transition-[bottom] duration-200 ease-out"
        style={{ bottom: `${kbOffset}px` }}
      >
        {/* 字号面板 */}
        {panel === "size" && (
          <div className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-lg"
            style={{ background: "oklch(0.99 0.006 145 / 0.96)", border: "1px solid oklch(0.82 0.05 145 / 0.5)" }}>
            <button onPointerDown={(e) => { e.preventDefault(); const v = Math.max(10, fontSize - 1); setFontSize(v); applyFontSize(v); }}
              className="grid h-7 w-7 place-items-center rounded-full bg-muted"><Minus className="h-3.5 w-3.5" /></button>
            <input type="range" min={10} max={48} value={fontSize}
              onChange={(e) => { const v = Number(e.target.value); setFontSize(v); applyFontSize(v); }}
              className="flex-1 accent-[oklch(0.55_0.13_145)]" />
            <button onPointerDown={(e) => { e.preventDefault(); const v = Math.min(48, fontSize + 1); setFontSize(v); applyFontSize(v); }}
              className="grid h-7 w-7 place-items-center rounded-full bg-muted"><Plus className="h-3.5 w-3.5" /></button>
            <div className="w-12 text-right text-xs tabular-nums text-foreground/70">{fontSize}px</div>
          </div>
        )}

        {/* 调色 */}
        {panel === "color" && (
          <div className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-3 shadow-lg"
            style={{ background: "oklch(0.99 0.006 145 / 0.96)", border: "1px solid oklch(0.82 0.05 145 / 0.5)" }}>
            <label className="flex items-center gap-2 text-xs"><span>背景色</span>
              <input type="color" onChange={(e) => { setBgImage(null); setBgColor(e.target.value); }} className="h-7 w-9 rounded" />
            </label>
            <label className="flex items-center gap-2 text-xs"><span>文字色</span>
              <input type="color" onChange={(e) => exec("foreColor", e.target.value)} className="h-7 w-9 rounded" />
            </label>
            <button onClick={() => bgFileRef.current?.click()} className="ml-auto inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
              <ImageIcon className="h-3.5 w-3.5" /> 背景图
            </button>
            <input ref={bgFileRef} type="file" accept="image/*" className="hidden" onChange={onPickBg} />
          </div>
        )}

        {/* 字体 */}
        {panel === "font" && (
          <div className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-lg"
            style={{ background: "oklch(0.99 0.006 145 / 0.96)", border: "1px solid oklch(0.82 0.05 145 / 0.5)" }}>
            <div className="text-xs text-foreground/70">字体</div>
            {["inherit", "serif", "ui-serif", "ui-monospace"].map((f) => (
              <button key={f} onPointerDown={(e) => { e.preventDefault(); setFontFamily(f); applyFontFamily(f); }}
                className={`rounded-full px-2.5 py-1 text-xs ${fontFamily === f ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                style={{ fontFamily: f }}>Aa</button>
            ))}
            <button onClick={() => fontFileRef.current?.click()} className="ml-auto rounded-full bg-muted px-3 py-1 text-xs">导入本地…</button>
            <input ref={fontFileRef} type="file" accept=".ttf,.otf,font/*" className="hidden" onChange={onPickFont} />
          </div>
        )}

        {/* 高亮调色 */}
        {panel === "highlight" && (
          <div className="mx-3 mb-1 rounded-2xl px-3 py-2.5 shadow-lg"
            style={{ background: "oklch(0.99 0.006 145 / 0.96)", border: "1px solid oklch(0.82 0.05 145 / 0.5)" }}>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-foreground/70">标亮</span>
              {HL_PRESETS.map((c) => (
                <button key={c}
                  onPointerDown={(e) => { e.preventDefault(); toggleHighlight(c); addFav(c); }}
                  className="h-6 w-6 rounded-full border border-foreground/15"
                  style={{ background: c }} aria-label={c} />
              ))}
              <label className="ml-1 inline-flex items-center gap-1 text-xs">
                <input type="color" value={hlColor}
                  onChange={(e) => { toggleHighlight(e.target.value); addFav(e.target.value); }}
                  className="h-6 w-7 rounded" />
              </label>
              <button onPointerDown={(e) => { e.preventDefault(); toggleHighlight(); }}
                className="ml-auto rounded-full bg-muted px-2.5 py-1 text-[11px]">清除</button>
            </div>
            {hlFavs.length > 0 && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-[11px] text-foreground/55">常用</span>
                {hlFavs.map((c) => (
                  <button key={c}
                    onPointerDown={(e) => { e.preventDefault(); toggleHighlight(c); }}
                    className="h-5 w-5 rounded-full border border-foreground/15"
                    style={{ background: c }} aria-label={c} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 标题与列表 */}
        {panel === "heading" && (
          <div className="mx-3 mb-1 rounded-2xl px-3 py-2.5 flex items-center gap-2 shadow-lg"
            style={{ background: "oklch(0.99 0.006 145 / 0.96)", border: "1px solid oklch(0.82 0.05 145 / 0.5)" }}>
            {(["H1", "H2", "H3"] as const).map((h) => (
              <button key={h} onPointerDown={(e) => { e.preventDefault(); applyBlock(h); }}
                className={`relative grid h-9 min-w-10 place-items-center rounded-xl px-3 text-sm font-semibold transition`}>
                {fmt.block === h && <span className="absolute inset-0 m-auto h-8 w-8 rounded-full bg-[oklch(0.78_0.10_145/0.45)]" />}
                <span className="relative">{h}</span>
              </button>
            ))}
            <button onPointerDown={(e) => { e.preventDefault(); applyBlock("OL"); }}
              className={`relative grid h-9 min-w-12 place-items-center rounded-xl px-3 text-xs transition`}>
              {fmt.block === "OL" && <span className="absolute inset-0 m-auto h-8 w-10 rounded-full bg-[oklch(0.78_0.10_145/0.45)]" />}
              <span className="relative">a.b.c</span>
            </button>
          </div>
        )}

        {/* 链接面板 —— 滑入 / 滑出 */}
        {panel === "link" && (
          <div
            className={cn(
              linkFull
                ? "fixed inset-0 z-[60] p-3 flex flex-col"
                : "mx-3 mb-1 rounded-2xl p-3 shadow-lg flex flex-col",
              linkClosing ? "animate-[linkSlideDown_0.24s_ease-in_forwards]" : "animate-[linkSlideUp_0.22s_ease-out]",
            )}
            style={{
              background: "oklch(0.99 0.006 145 / 0.98)",
              border: linkFull ? "none" : "1px solid oklch(0.82 0.05 145 / 0.5)",
              height: linkFull ? "100dvh" : "72vh",
            }}
          >
            {/* 右上角 绿色关闭叉 */}
            <button
              onPointerDown={(e) => { e.preventDefault(); closeLinkPanel(); }}
              aria-label="关闭"
              className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full active:scale-90 transition"
              style={{ color: "oklch(0.55 0.13 145)" }}
            >
              <X className="h-4 w-4" strokeWidth={2.2} />
            </button>

            {linkPreview ? (
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 mb-2 pr-9">
                  <button onClick={() => setLinkPreview(null)}
                    className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                    <ChevronLeft className="h-3.5 w-3.5" /> 返回
                  </button>
                  <div className="text-xs text-foreground/55">
                    {CAT_LABEL[linkPreview.category]} · {linkPreview.date}
                  </div>
                  <button
                    onClick={() => { insertLink(linkPreview); setLinkPreview(null); }}
                    className="ml-auto rounded-full bg-primary px-4 py-1.5 text-xs text-primary-foreground font-medium"
                  >添加</button>
                </div>
                <div className="text-lg font-medium mb-1.5">{linkPreview.title || "（无标题）"}</div>
                <div className="text-sm leading-7 text-foreground/85 overflow-y-auto"
                  style={{ maxHeight: linkFull ? "calc(100dvh - 120px)" : "32vh" }}
                  dangerouslySetInnerHTML={{ __html: linkPreview.content || "<i>（空）</i>" }} />
              </div>
            ) : (
              <>
                <div className="mb-2 flex items-center gap-2 flex-wrap pr-9">
                  {(["date", "cat", "keyword"] as const).map((m) => (
                    <button key={m} onClick={() => setLinkMode(m)}
                      className={`rounded-full px-3 py-1 text-xs ${linkMode === m ? "bg-primary text-primary-foreground" : "bg-muted text-foreground/65"}`}>
                      {m === "date" ? "按日期" : m === "cat" ? "按分类" : "关键字"}
                    </button>
                  ))}
                  {linkMode === "date" && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs">
                          <CalendarIcon className="h-3.5 w-3.5" />{ymd(linkDate)}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="end">
                        <Calendar mode="single" selected={linkDate} onSelect={(d) => d && setLinkDate(d)} className={cn("p-3 pointer-events-auto")} />
                      </PopoverContent>
                    </Popover>
                  )}
                  <button onClick={() => setLinkFull((v) => !v)} aria-label="全屏"
                    className="ml-auto grid h-7 w-7 place-items-center rounded-full bg-muted">
                    {linkFull ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                  </button>
                </div>

                {linkMode === "cat" && (
                  <div className="mb-2 flex items-center gap-2">
                    {([["sundry", "琐碎记"], ["day", "日复盘"], ["long", "长复盘"]] as const).map(([k, l]) => (
                      <button key={k} onClick={() => setLinkCat(k)}
                        className={`rounded-full px-3 py-1 text-[11px] ${linkCat === k ? "bg-primary/85 text-primary-foreground" : "bg-muted/70 text-foreground/65"}`}>
                        {l}
                      </button>
                    ))}
                  </div>
                )}

                {linkMode === "keyword" && (
                  <div className="mb-2 flex items-center gap-2 rounded-full bg-muted px-3 h-8">
                    <Search className="h-3.5 w-3.5 text-foreground/55 shrink-0" />
                    <input autoFocus type="text" value={linkKeyword}
                      onChange={(e) => setLinkKeyword(e.target.value)}
                      placeholder="搜索标题或正文…"
                      autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
                      name="link-search-noautofill"
                      className="flex-1 min-w-0 bg-transparent text-xs leading-none text-foreground placeholder:text-foreground/45 outline-none border-0 p-0 m-0 h-8"
                      style={{ lineHeight: "2rem" }} />
                    {linkKeyword && (
                      <button onClick={() => setLinkKeyword("")} className="text-foreground/45 text-xs shrink-0">清除</button>
                    )}
                  </div>
                )}

                <div className="space-y-1 flex-1 min-h-0 pr-1"
                  style={{ overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain", touchAction: "pan-y" }}>
                  {filteredLinkTargets.length === 0 && (
                    <div className="text-center text-xs text-foreground/50 py-4">
                      {linkMode === "keyword" && !linkKeyword.trim() ? "请输入关键字"
                        : linkMode === "cat" && !linkCat ? "请选择小分类" : "没有匹配的记录"}
                    </div>
                  )}
                  {filteredLinkTargets.map((r) => (
                    <button key={r.id} onClick={() => setLinkPreview(r)}
                      className="w-full text-left rounded-xl bg-muted/60 px-3 py-2 active:bg-muted">
                      <div className="flex justify-between text-[11px] text-foreground/60">
                        <span>{CAT_LABEL[r.category]}</span><span>{r.date}</span>
                      </div>
                      <div className="text-sm truncate">{r.title || stripHtml(r.content) || "（空）"}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* 工具栏主体 */}
        <div
          className="flex items-center justify-around px-1.5 py-2 border-t gap-0.5"
          style={{
            borderColor: "oklch(0.85 0.04 145 / 0.5)",
            backgroundImage: "linear-gradient(180deg, oklch(0.995 0.008 145) 0%, oklch(0.965 0.030 145) 100%)",
            boxShadow: "0 -4px 14px -10px oklch(0.55 0.07 145 / 0.35)",
            paddingBottom: kbOffset > 0 ? "8px" : "max(8px, env(safe-area-inset-bottom))",
          }}
          onPointerDown={(e) => { e.preventDefault(); }}
        >
          <ToolBtn onClick={() => exec("bold")} label="B" active={fmt.bold}><Bold className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => exec("italic")} label="I" active={fmt.italic}><Italic className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => toggleHighlight()} onLongPress={() => setPanel("highlight")}
            label="H" active={fmt.highlight}><Highlighter className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => setPanel(panel === "heading" ? null : "heading")} label="标题"
            active={!!fmt.block || panel === "heading"}><Heading className="h-4 w-4" /></ToolBtn>
          <ToolBtn onClick={() => setPanel(panel === "size" ? null : "size")} label="A" active={panel === "size"}>
            <span className="text-sm font-semibold">A</span>
          </ToolBtn>
          <ToolBtn onClick={() => setPanel(panel === "font" ? null : "font")} label="字体" active={panel === "font"}>
            <TypeIcon className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => setPanel(panel === "color" ? null : "color")} label="调色" active={panel === "color"}>
            <Palette className="h-4 w-4" />
          </ToolBtn>
          <ToolBtn onClick={() => setPanel(panel === "link" ? null : "link")} label="链接" active={panel === "link"}>
            <Plus className="h-4 w-4" />
          </ToolBtn>
        </div>
      </div>

      {/* 编辑器排版 + 滑动动画 */}
      <style>{`
        .review-editor h1 { font-size: 1.6em; font-weight: 700; margin: 0.5em 0 0.25em; }
        .review-editor h2 { font-size: 1.35em; font-weight: 700; margin: 0.5em 0 0.25em; }
        .review-editor h3 { font-size: 1.15em; font-weight: 600; margin: 0.4em 0 0.2em; }
        .review-editor ol { list-style-type: lower-alpha; padding-left: 1.5em; }
        @keyframes linkSlideUp { from { transform: translateY(20%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes linkSlideDown { from { transform: translateY(0); opacity: 1; } to { transform: translateY(110%); opacity: 0; } }
      `}</style>
    </div>
  );
}

function HistoryArrow({
  dir, disabled, onClick,
}: { dir: "undo" | "redo"; disabled?: boolean; onClick: () => void }) {
  const Icon = dir === "undo" ? Undo2 : Redo2;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "undo" ? "撤销" : "重做"}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full transition active:scale-90",
        disabled ? "opacity-30" : "",
      )}
    >
      <Icon
        className="h-5 w-5"
        strokeWidth={1.4}
        color="oklch(0.55 0.10 148)"
      />
    </button>
  );
}

function ToolBtn({
  onClick, children, label, active, onLongPress,
}: {
  onClick: () => void;
  children: React.ReactNode;
  label: string;
  active?: boolean;
  onLongPress?: () => void;
}) {
  const timer = useRef<number | null>(null);
  const longFired = useRef(false);
  return (
    <button
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        longFired.current = false;
        if (onLongPress) {
          timer.current = window.setTimeout(() => {
            longFired.current = true;
            onLongPress();
          }, 420);
        }
      }}
      onPointerUp={() => {
        if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
        if (!longFired.current) onClick();
      }}
      onPointerLeave={() => {
        if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
      }}
      className="relative grid h-9 w-9 place-items-center rounded-xl transition text-foreground/75"
    >
      {active && (
        <span
          aria-hidden
          className="absolute inset-0 m-auto h-7 w-7 rounded-full"
          style={{ background: "oklch(0.78 0.10 145 / 0.45)" }}
        />
      )}
      <span className="relative">{children}</span>
    </button>
  );
}

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").trim();
}
