import { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { getAll, put, del, uid, type Activity } from "@/lib/db";

const DEFAULT: Activity[] = [
  { id: "a-class", name: "上课", color: "oklch(0.82 0.06 148)", createdAt: 0 },
  { id: "a-write", name: "文案", color: "oklch(0.85 0.05 130)", createdAt: 0 },
  { id: "a-walk", name: "走路", color: "oklch(0.83 0.06 165)", createdAt: 0 },
  { id: "a-read", name: "阅读", color: "oklch(0.86 0.05 110)", createdAt: 0 },
];

const DEFAULT_COLOR = "oklch(0.82 0.06 148)";

function buildOklch(l: number, c: number, h: number) {
  return `oklch(${l.toFixed(2)} ${c.toFixed(3)} ${h.toFixed(0)})`;
}

export function EventsPage({ onStart }: { onStart: (a: Activity) => void }) {
  const [list, setList] = useState<Activity[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [hue, setHue] = useState(148);    // 色调
  const [chroma, setChroma] = useState(0.06); // 饱和
  const [light, setLight] = useState(0.82); // 明度 / 色温感
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
      color: buildOklch(light, chroma, hue),
      createdAt: Date.now(),
    };
    await put("activities", a);
    setName("");
    setHue(148);
    setChroma(0.06);
    setLight(0.82);
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

  const currentColor = buildOklch(light, chroma, hue);

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
                className="breathe w-full rounded-[55%/45%] border px-5 py-7 text-lg text-foreground/85 font-medium active:scale-95 transition shadow-sm backdrop-blur-md"
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

            {/* 调色盘 */}
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-12 rounded-full shadow-inner border border-border"
                  style={{ background: currentColor }}
                />
                <div className="text-xs text-foreground/60">预览颜色</div>
              </div>

              <label className="block text-xs text-foreground/60">
                色调 (Hue) {hue}°
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={hue}
                  onChange={(e) => setHue(+e.target.value)}
                  className="mt-1 w-full accent-primary"
                />
              </label>

              <label className="block text-xs text-foreground/60">
                饱和度 {chroma.toFixed(3)}
                <input
                  type="range"
                  min={0}
                  max={0.18}
                  step={0.005}
                  value={chroma}
                  onChange={(e) => setChroma(+e.target.value)}
                  className="mt-1 w-full accent-primary"
                />
              </label>

              <label className="block text-xs text-foreground/60">
                明度 / 色温 {light.toFixed(2)}
                <input
                  type="range"
                  min={0.55}
                  max={0.95}
                  step={0.01}
                  value={light}
                  onChange={(e) => setLight(+e.target.value)}
                  className="mt-1 w-full accent-primary"
                />
              </label>
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
