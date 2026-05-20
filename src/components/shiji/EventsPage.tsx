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
  "#FFFDF9", "#F5E9D4", "#E8C9A0", "#D89A6B", "#C46A4A",
  "#E8A0A0", "#E0B8D4", "#B8A0D8", "#A0B8E0", "#A0D8E0",
  "#BFE3C6", "#D6E7B8", "#E7DCB8", "#7A7A7A", "#2D2D2D",
];

function hslToHex(h: number, s: number, l: number) {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const c = l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return Math.round(255 * c).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function SliderRow({
  label, value, min, max, onChange, trackBg,
}: {
  label: string; value: number; min: number; max: number;
  onChange: (v: number) => void; trackBg: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-[11px] text-foreground/55 mb-1">
        <span>{label}</span><span className="tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-3 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-foreground/30 [&::-webkit-slider-thumb]:shadow"
        style={{ background: trackBg }}
      />
    </div>
  );
}

export function EventsPage({ onStart }: { onStart: (a: Activity) => void }) {
  const [list, setList] = useState<Activity[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  
  const [color, setColor] = useState<string>("#BFE3C6");
  const [hue, setHue] = useState(140);
  const [sat, setSat] = useState(50);
  const [light, setLight] = useState(75);
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
      {/* 2 列 不规则毛玻璃事件按钮 —— 放大 1.2x、加深透明 */}
      <div className="grid grid-cols-2 gap-4 px-4 pt-2 justify-items-center">
        {list.map((a, i) => {
          const color = a.color ?? DEFAULT_COLOR;
          return (
            <div key={a.id} className="relative w-[138px] h-[96px]">
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
                  animationDelay: `${(i % 4) * 0.6}s`,
                  backgroundColor: `color-mix(in oklab, ${color} 26%, transparent)`,
                }}
                className="event-blob h-full w-full text-base text-foreground/85 font-medium"
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
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full text-foreground/90 text-[10px] shadow"
                  aria-label="删除"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          );
        })}

        <div className="relative w-[138px] h-[96px]">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setAdding(true);
            }}
            style={{ backgroundColor: "color-mix(in oklab, #BFE3C6 26%, transparent)" }}
            className="event-blob flex h-full w-full items-center justify-center gap-1 text-foreground/70 text-base"
          >
            <Plus className="h-4 w-4" /> 添加
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

            {/* 标准双层调色盘：固定色卡 + 三条渐变色条 */}
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div
                  className="h-11 w-11 rounded-full shadow-inner border border-border"
                  style={{ background: color }}
                />
                <div className="flex-1">
                  <div className="text-xs text-foreground/60 mb-0.5">当前颜色</div>
                  <div className="text-[11px] text-foreground/50 tabular-nums">{color.toUpperCase()}</div>
                </div>
              </div>

              {/* 固定色卡 */}
              <div>
                <div className="text-xs text-foreground/55 mb-1.5">常用色卡</div>
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

              {/* 渐变色条 —— 色相 / 饱和 / 明度 */}
              <div className="space-y-2.5">
                <SliderRow
                  label="色相"
                  value={hue}
                  min={0}
                  max={360}
                  onChange={(v) => { setHue(v); setColor(hslToHex(v, sat, light)); }}
                  trackBg="linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)"
                />
                <SliderRow
                  label="饱和"
                  value={sat}
                  min={0}
                  max={100}
                  onChange={(v) => { setSat(v); setColor(hslToHex(hue, v, light)); }}
                  trackBg={`linear-gradient(to right, hsl(${hue} 0% ${light}%), hsl(${hue} 100% ${light}%))`}
                />
                <SliderRow
                  label="明度"
                  value={light}
                  min={10}
                  max={95}
                  onChange={(v) => { setLight(v); setColor(hslToHex(hue, sat, v)); }}
                  trackBg={`linear-gradient(to right, hsl(${hue} ${sat}% 15%), hsl(${hue} ${sat}% 55%), hsl(${hue} ${sat}% 92%))`}
                />
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
