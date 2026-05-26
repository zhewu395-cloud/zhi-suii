import { useEffect, useState } from "react";

type Burst = {
  id: number;
  x: number; // 0..1 屏幕比例
  y: number;
  full?: boolean;
};

let _id = 0;
let _emit: ((b: Omit<Burst, "id">) => void) | null = null;

export function fireBurst(b: Omit<Burst, "id">) {
  _emit?.(b);
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// 纯绿色谱：荧光绿、嫩绿、草绿、竹青、墨绿，深浅交错有层次
// 严禁白色！全部 oklch 绿色
const GREEN_PALETTE = [
  { l: 0.92, c: 0.22, h: 142 }, // 荧光绿（高亮）
  { l: 0.86, c: 0.20, h: 150 }, // 亮嫩绿
  { l: 0.78, c: 0.19, h: 138 }, // 嫩绿
  { l: 0.68, c: 0.18, h: 135 }, // 草绿
  { l: 0.58, c: 0.16, h: 145 }, // 竹青
  { l: 0.45, c: 0.13, h: 148 }, // 深竹
  { l: 0.32, c: 0.10, h: 152 }, // 墨绿
  { l: 0.22, c: 0.08, h: 155 }, // 浓墨绿
  { l: 0.88, c: 0.24, h: 132 }, // 荧光草
  { l: 0.72, c: 0.21, h: 128 }, // 暖亮绿
];

function pickColor() {
  const p = GREEN_PALETTE[Math.floor(Math.random() * GREEN_PALETTE.length)];
  const ll = Math.max(0.18, Math.min(0.96, p.l + rand(-0.04, 0.04))).toFixed(3);
  const cc = Math.max(0.04, p.c * rand(0.7, 1.15)).toFixed(3);
  const hh = (p.h + rand(-10, 10)).toFixed(0);
  return `oklch(${ll} ${cc} ${hh})`;
}

// 抽象水墨晕染斑点：不规则斑块 + 荧光辉光
function InkBlob({
  x,
  y,
  full,
}: {
  x: number;
  y: number;
  full?: boolean;
}) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 400;
  const vh = typeof window !== "undefined" ? window.innerHeight : 700;

  // 单次：宽满屏、纵向 1/3；全屏：覆盖全屏
  // 角度采用椭圆抛射，X 拉到屏宽，Y 限制在屏高 1/3
  const angle = rand(0, Math.PI * 2);
  // 随机不规则强度
  const wild = rand(0.5, 1.4);
  const rx = full ? vw * rand(0.4, 0.55) : vw * rand(0.35, 0.55) * wild;
  const ry = full ? vh * rand(0.4, 0.55) : (vh / 3) * rand(0.6, 1.0) * wild;
  // 加入撕裂感：径向不均匀
  const jitter = rand(0.6, 1.5);
  const dx = Math.cos(angle) * rx * jitter;
  const dy = Math.sin(angle) * ry * (full ? jitter : rand(0.4, 1.1));

  const dur = full ? rand(1.1, 2.0) : rand(0.75, 1.4);
  const delay = rand(0, full ? 0.25 : 0.12);

  // 斑点尺寸：水墨晕染感，大小不一
  const size = full ? rand(8, 26) : rand(6, 22);
  const aspect = rand(0.5, 1.8); // 非圆，椭圆/不规则
  const w = size * aspect;
  const h = size / aspect;
  const rotate = rand(-180, 180);
  const skew = rand(-25, 25);

  const color = pickColor();
  const glow = pickColor();

  // 不规则水墨形状：4 个随机圆角形成有机斑块
  const r1 = rand(40, 70);
  const r2 = rand(30, 65);
  const r3 = rand(45, 75);
  const r4 = rand(35, 60);
  const borderRadius = `${r1}% ${100 - r1}% ${r2}% ${100 - r2}% / ${r3}% ${r4}% ${100 - r4}% ${100 - r3}%`;

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: w,
    height: h,
    background: `radial-gradient(circle at ${rand(20,80)}% ${rand(20,80)}%, ${color} 0%, ${color} 35%, ${glow} 70%, transparent 100%)`,
    borderRadius,
    transform: `translate(-50%, -50%) rotate(${rotate}deg) skew(${skew}deg)`,
    animation: `ink-burst ${dur}s cubic-bezier(.12,.7,.28,1) ${delay}s forwards`,
    // @ts-ignore
    "--tx": `${dx}px`,
    "--ty": `${dy}px`,
    "--rot": `${rotate + rand(-360, 360)}deg`,
    pointerEvents: "none",
    // 动态荧光：双层辉光
    boxShadow: `0 0 ${rand(6, 14)}px ${color}, 0 0 ${rand(14, 28)}px ${glow}aa, 0 0 ${rand(2, 6)}px ${color}`,
    filter: `blur(${rand(0.3, 1.4)}px) saturate(1.3)`,
    opacity: 0,
    mixBlendMode: "screen" as any,
  };
  return <span style={style} />;
}

export function ParticleLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    _emit = (b) => {
      const id = ++_id;
      setBursts((prev) => [...prev, { ...b, id }]);
      window.setTimeout(
        () => setBursts((prev) => prev.filter((x) => x.id !== id)),
        2400,
      );
    };
    return () => {
      _emit = null;
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes ink-burst {
          0% {
            transform: translate(-50%,-50%) rotate(0deg) scale(0.4);
            opacity: 0;
            filter: blur(2px) saturate(1.5);
          }
          12% {
            opacity: 1;
            transform: translate(-50%,-50%) rotate(20deg) scale(1.2);
            filter: blur(0.4px) saturate(1.5);
          }
          55% {
            opacity: 0.85;
            filter: blur(0.8px) saturate(1.3);
          }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.25);
            opacity: 0;
            filter: blur(3px) saturate(0.9);
          }
        }
      `}</style>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {bursts.map((b) => (
          <BurstGroup key={b.id} burst={b} />
        ))}
      </div>
    </>
  );
}

function BurstGroup({ burst }: { burst: Burst }) {
  const count = burst.full ? 220 : 70;
  const arr = Array.from({ length: count });
  return (
    <>
      {arr.map((_, i) => (
        <InkBlob key={i} x={burst.x} y={burst.y} full={burst.full} />
      ))}
    </>
  );
}
