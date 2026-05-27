import { useEffect, useState } from "react";

type Burst = {
  id: number;
  x: number; // 0..1 屏幕比例
  y: number;
  full?: boolean;
  quick?: boolean; // 短生命周期（满卡多点联动）
};

let _id = 0;
let _emit: ((b: Omit<Burst, "id">) => void) | null = null;

export function fireBurst(b: Omit<Burst, "id">) {
  _emit?.(b);
}

// 满卡：在 50ms 内触发 3 个独立小爆炸，覆盖屏幕不同象限
export function fireFullScreenCelebration() {
  // 三象限随机点：偏左上 / 偏中右 / 偏下
  const zones: Array<[number, number, number, number]> = [
    [0.12, 0.42, 0.12, 0.4],
    [0.55, 0.85, 0.32, 0.6],
    [0.2, 0.75, 0.62, 0.88],
  ];
  // 随机打乱顺序，进一步降低规律性
  const shuffled = zones
    .map((z) => ({ z, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .map((o) => o.z);
  shuffled.forEach(([xMin, xMax, yMin, yMax], i) => {
    const x = xMin + Math.random() * (xMax - xMin);
    const y = yMin + Math.random() * (yMax - yMin);
    const delay = Math.random() * 50; // 0~50ms 微错峰
    window.setTimeout(() => _emit?.({ x, y, quick: true }), delay + i * 8);
  });
}

function rand(a: number, b: number) {
  return a + Math.random() * (b - a);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// 直接取自背景图 bg-willow.png 的叶子像素采样
const GREENS = [
  "#488460", // 深叶脉
  "#549060",
  "#609c6c",
  "#6ca878",
  "#90d070",
  "#a0d090",
  "#a0e0a0",
  "#a0e0b0",
  "#a0e0c0",
  "#b0e0c0", // 主调薄荷
];

// 微光点缀也取自背景中较亮的叶尖
const SPARKS = [
  "#b0e0c0",
  "#a0e0b0",
  "#a0e0c0",
  "#b0e0d0",
  "#90d090",
];

type Kind = "leaf-l" | "leaf-s" | "stroke" | "blot" | "spark";

function leafRadius() {
  // 不规则水墨斑块，避免出现椭圆轮廓
  return `${rand(40, 75)}% ${rand(30, 65)}% ${rand(45, 80)}% ${rand(35, 70)}% / ${rand(40, 70)}% ${rand(45, 75)}% ${rand(35, 65)}% ${rand(45, 75)}%`;
}

function Particle({
  x,
  y,
  full,
  quick,
}: {
  x: number;
  y: number;
  full?: boolean;
  quick?: boolean;
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
  const rx = full
    ? vw * rand(0.4, 0.55)
    : quick
      ? (vw / 2) * rand(0.6, 1.1)
      : (vw / 2) * rand(0.55, 1.05);
  const ry = full
    ? vh * rand(0.4, 0.55)
    : quick
      ? (vh / 3) * rand(0.55, 1.05)
      : (vh / 3) * rand(0.45, 0.95);
  const jitter = rand(0.5, 1.35);
  const dx = Math.cos(angle) * rx * jitter;
  const dyBase = Math.sin(angle) * ry * jitter;
  // 引入极轻向下偏置，模拟落叶（quick / full 不下坠）
  const gravity = full || quick ? 0 : rand(4, 14);
  const dy = dyBase + gravity;

  const dur = quick
    ? rand(0.55, 0.8)
    : full
      ? rand(1.0, 1.25)
      : rand(0.7, 1.0);
  const delay = full ? rand(0, 0.03) : 0;




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
    opacity,
  };
  return <span style={style} />;
}

// 完成处的柔和绿色玻璃光晕
function Halo(_: { x: number; y: number }) {
  return null;
}

export function ParticleLayer() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    _emit = (b) => {
      const id = ++_id;
      setBursts((prev) => [...prev, { ...b, id }]);
      // 生命周期：到达最大半径后立即销毁
      const ttl = b.quick ? 900 : b.full ? 1400 : 1100;
      window.setTimeout(
        () => setBursts((prev) => prev.filter((x) => x.id !== id)),
        ttl,
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
            transform: translate(calc(-50% + var(--tx) * 0.05), calc(-50% + var(--ty) * 0.05)) rotate(0deg) scale(1);
            opacity: var(--op, 0.8);
          }
          55% {
            transform: translate(calc(-50% + var(--tx) * 0.95), calc(-50% + var(--ty) * 0.95)) rotate(calc(var(--rot) * 0.7)) scale(0.85);
            opacity: var(--op, 0.8);
          }
          75% {
            transform: translate(calc(-50% + var(--tx)), calc(-50% + var(--ty))) rotate(var(--rot)) scale(0.7);
            opacity: 0;
          }
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
      {!burst.full && !burst.quick && <Halo x={burst.x} y={burst.y} />}
      {arr.map((_, i) => (
        <Particle
          key={i}
          x={burst.x}
          y={burst.y}
          full={burst.full}
          quick={burst.quick}
        />
      ))}
    </>
  );
}

