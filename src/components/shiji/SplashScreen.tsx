import { useEffect, useState } from "react";

/**
 * App 启动页 —— 纯绿底 + 居中昂扬叶子 + 底部品牌字
 * 仅在每次进入应用时短暂展示，然后淡出。
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const t1 = window.setTimeout(() => setFading(true), 1100);
    const t2 = window.setTimeout(() => setVisible(false), 1700);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        backgroundColor: "#BFE3C6",
        opacity: fading ? 0 : 1,
        transition: "opacity 560ms ease",
        pointerEvents: fading ? "none" : "auto",
        fontFamily: '"Kaiti SC", "STKaiti", "华文楷体", "KaiTi", "楷体", "BiauKai", serif',
      }}
    >
      <img
        src="/icon-512.png"
        alt="织岁"
        width={108}
        height={108}
        style={{
          width: 108,
          height: 108,
          borderRadius: 24,
          objectFit: "cover",
          boxShadow: "0 6px 22px -14px rgba(60,90,60,0.35)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 56px)",
          left: 0,
          right: 0,
          textAlign: "center",
          color: "#7FB089",
          fontSize: 16,
          letterSpacing: "0.18em",
          fontWeight: 500,
        }}
      >
        织岁 · 编织岁月诗
      </div>
    </div>
  );
}
