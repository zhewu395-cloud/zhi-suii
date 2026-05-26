import { useRef, useState } from "react";
import { Download, Upload, X, ShieldCheck } from "lucide-react";
import { exportAll, importAll, type Review } from "@/lib/db";

const CATEGORY_LABEL: Record<string, string> = {
  pending: "待分类",
  sundry: "琐碎记",
  day: "日复盘",
  week: "周复盘",
  month: "月复盘",
};

function buildReviewsMarkdown(reviews: Review[]): string {
  const order = ["pending", "sundry", "day", "week", "month"];
  const grouped: Record<string, Review[]> = {};
  for (const r of reviews) {
    const k = r.category || r.type || "pending";
    (grouped[k] ||= []).push(r);
  }
  for (const k of Object.keys(grouped)) {
    grouped[k].sort((a, b) => (a.date < b.date ? 1 : -1));
  }
  const today = new Date().toISOString().slice(0, 10);
  let md = `# 时迹 · 复盘归档\n\n导出日期：${today}\n\n---\n\n`;
  for (const k of order) {
    const list = grouped[k];
    if (!list?.length) continue;
    md += `## ${CATEGORY_LABEL[k] ?? k}\n\n`;
    for (const r of list) {
      const title = r.title?.trim() || "（无标题）";
      md += `### ${r.date} · ${title}\n\n`;
      md += `${(r.content || "").trim() || "_（空）_"}\n\n`;
    }
    md += `---\n\n`;
  }
  return md;
}


export function SettingsSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  const doExport = async () => {
    const data = await exportAll();
    const d = new Date();
    const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    // 1) 完整数据 JSON（用于导入恢复）
    const jsonBlob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    const a1 = document.createElement("a");
    a1.href = jsonUrl;
    a1.download = `时迹备份${stamp}.json`;
    a1.click();
    URL.revokeObjectURL(jsonUrl);

    // 2) 复盘 Markdown（Notion 可直接导入）
    const reviews = ((data.data as Record<string, unknown[]>)?.reviews ?? []) as Review[];
    const md = buildReviewsMarkdown(reviews);
    const mdBlob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const mdUrl = URL.createObjectURL(mdBlob);
    const a2 = document.createElement("a");
    a2.href = mdUrl;
    a2.download = `时迹复盘${stamp}.md`;
    setTimeout(() => {
      a2.click();
      URL.revokeObjectURL(mdUrl);
    }, 250);

    setMsg("✓ 已导出 JSON + Markdown");
    setTimeout(() => setMsg(null), 2500);
  };

  const doImport = async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!confirm("导入将覆盖当前所有本地数据，确定继续？")) return;
      await importAll(json);
      setMsg("✓ 导入成功，请刷新查看");
      setTimeout(() => location.reload(), 1200);
    } catch (e) {
      setMsg("✗ 导入失败：文件格式错误");
      setTimeout(() => setMsg(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={() => onOpenChange(false)}>
      <div
        className="w-full max-w-[480px] rounded-t-3xl bg-white p-6 pb-10 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">设置</h2>
          <button onClick={() => onOpenChange(false)} className="grid h-8 w-8 place-items-center rounded-full bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={doExport}
            className="flex w-full items-center gap-3 rounded-2xl bg-primary px-4 py-4 text-primary-foreground shadow active:scale-[0.98] transition"
          >
            <Download className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">导出备份</div>
              <div className="text-xs opacity-80">JSON 全量备份 + Markdown 复盘（可导入 Notion）</div>
            </div>
          </button>

          <button
            onClick={() => fileRef.current?.click()}
            className="flex w-full items-center gap-3 rounded-2xl bg-secondary px-4 py-4 text-secondary-foreground shadow active:scale-[0.98] transition"
          >
            <Upload className="h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">导入备份</div>
              <div className="text-xs opacity-80">从备份文件一键恢复</div>
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) doImport(f);
              e.target.value = "";
            }}
          />

          <div className="flex items-start gap-2 rounded-2xl bg-muted/60 px-4 py-3 text-xs text-foreground/70">
            <ShieldCheck className="h-4 w-4 mt-0.5 text-primary" />
            <span>
              所有数据仅保存在本机浏览器（IndexedDB），App 不进行任何网络同步，
              飞行模式下完全可用。
            </span>
          </div>

          {msg && (
            <div className="text-center text-sm text-foreground/80">{msg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
