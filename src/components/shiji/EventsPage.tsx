import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { getAll, put, del, uid, type Activity } from "@/lib/db";

const DEFAULT: Activity[] = [
  { id: "a-class", name: "上课", color: "#bfe3c6", createdAt: 0 },
  { id: "a-write", name: "文案", color: "#d6e7b8", createdAt: 0 },
  { id: "a-walk", name: "走路", color: "#c6e3d4", createdAt: 0 },
  { id: "a-read", name: "阅读", color: "#e7dcb8", createdAt: 0 },
];

const DEFAULT_COLOR = "#bfe3c6";

const PRESET_SWATCHES = [
  "#f4a8a8", "#f6c177", "#f5e29a", "#c9e29a", "#a3dca8",
  "#9ad6c1", "#a8d8f0", "#a8b8ee", "#c9a8ee", "#eba8d8",
  "#e8d4b0", "#b9a890", "#d8d8d8", "#7a7a7a", "#2d2d2d",
];

export function EventsPage({ onStart }: { onStart: (a: Activity) => void }) {
  const [list, setList] = useState<Activity[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  
  const [color, setColor] = useState<string>("#a3dca8");
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
    const a: Activity = {
      id: uid(),
      name: name.trim(),
      color,
      createdAt: Date.now(),
    };
    await put("activities", a);
    setName("");
    setColor("#a3dca8");
    setAdding(false);
    load();
  };

  const remove = async (id: string) => {
    await del("activities", id);
    setLongPressed(null);
    load();
  };

  let pressTimer: number | null = null;
  const startPress = (id: string) => {
    pressTimer = window.setTimeout(() => setLongPressed(id), 550) as unknown as number;
  };
  const cancelPress = () => {
    if (pressTimer) clearTimeout(pressTimer);
  };

  const currentColor = color;

  return (
    <div className="pt-2" onClick={() => longPressed && setLongPressed(null)}>
      <p className="px-2 pb-4 text-sm text-foreground/60">选择一项活动开始记录</p>

      {/* 2 列对称椭圆按钮 —— 宽度 80%，高度拉长 */}
      <div className="grid grid-cols-2 gap-4 px-4">
        {list.map((a, i) => {
          const color = a.color ?? DEFAULT_COLOR;
          return (
            <div key={a.id} className="relative mx-auto w-[80%]">
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
                style={{
                  animationDelay: `${(i % 4) * 0.4}s`,
                  background: `color-mix(in oklab, ${color} 55%, oklch(0.985 0.014 115))`,
                  borderColor: `color-mix(in oklab, ${color} 50%, transparent)`,
                }}
                className="breathe w-full rounded-full border px-6 py-7 text-lg text-foreground/85 font-medium active:scale-[0.97] transition shadow-[0_6px_20px_-14px_oklch(0.55_0.08_148/0.35)] backdrop-blur-md"
              >
                {a.name}
              </button>
              {longPressed === a.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(a.id);
                  }}
                  style={{
                    background: `color-mix(in oklab, ${color} 75%, oklch(0.4 0.08 150))`,
                  }}
                  className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full text-foreground/90 text-xs shadow"
                  aria-label="删除"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}

        <div className="relative mx-auto w-[80%] col-span-2 flex justify-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
            }}
            className="glass flex items-center justify-center gap-1 rounded-full px-6 py-3 text-foreground/70 active:scale-95 transition"
          >
            <Plus className="h-5 w-5" /> 添加
          </button>
        </div>
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

            {/* 标准全色调色盘 */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <label
                  className="h-12 w-12 rounded-full shadow-inner border border-border overflow-hidden cursor-pointer"
                  style={{ background: currentColor }}
                >
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="opacity-0 w-full h-full cursor-pointer"
                  />
                </label>
                <div className="flex-1">
                  <div className="text-xs text-foreground/60 mb-1">点击圆形从全色谱中选取</div>
                  <div className="text-[11px] text-foreground/50 tabular-nums">{color.toUpperCase()}</div>
                </div>
              </div>

              <div className="grid grid-cols-8 gap-1.5">
                {PRESET_SWATCHES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={`h-7 w-7 rounded-full border ${
                      color.toLowerCase() === c.toLowerCase()
                        ? "ring-2 ring-foreground/60"
                        : "border-border"
                    }`}
                    style={{ background: c }}
                    aria-label={c}
                  />
                ))}
              </div>
            </div>

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
