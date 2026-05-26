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
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 从背景米白绿色调延展出的多色纯色调色板：
// 嫩绿、薄荷、竹青、墨绿、暖米、奶黄、樱粉、淡紫、天青
const PALETTE = [
  "oklch(0.92 0.14 142)", // 荧光嫩绿
  "oklch(0.85 0.16 138)", // 嫩绿
  "oklch(0.78 0.15 150)", // 薄荷
  "oklch(0.68 0.16 145)", // 草绿
  "oklch(0.55 0.14 152)", // 竹青
  "oklch(0.42 0.10 155)", // 墨绿
  "oklch(0.95 0.05 95)",  // 暖米
  "oklch(0.90 0.13 95)",  // 奶黄
  "oklch(0.88 0.11 60)",  // 暖橙
  "oklch(0.86 0.12 25)",  // 樱粉
  "oklch(0.82 0.10 350)", // 玫粉
  "oklch(0.84 0.09 300)", // 淡紫
  "oklch(0.86 0.09 230)", // 天青
  "oklch(0.80 0.11 200)", // 湖蓝
];

type Shape = "petal" | "leaf" | "dot" | "sliver" | "diamond";
const SHAPES: Shape[] = ["petal", "petal", "leaf", "leaf", "dot", "sliver", "diamond"];

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

  const shape = pick(SHAPES);
  const angle = rand(0, Math.PI * 2);

  // 单次：横向满屏、纵向 ~1/3；全屏：覆盖屏幕
  const rx = full ? vw * rand(0.4, 0.55) : (vw / 2) * rand(0.5, 1.05);
  const ry = full ? vh * rand(0.4, 0.55) : (vh / 3) * rand(0.45, 0.95);
  const jitter = rand(0.55, 1.35);
  const dx = Math.cos(angle) * rx * jitter;
  const dy = Math.sin(angle) * ry * jitter + (full ? 0 : rand(-12, 18));

  const dur = full ? rand(1.1, 1.9) : rand(0.8, 1.4);
  const delay = rand(0, full ? 0.22 : 0.1);

  // 多种尺寸
  const base = rand(5, 22);
  let w = base;
  let h = base;
  let borderRadius: string | undefined;
  let clipPath: string | undefined;
  let transformExtra = "";

  if (shape === "petal") {
    w = rand(8, 18);
    h = rand(12, 26);
    // 不对称花瓣
    borderRadius = "100% 0 100% 0 / 60% 0 60% 0";
  } else if (shape === "leaf") {
    w = rand(10, 22);
    h = rand(5, 11);
    borderRadius = "100% 0 100% 0";
  } else if (shape === "dot") {
    w = h = rand(3, 9);
    borderRadius = "9999px";
  } else if (shape === "sliver") {
    w = rand(12, 24);
    h = rand(1.5, 3);
    borderRadius = "9999px";
  } else if (shape === "diamond") {
    w = h = rand(5, 11);
    transformExtra = " rotate(45deg)";
  }

  const rotate = rand(-180, 180);
  const endRotate = rotate + rand(-540, 540);
  const color = pick(PALETTE);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: w,
    height: h,
    background: color,
    borderRadius,
    clipPath,
    transform: `translate(-50%, -50%) rotate(${rotate}deg)${transformExtra}`,
    animation: `petal-burst ${dur}s cubic-bezier(.16,.7,.28,1) ${delay}s forwards`,
    // @ts-ignore
    "--tx": `${dx}px`,
    "--ty": `${dy}px`,
    "--rot": `${endRotate}deg`,
    pointerEvents: "none",
    opacity: 0,
    boxShadow: `0 1px 3px oklch(0.3 0.05 145 / 0.25)`,
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
        @keyframes petal-burst {
          0% {
            transform: translate(-50%,-50%) rotate(0deg) scale(0.5);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translate(-50%,-50%) rotate(30deg) scale(1.05);
          }
          70% { opacity: 0.95; }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.4);
            opacity: 0;
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
  const count = burst.full ? 240 : 80;
  const arr = Array.from({ length: count });
  return (
    <>
      {arr.map((_, i) => (
        <Particle key={i} x={burst.x} y={burst.y} full={burst.full} />
      ))}
    </>
  );
}
