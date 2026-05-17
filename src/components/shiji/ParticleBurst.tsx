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

const SHAPES = ["blade", "shard", "petal", "sliver", "dot"] as const;
type Shape = (typeof SHAPES)[number];

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}

// 多层次清新绿：嫩绿、薄荷、竹青、暖浅绿
const GREEN_PALETTE = [
  { l: 0.82, c: 0.16, h: 138 }, // 嫩绿
  { l: 0.88, c: 0.10, h: 162 }, // 薄荷
  { l: 0.62, c: 0.13, h: 150 }, // 竹青
  { l: 0.72, c: 0.14, h: 128 }, // 暖浅绿
  { l: 0.55, c: 0.15, h: 145 }, // 深竹
  { l: 0.92, c: 0.07, h: 145 }, // 雾绿
  { l: 0.68, c: 0.18, h: 135 }, // 草绿
];

function Particle({
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
  const angle = rand(0, Math.PI * 2);
  // 单次：屏幕 1/4 范围（约 min(vw,vh)/2.5）；全屏：最大对角线
  const maxR = full
    ? Math.hypot(vw, vh) * rand(0.55, 0.95)
    : Math.min(vw, vh) * rand(0.10, 0.28);
  const dx = Math.cos(angle) * maxR;
  const dy = Math.sin(angle) * maxR;
  const dur = full ? rand(1.0, 1.8) : rand(0.7, 1.3);
  const shape: Shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];

  // 形状尺寸
  let w = rand(4, 12);
  let h = rand(2, 6);
  if (shape === "blade") { w = rand(10, 22); h = rand(1.5, 3); }
  if (shape === "petal") { w = rand(8, 14); h = rand(6, 12); }
  if (shape === "shard") { w = rand(5, 11); h = rand(3, 7); }
  if (shape === "sliver") { w = rand(14, 26); h = 1.2; }
  if (shape === "dot") { w = h = rand(2.5, 5); }

  const rotate = rand(-180, 180);
  const p = GREEN_PALETTE[Math.floor(Math.random() * GREEN_PALETTE.length)];
  const ll = (p.l + rand(-0.06, 0.06)).toFixed(2);
  const cc = (p.c * rand(0.6, 1.15)).toFixed(3);
  const hh = (p.h + rand(-8, 8)).toFixed(0);
  const color = `oklch(${ll} ${cc} ${hh})`;

  // petal 用 clip-path 做花瓣/叶片；shard 做不规则锐角
  let clipPath: string | undefined;
  let borderRadius: string | undefined;
  if (shape === "petal") {
    clipPath = "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)";
  } else if (shape === "shard") {
    clipPath = "polygon(0 30%, 70% 0, 100% 60%, 40% 100%)";
  } else if (shape === "blade" || shape === "sliver") {
    borderRadius = "9999px 1px 9999px 1px";
  } else {
    borderRadius = "9999px";
  }

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: w,
    height: h,
    background: color,
    borderRadius,
    clipPath,
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    animation: `burst-${shape} ${dur}s cubic-bezier(.18,.62,.32,1) forwards`,
    // @ts-ignore
    "--tx": `${dx}px`,
    "--ty": `${dy}px`,
    pointerEvents: "none",
    boxShadow: `0 0 5px ${color}, 0 0 10px ${color}55`,
    opacity: 0.92,
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
        2200,
      );
    };
    return () => {
      _emit = null;
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes burst-blade {
          0% { transform: translate(-50%,-50%) rotate(0deg) scale(1); opacity: 1; }
          70% { opacity: 0.9; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(540deg) scale(0.55); opacity: 0; }
        }
        @keyframes burst-shard {
          0% { transform: translate(-50%,-50%) rotate(0deg) scale(1); opacity: 0.95; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(220deg) scale(0.3); opacity: 0; }
        }
        @keyframes burst-petal {
          0% { transform: translate(-50%,-50%) rotate(0deg) scale(0.6); opacity: 0; }
          15% { opacity: 1; transform: translate(-50%,-50%) rotate(40deg) scale(1.05); }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty) + 20px)) rotate(380deg) scale(0.45); opacity: 0; }
        }
        @keyframes burst-sliver {
          0% { transform: translate(-50%,-50%) rotate(0deg) scaleX(0.3); opacity: 0.8; }
          30% { transform: translate(-50%,-50%) rotate(0deg) scaleX(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(120deg) scaleX(0.2); opacity: 0; }
        }
        @keyframes burst-dot {
          0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }
          100% { transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) scale(0.2); opacity: 0; }
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
  const count = burst.full ? 160 : 36;
  const arr = Array.from({ length: count });
  return (
    <>
      {arr.map((_, i) => (
        <Particle key={i} x={burst.x} y={burst.y} full={burst.full} />
      ))}
    </>
  );
}
