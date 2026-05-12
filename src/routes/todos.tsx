import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Plus, Trash2 } from "lucide-react";
import {
  addTodo,
  deleteTodo,
  listTodos,
  toggleTodo,
  type Todo,
} from "@/lib/db";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/todos")({
  component: TodosPage,
});

function TodosPage() {
  const [items, setItems] = useState<Todo[]>([]);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");

  async function refresh() {
    setItems(await listTodos());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    const t = title.trim();
    if (!t) return;
    await addTodo({
      title: t,
      detail: detail.trim() || undefined,
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setTitle("");
    setDetail("");
    setOpen(false);
    refresh();
  }

  // group by date
  const groups = items.reduce<Record<string, Todo[]>>((acc, t) => {
    (acc[t.date] ??= []).push(t);
    return acc;
  }, {});
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-wide text-foreground/80">
          待办
        </h1>
        <Button
          variant="outline"
          className="rounded-full border-white/70 bg-white/80 backdrop-blur-sm"
          onClick={() => setOpen(true)}
        >
          <Plus className="mr-1 h-4 w-4" /> 添加
        </Button>
      </div>

      <div className="space-y-4">
        {Object.keys(groups)
          .sort((a, b) => (a < b ? 1 : -1))
          .map((date) => (
            <div
              key={date}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-sm"
            >
              <div className="mb-3 text-xs text-foreground/50">
                {date === today ? "今日 · " : ""}
                {format(new Date(date), "yyyy年MM月dd日", { locale: zhCN })}
              </div>
              <ul className="space-y-2">
                {groups[date].map((t) => (
                  <li key={t.id} className="group flex items-start gap-3">
                    <button
                      onClick={async () => {
                        await toggleTodo(t.id);
                        refresh();
                      }}
                      className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                        t.completed
                          ? "border-[#7aa055] bg-[#7aa055]"
                          : "border-foreground/30"
                      }`}
                    >
                      {t.completed && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </button>
                    <div className="flex-1">
                      <div
                        className={
                          t.completed
                            ? "text-foreground/40 line-through"
                            : "text-foreground/80"
                        }
                      >
                        {t.title}
                      </div>
                      {t.detail && (
                        <div className="mt-0.5 text-xs text-foreground/50">
                          {t.detail}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={async () => {
                        await deleteTodo(t.id);
                        refresh();
                      }}
                      className="opacity-0 transition group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-foreground/40" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        {items.length === 0 && (
          <div className="py-16 text-center text-sm text-foreground/40">
            还没有待办，点右上角添加吧
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="sr-only">新建待办</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="任务名称"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 border-b border-foreground/20 rounded-none px-0 text-base shadow-none focus-visible:ring-0"
          />
          <Textarea
            placeholder="详细内容（可选）"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            className="min-h-24 border-0 px-0 shadow-none focus-visible:ring-0 resize-none"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button
              onClick={handleAdd}
              className="rounded-full bg-foreground text-background"
            >
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
