## 目标
解决内容上滑时直接撞到/被顶部标题（时迹/待办/复盘/总结）硬切的突兀感，让标题位置、字号、字重完全不变，但内容滑过顶部时优雅淡出。

## 改动

### `src/components/ShijiApp.tsx`
仅给 `<main>` 增加一段 CSS mask，让滚动容器顶部 24px 范围内的内容呈现从透明到不透明的渐变。这样：
- 标题区不需要任何背景/毛玻璃，柳绿背景图保持通透；
- 内容在接近标题时自然淡出，不会出现硬边遮挡；
- 标题、设置按钮、布局、间距完全不动。

```tsx
<main
  className="relative z-10 flex-1 overflow-y-auto px-4 pb-28"
  style={{
    WebkitMaskImage:
      "linear-gradient(180deg, transparent 0, #000 24px, #000 100%)",
    maskImage:
      "linear-gradient(180deg, transparent 0, #000 24px, #000 100%)",
  }}
>
```

## 不动
- `src/styles.css`
- 任何子页面（EventsPage / TodosPage / ReviewPage / SummaryPage / TimerPage）
- header 标题文字、字号、按钮样式
- 底部导航
