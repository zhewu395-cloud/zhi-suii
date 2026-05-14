import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { getAll, put, del, uid, type Activity } from "@/lib/db";

const DEFAULT: Activity[] = [
  { id: "a-class", name: "上课", createdAt: 0 },
  { id: "a-write", name: "文案", createdAt: 0 },
  { id: "a-walk", name: "走路", createdAt: 0 },
  { id: "a-read", name: "阅读", createdAt: 0 },
];

export function EventsPage({ onStart }: { onStart: (a: Activity) => void }) {
  const [list, setList] = useState<Activity[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [longPressed, setLongPressed] = useState<string | null>(null);

  const load = async () => {
    const rows = await getAll<Activity>("activities");
    if (rows.length === 0) {
      for (const a of DEFAULT) await put("activities", a);
      setList(DEFAULT);
    } else {
      setList(rows.sort((a, b) => a.createdAt - b.createdAt));
    }
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    const a: Activity = { id: uid(), name: name.trim(), createdAt: Date.now() };
    await put("activities", a);
    setName("");
    setAdding(false);
    load();
  };

  const remove = async (id: string) => {
    await del("activities", id);
    setLongPressed(null);
    load();
  };

  // 长按开启删除模式
  let pressTimer: number | null = null;
  const startPress = (id: string) => {
    pressTimer = window.setTimeout(() => setLongPressed(id), 550) as unknown as number;
  };
  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  return (
    <div className="pt-2" onClick={() => longPressed && setLongPressed(null)}>
      <p className="px-2 pb-4 text-sm text-foreground/60">选择一项活动开始记录</p>

      {/* 2 列对称椭圆按钮，垂直依次 */}
      <div className="grid grid-cols-2 gap-4 px-2">
        {list.map((a, i) => (
          <div key={a.id} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (longPressed === a.id) return;
                onStart(a);
              }}
              onMouseDown={() => startPress(a.id)}
              onMouseUp={cancelPress}
              onMouseLeave={cancelPress}
              onTouchStart={() => startPress(a.id)}
              onTouchEnd={cancelPress}
              style={{ animationDelay: `${(i % 4) * 0.4}s` }}
              className="glass breathe w-full rounded-full px-6 py-5 text-lg text-foreground/85 font-medium active:scale-95 transition"
            >
              {a.name}
            </button>
            {longPressed === a.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  remove(a.id);
                }}
                className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary/90 text-primary-foreground text-xs shadow"
                aria-label="删除"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setAdding(true);
          }}
          className="glass flex items-center justify-center gap-1 rounded-full px-6 py-5 text-foreground/70 active:scale-95 transition"
        >
          <Plus className="h-5 w-5" /> 添加
        </button>
      </div>

      {adding && (
        <div
          className="fixed inset-0 z-30 grid place-items-center bg-black/30 px-6"
          onClick={() => setAdding(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl bg-background p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-3 text-lg font-medium">新增活动</h3>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="活动名称"
              className="w-full rounded-xl border border-border bg-input px-4 py-3 outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setAdding(false)}
                className="rounded-xl px-4 py-2 text-foreground/70"
              >
                取消
              </button>
              <button
                onClick={add}
                className="rounded-xl bg-primary px-4 py-2 text-primary-foreground"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
