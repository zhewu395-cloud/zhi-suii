import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  addReview,
  exportAll,
  importAll,
  listReviews,
  type Review,
} from "@/lib/db";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Download, Upload } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reviews")({
  component: ReviewsPage,
});

function ReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<Review["type"]>("day");
  const [content, setContent] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function refresh() {
    setReviews(await listReviews());
  }
  useEffect(() => {
    refresh();
  }, []);

  const today = format(new Date(), "yyyy年MM月dd日", { locale: zhCN });
  const todayReview = reviews.find(
    (r) => r.type === "day" && r.date === format(new Date(), "yyyy-MM-dd"),
  );
  const counts = {
    day: reviews.filter((r) => r.type === "day").length,
    week: reviews.filter((r) => r.type === "week").length,
    month: reviews.filter((r) => r.type === "month").length,
  };

  async function handleSave() {
    const c = content.trim();
    if (!c) return;
    await addReview({
      type,
      date: format(new Date(), "yyyy-MM-dd"),
      content: c,
    });
    setContent("");
    setOpen(false);
    refresh();
  }

  async function handleExport() {
    const data = await exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `时迹_备份_${format(new Date(), "yyyy-MM-dd")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("备份已下载");
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!confirm("导入将覆盖当前所有本地数据，确定继续？")) return;
      await importAll(json);
      toast.success("导入成功");
      refresh();
    } catch (e: any) {
      toast.error("导入失败：" + (e?.message ?? "文件无效"));
    }
  }

  function openTypeDialog(t: Review["type"]) {
    setType(t);
    setOpen(true);
  }

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-wide text-foreground/80">
          我的复盘
        </h1>
        <div className="flex gap-2">
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-white/70 bg-white/80 backdrop-blur-sm"
            onClick={handleExport}
            title="导出备份"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 rounded-full border-white/70 bg-white/80 backdrop-blur-sm"
            onClick={() => fileRef.current?.click()}
            title="导入备份"
          >
            <Upload className="h-4 w-4" />
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportFile(f);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <button
        onClick={() => openTypeDialog("day")}
        className="mb-6 block w-full rounded-2xl border border-white/60 bg-white/70 p-4 text-left shadow-sm backdrop-blur-sm"
      >
        <div className="mb-2 text-xs text-foreground/50">{today}</div>
        <div className="min-h-20 text-sm text-foreground/70">
          {todayReview?.content ?? (
            <span className="text-foreground/30">点此写今日复盘…</span>
          )}
        </div>
      </button>

      <div className="grid grid-cols-3 gap-3">
        {(
          [
            { t: "day", label: "日复盘" },
            { t: "week", label: "周复盘" },
            { t: "month", label: "月复盘" },
          ] as const
        ).map((c) => (
          <button
            key={c.t}
            onClick={() => openTypeDialog(c.t)}
            className="rounded-2xl border border-white/60 bg-white/70 p-4 text-center shadow-sm backdrop-blur-sm"
          >
            <div className="text-base font-medium text-foreground/80">
              {c.label}
            </div>
            <div className="mt-1 text-xs text-foreground/50">
              {counts[c.t]} 篇
            </div>
          </button>
        ))}
      </div>

      {reviews.length > 0 && (
        <div className="mt-6 space-y-3">
          {reviews.slice(0, 10).map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-1 text-xs text-foreground/50">
                {r.type === "day" ? "日" : r.type === "week" ? "周" : "月"} ·{" "}
                {format(r.createdAt, "yyyy-MM-dd HH:mm")}
              </div>
              <div className="whitespace-pre-wrap text-sm text-foreground/80">
                {r.content}
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>
              {type === "day" ? "日复盘" : type === "week" ? "周复盘" : "月复盘"}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            autoFocus
            placeholder="写下你的复盘…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-40"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
