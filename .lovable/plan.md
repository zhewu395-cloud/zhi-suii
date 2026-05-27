## 问题诊断

当前 `ParticleBurst.tsx` 的椭圆闪现 + 延迟来自三处：

1. **`petal-burst` 关键帧的 0%→18% 段**：所有粒子在中心点先 `scale(0.45) → scale(1.05)` 并带 `blur(2px)`，几十上百个粒子叠在同一坐标 → 在前 ~0.3s 形成一个模糊的椭圆光团，之后才向外飞。
2. **每粒子 `delay = rand(0, 0.14s)`**：导致"先有团、后扩散"的视觉延迟。
3. **初始 `opacity: 0` + 18% 才达到目标透明度**：让那团模糊存在感更强。

## 修复方案（只改 `src/components/shiji/ParticleBurst.tsx`，不改颜色 / 数量 / 形状 / 调色板 / 触发点逻辑）

### 1. 重写关键帧：零延迟、即刻向外
把 `petal-burst` 改成"从中心点立即以目标透明度向外飞"，去掉初始 scale-up 和初始 blur：

```text
0%   → translate(-50%,-50%) scale(1)    opacity: var(--op)   无 blur
70%  → 已飞行至 70% 位移                opacity: var(--op)*0.85
100% → translate(tx,ty) rotate scale(0.55)  opacity: 0
```

关键点：
- 起点直接是目标 scale 和目标不透明度，**没有"先聚团再炸开"阶段**。
- 把每粒子的 `filter: blur(...)` 改成只用于水墨晕染那一类（blot / leaf），并且 blur 只放在静态 style 上、不再叠加在初始关键帧上 → 不会出现"中心一团模糊椭圆"。

### 2. 删除粒子延迟
- 把 `delay = rand(0, full ? 0.25 : 0.14)` 改成 `delay = 0`（full 模式保留极小错峰 `rand(0, 0.06)` 以免锯齿感，可选）。
- 这样点击后 0ms 所有粒子同时从中心向四面八方发射。

### 3. 起步即扩散（消灭"等待形态"）
为防止首帧 60Hz 渲染前所有粒子在 (0,0) 叠成一坨，把关键帧 0% 的 transform 改为已经带一个非常小的向外初始位移：

```text
0% → translate(calc(-50% + var(--tx)*0.05), calc(-50% + var(--ty)*0.05)) scale(1)
```

即首帧粒子就已位于"飞向终点 5%"处，配合每个粒子各自 `--tx/--ty` 方向不同 → **首帧就是发散态，不可能构成椭圆轮廓**。

### 4. 触发层保持不变
`TodosPage.tsx` 中以 `data-todo-row` 的几何中心作为 `fireBurst({x,y})` 已经满足"虚拟中心点、透明、无体积、无背景"的要求，不需要改任何 DOM。任务条本身的变暗（`filter: brightness(0.96)`）通过 React state 在后台静默执行，与粒子图层（`fixed inset-0 z-50 pointer-events-none`）完全解耦，不会互相干扰。

### 5. 不动的内容（明确边界）
- 颜色数组 `GREENS` / `SPARKS` —— 不动
- 粒子种类比例（leaf-l / leaf-s / stroke / blot / spark）—— 不动
- 粒子数量（75 / 220）—— 不动
- `leafRadius()` 不规则形状 —— 不动
- `Halo` 已为 `null` —— 不动
- 触发坐标计算 —— 不动

## 验证
改完后在预览中点击一个待办，预期：
- 点击瞬间画面立刻出现向外飞散的彩色叶片 / 微光，无任何椭圆 / 长条 / 模糊光团过渡帧。
- 待办条本身仍在背景静默变暗 / 沉底。
