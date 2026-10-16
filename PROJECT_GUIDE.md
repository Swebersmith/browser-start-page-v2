# 项目维护说明

这是一份给后续继续修改项目时看的参考说明。当前项目是一个蜡笔小新风格的浏览器起始页，已经部署到 Cloudflare Workers，并接入 Cloudflare D1 做多设备同步。

> 本仓库是从 `Swebersmith/browser-start-page`（v1）复制出来的 **v2 迭代仓库**。
> v2 使用**独立的** Worker 与 D1 数据库，因此在这里改动不会影响 v1 的线上站点。
> v1 的原仓库仍然保留在 `upstream` remote 中，方便对照。

## 当前项目状态

- GitHub 仓库：`https://github.com/Swebersmith/browser-start-page-v2`
- 上游 v1 仓库：`https://github.com/Swebersmith/browser-start-page`
- 线上地址：`待配置（v2 尚未部署）`
- Cloudflare Worker 名称：`browser-start-page-v2`
- D1 数据库名称：`browser-start-page-db-v2`
- D1 database_id：`dfeb69d9-c949-406e-94d4-dc27c656c029`（region: WNAM，已建表）
- D1 binding 名称：`DB`

### v1 线上环境（仅供参考，不要在此仓库改动）

- v1 线上地址：`https://xx.webber.qzz.io/`
- v1 Worker 名称：`browser-start-page`
- v1 D1 数据库名称：`browser-start-page-db`
- v1 D1 database_id：`66afa09c-fcd4-408b-9744-9861252ddd5a`

## 主要功能

- 主搜索框，支持 Google、Bing、百度、DuckDuckGo、GitHub。
- 左侧自定义搜索引擎下拉菜单。
- 快捷方式分组、添加、编辑、删除、导入、导出。
- 当前时间、可展开的天气面板（当前、7 天、24 小时），支持城市搜索和定位。
- 历史上的今天详情、并行源回退与按日期缓存。
- AI 指令整理、新分组预览、可撤销应用。
- 五个角色与小白趴在搜索框上沿的透明简笔插画。
- 多设备同步：输入同一个同步码后，不同设备会同步快捷方式、搜索历史和偏好设置。
- 创建新同步码需要服务端密码；已有同步码照常连接。密码使用 Cloudflare Secret `SYNC_CREATE_PASSWORD`，不要写入前端、仓库或同步载荷。

## 文件结构

```txt
index.html                 页面结构
styles.css                 页面样式和响应式布局
script.js                  快捷方式、设置、同步与共享来源弹性动画
dashboard.js               天气、城市搜索、历史详情及本机缓存
ai-ui.js                   AI 指令、预览、取消与撤销
organize.js                AI 结果校验与数据保留规则
src/worker.js              Cloudflare Worker API，处理 /api/sync/:syncKey
src/content.js             天气与历史代理、同日 D1 缓存、详情
wrangler.jsonc             Cloudflare Workers 配置，包含 Static Assets 和 D1 绑定
package.json               构建、部署、D1 迁移命令
scripts/build.mjs          构建脚本，把静态文件复制到 dist/
migrations/0001_sync_profiles.sql
                           D1 建表 SQL
assets/                    官方角色图片
assets/custom/             用户提供并整理后的图片
dist/                      构建产物，不提交 Git
```

## 本地常用命令

```bash
npm install
npm run build
npm test
node --check script.js
node --check src/worker.js
npx wrangler deploy --dry-run
```

本机 PowerShell 可能禁止直接运行 `npm`，如果遇到执行策略问题，用：

```bash
npm.cmd run build
npx.cmd wrangler deploy --dry-run
```

## Cloudflare Workers 部署

项目使用 Workers Static Assets：

- `wrangler.jsonc` 里 `assets.directory` 指向 `./dist`
- `src/worker.js` 负责 API
- `run_worker_first: ["/api/*"]` 确保 API 请求进入 Worker

Cloudflare GitHub 自动部署建议配置（在 Worker 的 **Settings → Build** 里设置）：

```txt
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

不需要填 Output directory：`wrangler.jsonc` 已经把 `./dist` 配置成 Static Assets 的发布目录。
注意本仓库是私有仓库，GitHub App 授权时要勾选 `Swebersmith/browser-start-page-v2`。

每次修改后：

```bash
git add .
git commit -m "你的提交说明"
git push
```

Cloudflare 会自动重新部署。

## 多设备同步逻辑

前端同步入口在 `script.js`：

- `SYNC_KEY`：保存当前设备使用的同步码。
- `requestSync()`：请求 Worker API。
- `pullCloudData()`：从云端拉取数据。
- `pushCloudData()`：把本地数据保存到云端。
- `scheduleCloudSave()`：快捷方式或偏好设置变更后延迟同步。

Worker API 在 `src/worker.js`：

```txt
GET /api/sync/:syncKey
PUT /api/sync/:syncKey
```

D1 表：

```sql
CREATE TABLE IF NOT EXISTS sync_profiles (
  sync_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

`payload` 存的是：

```json
{
  "shortcuts": [],
  "widgets": [],
  "searchHistory": [],
  "siteName": "快捷首页",
  "defaultCategory": "常用",
  "engines": []
}
```

> ⚠️ `src/worker.js` 的 `handleSync` 在写入前会**重建**这份 JSON（见 `buildSyncPayload`）。
> 之前它只写回 `shortcuts` / `widgets` / `searchHistory`，导致前端新增的站名等字段
> 发了也存不进 D1。**以后往同步里加字段，必须同时改 `buildSyncPayload` 和
> `isValidPayload`**，只改前端是没用的。

同步码相当于这份数据的简单密码。不同设备输入同一个同步码，就读写同一条 D1 记录。

小组件功能已删除。前端仅用 `legacyWidgets` 透传旧版 `widgets` 字段，拉取时保存在原本的 localStorage 键中；没有小组件界面、模板或编辑逻辑。这样继续同步其他设置时不会清空历史记录，也兼容现有 Worker 协议。

## AI 整理快捷方式

入口在快捷方式工具条的「AI 整理」按钮，默认接 DeepSeek。

- 请求通过本站 Worker 的 `POST /api/ai` 转发；前端是 JavaScript 模块，本地调试运行 `npm run build` 和 `npx wrangler dev`。
- `ai-ui.js` 保存本机指令草稿，支持用途/域名/学习预设，发送名称、网址、域名、路径、分组、置顶和访问记录；勾选后才补充最多 20 项网站标题与简介。
- `organize.js` 只接受已有 id，不允许改写网址；遗漏项自动恢复，去重只合并完全相同的网址（路径、参数区分大小写），保留图标、颜色和访问记录。
- 应用前检查快捷方式是否在预览期间发生变化；应用后保存本机撤销快照，后续编辑会使旧撤销入口失效。
- `/api/ai` 只做透传，**不保存 API Key**；Key 存在浏览器 localStorage
  （`browser-launchpad-ai-config-v1`），**不参与同步**。
- 接口地址、模型名、Key 都可以在弹窗的「模型设置」里改，任何 OpenAI 兼容接口都行。
- Worker 侧有一层 SSRF 防护：只允许公开的 https 地址，内网/回环地址会被拒。

## 偏好设置

右上角设置按钮与暗色模式按钮位于同一列、排在其下方，点击后打开设置弹窗，集中修改偏好并管理多设备同步：

- **站名**：即浏览器标签页标题（`document.title`），会跟随同步码同步。
  默认是「快捷首页」；`index.html` 的 head 内联脚本会在样式与主脚本加载前读取本机保存的名称，刷新时直接显示已设置的站名。已有自定义站名继续保留。
- **默认分组**：进入页面时默认选中哪个快捷方式分组；分组被删掉后自动回退到「全部」。
- **搜索引擎**：自定义搜索引擎（名称 / 图标文字 / 搜索地址），会追加到搜索框
  左侧的切换菜单里，也会同步。

设置中的「搜索打开方式」下拉框支持：

- `本标签页`：搜索结果在当前页面加载（`window.open(url, "_self")`）。
- `新标签页`：搜索结果在新标签页打开（`window.open(url, "_blank")`）。

两种状态存在 `prefs.searchTarget`（`_self` / `_blank`），跟随同步码同步。
`runSearch()` 里的网址直跳和搜索引擎跳转都会走这个设置。

## 同步排错

如果页面提示同步失败，优先检查 API：

```bash
curl.exe -i "https://你的-v2-域名/api/sync/codex-debug-key"
```

正常未创建数据时应返回：

```json
{"exists":false,"payload":null,"updatedAt":null}
```

测试写入：

```bash
curl.exe -i -X PUT "https://你的-v2-域名/api/sync/codex-debug-key" ^
  -H "content-type: application/json" ^
  --data-binary "{\"shortcuts\":[],\"widgets\":[]}"
```

如果返回 Cloudflare `1101`，通常是 Worker 运行时异常。检查 `src/worker.js`，尤其是：

- D1 binding 是否仍然叫 `DB`
- `wrangler.jsonc` 里的 database_id 是否正确
- `/api/*` 是否仍在 `run_worker_first`
- Worker 异步错误是否被 `await` 和 `try/catch` 捕获

## D1 数据库说明

当前 D1 已创建并建表完成。之前同步失败的根因是 Worker 里用 `env.DB.exec()` 执行多行建表 SQL，线上解析成了不完整 SQL。现在已改成：

```js
await db.prepare(schemaSql).run();
```

不要轻易改回多行 `exec()`。

## 图片说明

图片主要来自两处：

- `assets/`：之前下载的蜡笔小新官方相关图片。
- `assets/custom/`：用户放在本地文件夹后整理进项目的图片。

原始文件夹 `蜡笔小新图片/` 已加入 `.gitignore`，不会提交到 GitHub。真正用于线上的是 `assets/custom/`。

## 后续功能建议

可以继续扩展：

- 登录或管理密码，替代纯同步码。
- 给同步码加哈希存储，减少明文暴露。
- 快捷方式排序、拖拽、图标上传。
- 天气城市手动选择已实现，位置与天气缓存只保存在这台浏览器。
- D1 数据版本号，解决多设备同时编辑覆盖问题。

## 性能约束（改样式前先看这里）

这个页面的视觉成本几乎全在模糊上，几条硬约束：

1. **不要给元素随便加 `backdrop-filter`。**
   背景的 `.aurora` 光斑一直在缓慢移动，凡是压在它上面的玻璃元素，模糊每帧都要重算。
   目前只在少数几处保留（`styles.css` 里搜 `backdrop-filter` 可查）：
   `.search-zone`、`.glass-card`、弹窗卡片、下拉菜单、弹窗遮罩。
   快捷方式卡、小圆按钮、站名胶囊用的是 `--glass-flat`（不带模糊的玻璃底色），
   观感接近但省掉一次背景采样。

2. **不要给大面积元素加 `filter: blur()`。**
   `.aurora-layer` 早期用过 `blur(72px)`，那层覆盖全屏、还会被动画带着重算，
   在移动端是最大的单点开销。`radial-gradient` 本身的柔边已经够用，已去掉。

3. **触摸设备走降级分支。**
   `@media (pointer: coarse), (max-width: 860px)` 里会把所有 `backdrop-filter`
   关掉、换不透明底、停掉光斑动画、隐藏噪点层。
   这段必须留在 `styles.css` 末尾，否则会被前面的深色主题规则覆盖。

4. **动画只用 `transform` / `translate` / `opacity`**，不要动 `width`、`background-position`。

5. **`assets/` 里的大图不进 dist。**
   `scripts/build.mjs` 会扫描 `index.html` / `styles.css` / `script.js` 实际引用到的
   资源再复制，`header_*.png`、`custom/*.jpg` 只是制作头像用的源图。
   角色改为一张带透明通道的 1280×241 WebP（`assets/illustrations/kasukabe-crew.webp`，约 86KB），没有持续动画。生成提示词保存在同目录的 `README.md`，原来的头像与源图保留但不进入构建产物。

6. **移动端触摸体验**
   - `html` 上设了 `-webkit-tap-highlight-color: transparent`，去掉点击时的系统蓝色方块；
   - 交互元素带 `touch-action: manipulation`，去掉 300ms 双击缩放延迟；
   - `:focus` 关闭轮廓、只留 `:focus-visible`，鼠标/触摸点击不会再冒出方框；
   - `@media (hover: none)` 里中和了所有 hover 效果，改用 `:active` 缩放反馈，
     避免手机上点一下之后卡片卡在悬浮状态。

## 滚动与连续动效

- `index.html` 在外部样式加载前隐藏滚动条；`styles.css` 同时覆盖 Firefox 与 WebKit。隐藏的是滚动条，页面、菜单、长弹窗仍保留正常滚动。
- 首屏各区块沿同一方向依次入场，背景固定。分组切换先记录可见元素位置，再以 Web Animations API 平移至新位置，不为每张卡重复播放入场动画。
- 弹窗统一走 `openSurface()` / `closeSurface()`，对弹窗本身做开合动画，表单在原生 `close` 事件后才重置。关闭时恢复触发按钮焦点，Escape 和点击外部遮罩同样走退出动画；仅在按下与松开都位于弹窗外时关闭，内部点击或向外拖选文字不会误退出。
- 弹窗最大高度使用 `100dvh`（保留 `100vh` 回退），打开期间锁定页面滚动；触摸设备停用遮罩模糊并使用实心底色。
- 手机端缩短时长，可见元素最多同时动画 12 个，桌面最多 24 个；动画仅使用 `transform` / `opacity`。遵循系统 `prefers-reduced-motion`，正在播放时改变此设置也会取消动画。
- 设置与同步集中到 `settingsDialog`，桌面左右分栏，手机单列；内部修改站名或管理引擎时使用原生嵌套弹窗，关闭后返回设置并恢复对应按钮焦点。页面不再保留底部设置卡片。
- 搜索栏只保留左侧引擎下拉、输入框和「出发」按钮；搜索打开方式位于设置内，小组件和重复的引擎快捷按钮已移除。手机日期与时间分行，避让右上角两枚按钮。
- 回归时检查：首次加载无滚动条闪现、连续切换分组、五种弹窗的保存/取消/Escape、长内容可滚动、关闭后滚动与焦点恢复、手机横竖屏和减少动态效果模式。

## 修改时注意

- 改页面结构：优先动 `index.html`。
- 改样式：优先动 `styles.css`。
- 改前端逻辑：优先动 `script.js`。
- 改云同步 API：优先动 `src/worker.js`。
- 改 Cloudflare 配置：优先动 `wrangler.jsonc`。
- 每次涉及前端 JS 或 Worker JS，至少跑：

```bash
node --check script.js
node --check src/worker.js
npm.cmd run build
```

### ⚠️ 不要用 Windows PowerShell 5.1 读写这些源文件

`styles.css` 曾经被写成双重编码（UTF-8 被当成 GBK 解码后又存回 UTF-8），
原因是这类命令：

```powershell
# 危险：PS 5.1 的 Get-Content 对无 BOM 的 UTF-8 文件会按系统 ANSI(GBK) 解码
$c = Get-Content styles.css -Raw
$c = $c -replace 'aaa', 'bbb'
[System.IO.File]::WriteAllText('styles.css', $c, (New-Object System.Text.UTF8Encoding($false)))
```

中文字符会被毁掉（虽然 CSS 注释坏掉不影响渲染，但排查起来很费时间）。

安全做法：

- 用 VS Code / 编辑器改；
- 或写 Node 脚本（`readFileSync` / `writeFileSync` 默认就是 UTF-8）；
- 必须用 PowerShell 时，显式指定编码：
  `Get-Content -Encoding UTF8` + `Set-Content -Encoding UTF8`，
  并且**不要**在任何环节用默认编码。

### 加同步字段的检查清单

1. `script.js` 的 `getSyncPayload()` 里加字段；
2. `script.js` 的 `applyRemotePayload()` 里读取并落地到 localStorage；
3. `src/worker.js` 的 `buildSyncPayload()` 里加字段（**漏了这步等于没同步**）；
4. `src/worker.js` 的 `isValidPayload()` 里放行该字段类型；
5. 跑一次 `node --check` 并实际验证一次拉取/写回。
