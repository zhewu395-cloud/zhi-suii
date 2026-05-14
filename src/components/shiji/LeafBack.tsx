/**
 * 优雅细长绿色叶子返回按钮（带叶柄、弧度）
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
        viewBox="0 0 32 32"
        className="h-7 w-7 text-primary drop-shadow-sm transition-transform group-hover:-translate-x-0.5"
        fill="none"
      >
        {/* 叶柄 */}
        <path
          d="M27 6 C 22 10, 16 14, 10 22"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* 叶片：细长带弧度 */}
        <path
          d="M27 6 C 18 7, 9 14, 5 26 C 16 24, 24 17, 27 6 Z"
          fill="currentColor"
          fillOpacity="0.85"
        />
        {/* 主脉 */}
        <path
          d="M27 6 C 20 12, 13 19, 7 24"
          stroke="oklch(0.98 0.02 105)"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.7"
        />
      </svg>
    </button>
  );
}
