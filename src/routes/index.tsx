import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Bubble } from "@/components/Bubble";
import { Plus, X } from "lucide-react";
import {
  addActivity,
  deleteActivity,
  listActivities,
  type Activity,
} from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: EventsPage,
});

function EventsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Activity[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function refresh() {
    setItems(await listActivities());
  }
  useEffect(() => {
    refresh();
  }, []);

  async function handleAdd() {
    const n = name.trim();
    if (!n) return;
    await addActivity(n);
    setName("");
    setOpen(false);
    refresh();
  }

  return (
    <AppShell>
      <h1 className="mb-10 text-3xl font-semibold tracking-wide text-foreground/80">
        时迹
      </h1>

      <div className="grid grid-cols-2 gap-x-4 gap-y-5">
        {items.map((a) => (
          <div key={a.id} className="relative group">
            <Bubble
              onClick={() =>
                navigate({ to: "/timer/$id", params: { id: a.id } })
              }
            >
              {a.name}
            </Bubble>
            <button
              aria-label="删除"
              onClick={async (e) => {
                e.stopPropagation();
                if (confirm(`删除"${a.name}"？已记录的时长不会被删除。`)) {
                  await deleteActivity(a.id);
                  refresh();
                }
              }}
              className="absolute -right-1 -top-1 rounded-full bg-white/90 p-1 text-foreground/50 opacity-0 shadow transition group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        <Bubble variant="ghost" onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> 添加
        </Bubble>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>新建事件</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            placeholder="事件名称（如：上课、走路）"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAdd}>添加</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
