/**
 * 优雅细长绿色叶子返回按钮 —— 带叶柄、有弧度、纤细
 */
export function LeafBack({
  onClick,
  className = "",
  ariaLabel = "返回",
}: {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className={`group inline-grid h-10 w-10 place-items-center rounded-full active:scale-90 transition ${className}`}
    >
      <svg
        viewBox="0 0 40 40"
        className="h-8 w-8 text-primary transition-transform group-hover:-translate-x-0.5"
        fill="none"
      >
        {/* 叶柄 —— 弧度纤细 */}
        <path
          d="M34 8 C 28 14, 22 20, 14 30"
          stroke="oklch(0.55 0.10 148)"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
        {/* 叶片 —— 细长水滴形，带弧度 */}
        <path
          d="M34 8
             C 22 9, 12 16, 7 30
             C 18 27, 27 21, 32 14
             C 33 12, 33.6 10, 34 8 Z"
          fill="currentColor"
          fillOpacity="0.78"
          stroke="oklch(0.55 0.10 148)"
          strokeWidth="0.9"
        />
        {/* 主脉 */}
        <path
          d="M34 8 C 26 14, 18 21, 10 28"
          stroke="oklch(0.98 0.018 110)"
          strokeWidth="0.8"
          strokeLinecap="round"
          opacity="0.75"
        />
      </svg>
    </button>
  );
}
