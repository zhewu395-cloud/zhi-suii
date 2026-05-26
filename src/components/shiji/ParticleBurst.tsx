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

// 水墨宣纸 · 莫兰迪绿系：深林、苔藓、鼠尾草、薄荷、青瓷
const GREENS = [
  "oklch(0.34 0.045 152)", // 深林
  "oklch(0.42 0.055 148)", // 苔墨
  "oklch(0.52 0.060 145)", // 竹影
  "oklch(0.62 0.055 150)", // 鼠尾草
  "oklch(0.72 0.060 152)", // 青瓷
  "oklch(0.80 0.055 155)", // 薄荷雾
  "oklch(0.86 0.045 145)", // 浅烟绿
];

// 与绿色和谐的微光点缀
const SPARKS = [
  "oklch(0.92 0.10 95)",  // 暖米黄
  "oklch(0.88 0.12 70)",  // 蜜光
  "oklch(0.85 0.09 30)",  // 樱粉
  "oklch(0.90 0.08 200)", // 天青
  "oklch(0.95 0.06 145)", // 莹绿
];

type Kind = "leaf-l" | "leaf-s" | "stroke" | "blot" | "spark";

function leafRadius() {
  // 不对称叶形
  const a = rand(80, 100);
  const b = rand(0, 20);
  return `${a}% ${b}% ${a}% ${b}% / ${a}% ${b}% ${a}% ${b}%`;
}

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

  // 形态分布：以叶为主，少量笔触/晕染/微光
  const r = Math.random();
  const kind: Kind =
    r < 0.4 ? "leaf-l"
      : r < 0.7 ? "leaf-s"
      : r < 0.82 ? "stroke"
      : r < 0.92 ? "blot"
      : "spark";

  // 单次：横向满屏、纵向 ~1/3，且整体偏下（瓢洒下落感）
  const angle = rand(0, Math.PI * 2);
  const rx = full ? vw * rand(0.4, 0.55) : (vw / 2) * rand(0.55, 1.05);
  const ry = full ? vh * rand(0.4, 0.55) : (vh / 3) * rand(0.45, 0.95);
  const jitter = rand(0.5, 1.35);
  const dx = Math.cos(angle) * rx * jitter;
  const dyBase = Math.sin(angle) * ry * jitter;
  // 引入向下偏置，模拟落叶
  const gravity = full ? 0 : rand(20, 80);
  const dy = dyBase + gravity;

  const dur = full ? rand(1.3, 2.1) : rand(1.0, 1.7);
  const delay = rand(0, full ? 0.25 : 0.14);

  let w = 12;
  let h = 12;
  let borderRadius: string | undefined;
  let background: string;
  let opacity = rand(0.55, 0.85);
  let blur = rand(0, 0.6);
  let extraShadow = "";

  if (kind === "leaf-l") {
    w = rand(14, 26);
    h = rand(8, 14);
    borderRadius = leafRadius();
    // 水墨叶：径向渐变制造宣纸晕染（深→浅）
    const c1 = pick(GREENS.slice(0, 4));
    const c2 = pick(GREENS.slice(3));
    background = `radial-gradient(ellipse at 30% 40%, ${c1} 0%, ${c2} 55%, transparent 95%)`;
    opacity = rand(0.55, 0.8);
  } else if (kind === "leaf-s") {
    w = rand(7, 13);
    h = rand(4, 8);
    borderRadius = leafRadius();
    const c1 = pick(GREENS.slice(2));
    const c2 = pick(GREENS.slice(4));
    background = `radial-gradient(ellipse at 40% 50%, ${c1} 0%, ${c2} 60%, transparent 100%)`;
    opacity = rand(0.5, 0.75);
  } else if (kind === "stroke") {
    // 抽象笔触
    w = rand(16, 30);
    h = rand(1.8, 3.6);
    borderRadius = "9999px";
    const c = pick(GREENS.slice(1, 5));
    background = `linear-gradient(90deg, transparent 0%, ${c} 30%, ${c} 70%, transparent 100%)`;
    opacity = rand(0.4, 0.65);
    blur = rand(0.2, 0.8);
  } else if (kind === "blot") {
    // 水墨晕染斑
    w = h = rand(10, 22);
    borderRadius = `${rand(40, 70)}% ${rand(30, 60)}% ${rand(50, 80)}% ${rand(40, 70)}% / ${rand(40, 70)}% ${rand(40, 70)}% ${rand(40, 70)}% ${rand(40, 70)}%`;
    const c = pick(GREENS);
    background = `radial-gradient(circle at 45% 45%, ${c} 0%, transparent 70%)`;
    opacity = rand(0.35, 0.6);
    blur = rand(0.6, 1.4);
  } else {
    // 微光点
    w = h = rand(2.5, 5);
    borderRadius = "9999px";
    const c = pick(SPARKS);
    background = c;
    opacity = rand(0.75, 1);
    extraShadow = `0 0 ${rand(4, 10)}px ${c}, 0 0 ${rand(10, 18)}px ${c}`;
  }

  const rotate = rand(-180, 180);
  const endRotate = rotate + rand(-720, 720);

  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: w,
    height: h,
    background,
    borderRadius,
    transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
    animation: `petal-burst ${dur}s cubic-bezier(.18,.7,.3,1) ${delay}s forwards`,
    filter: blur > 0 ? `blur(${blur}px)` : undefined,
    boxShadow: extraShadow || undefined,
    mixBlendMode: kind === "spark" ? "screen" : "normal",
    // @ts-ignore
    "--tx": `${dx}px`,
    "--ty": `${dy}px`,
    "--rot": `${endRotate}deg`,
    "--op": `${opacity}`,
    pointerEvents: "none",
    opacity: 0,
  };
  return <span style={style} />;
}

// 完成处的柔和绿色玻璃光晕
function Halo({ x, y }: { x: number; y: number }) {
  const size = rand(160, 220);
  const style: React.CSSProperties = {
    position: "absolute",
    left: `${x * 100}%`,
    top: `${y * 100}%`,
    width: size,
    height: size,
    transform: "translate(-50%, -50%)",
    borderRadius: "9999px",
    background:
      "radial-gradient(circle, oklch(0.85 0.10 148 / 0.55) 0%, oklch(0.80 0.09 150 / 0.30) 35%, transparent 72%)",
    filter: "blur(6px)",
    mixBlendMode: "screen",
    animation: "halo-pulse 1.4s ease-out forwards",
    pointerEvents: "none",
    opacity: 0,
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
        2600,
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
            transform: translate(-50%,-50%) rotate(0deg) scale(0.45);
            opacity: 0;
            filter: blur(2px);
          }
          18% {
            opacity: var(--op, 0.8);
            transform: translate(-50%,-50%) rotate(20deg) scale(1.05);
          }
          75% { opacity: calc(var(--op, 0.8) * 0.85); }
          100% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.55);
            opacity: 0;
          }
        }
        @keyframes halo-pulse {
          0% { opacity: 0; transform: translate(-50%,-50%) scale(0.4); }
          25% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%,-50%) scale(1.6); }
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
  const count = burst.full ? 220 : 75;
  const arr = Array.from({ length: count });
  return (
    <>
      {!burst.full && <Halo x={burst.x} y={burst.y} />}
      {arr.map((_, i) => (
        <Particle key={i} x={burst.x} y={burst.y} full={burst.full} />
      ))}
    </>
  );
}
