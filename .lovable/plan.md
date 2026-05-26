# 让"时迹"永久可用 — 小白部署指南

## 你的目标
- ✅ 数据 100% 本地储存（已实现：IndexedDB）
- ✅ 即使 Lovable 账号丢失或项目删除，链接仍然有效
- ✅ 可以分享给大量人使用，无需登录

## 为什么 Netlify 之前失败
你的项目用的是 **TanStack Start**（带 SSR 的全栈框架），不是普通静态网站。Netlify 默认按静态站点解析就报错了。

✅ **推荐方案：Cloudflare Pages**
项目里已经有 `wrangler.jsonc` 配置文件，原生支持 Cloudflare，免费 + 全球 CDN + 永久可用。

---

## 完整操作步骤

### 第 1 步：把代码推到 GitHub（一次性，约 2 分钟）
1. 在 Lovable 编辑器，点左下角聊天框的 **➕** → **GitHub** → **Connect project**
2. 授权 Lovable 的 GitHub App
3. 选择你的 GitHub 账号 → 点 **Create Repository**
4. 完成后你会得到一个仓库地址，类似 `github.com/你的名字/shiji`

> 🔒 代码现在永久存在 GitHub，Lovable 出任何问题都不影响

### 第 2 步：注册 Cloudflare（免费，约 1 分钟）
1. 打开 https://dash.cloudflare.com/sign-up 用邮箱注册
2. 登录后，左侧菜单点 **Workers & Pages**

### 第 3 步：连接 GitHub 到 Cloudflare Pages
1. 点 **Create application** → 切到 **Pages** 标签 → **Connect to Git**
2. 授权 Cloudflare 访问你的 GitHub
3. 选择刚才创建的 `shiji` 仓库
4. 在构建设置页面填写：
   - **Framework preset**：选 `None`
   - **Build command**：`bun run build`
   - **Build output directory**：`.output/public`
   - 其他留空
5. 点 **Save and Deploy**，等 2–5 分钟

### 第 4 步：拿到永久链接
构建成功后会得到一个网址，类似：
**`https://shiji.pages.dev`**

把这个链接发给任何人，打开就能用，**无需登录、永久免费、无限分享**。

### 第 5 步（可选）：绑定自己的域名
如果你买了域名（如 `shiji.com`）：
- Cloudflare Pages 项目 → **Custom domains** → 添加域名 → 按提示改 DNS

---

## 之后怎么更新
在 Lovable 改代码 → 自动同步到 GitHub → Cloudflare Pages 自动重新部署。
**链接永远不变，全程零操作。**

---

## 双保险：让账号丢失也不怕
1. **GitHub 仓库设为 Public**：即使你账号被封，别人能 fork 代码继续部署
2. **定期点 App 内"导出备份"**：JSON 文件存云盘/邮箱，换设备一键导入

---

## 我能帮你做的（点 Approve 后执行）
1. 检查 `wrangler.jsonc`、`package.json` 的 build 脚本是否对 Cloudflare Pages 完全兼容
2. 在项目里创建一份 `部署说明.md`，把上面的步骤永久存进代码里，方便你随时翻看
3. 确认 build 输出路径是 `.output/public`（如果不是，帮你调整配置）

> ⚠️ 注意：**注册 Cloudflare、连接 GitHub 这些必须你本人在浏览器操作**，我无法代劳。但每一步卡住都可以截图发我，我帮你诊断。
