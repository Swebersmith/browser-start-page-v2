# 项目维护说明

这是一份给后续继续修改项目时看的参考说明。当前项目是一个蜡笔小新风格的浏览器起始页，已经部署到 Cloudflare Workers，并接入 Cloudflare D1 做多设备同步。

## 当前项目状态

- GitHub 仓库：`https://github.com/Swebersmith/browser-start-page`
- 线上地址：`https://xx.webber.qzz.io/`
- Cloudflare Worker 名称：`browser-start-page`
- D1 数据库名称：`browser-start-page-db`
- D1 database_id：`66afa09c-fcd4-408b-9744-9861252ddd5a`
- D1 binding 名称：`DB`

## 主要功能

- 主搜索框，支持 Google、Bing、百度、DuckDuckGo、GitHub。
- 左侧自定义搜索引擎下拉菜单。
- 快捷方式分组、添加、编辑、删除、导入、导出。
- 自定义小组件：便签、倒计时、链接。
- 当前时间和天气面板。
- 蜡笔小新风格图片横幅和插画视觉。
- 多设备同步：输入同一个同步码后，不同设备会同步快捷方式和小组件。

## 文件结构

```txt
index.html                 页面结构
styles.css                 页面样式和响应式布局
script.js                  前端交互、天气、快捷方式、小组件、同步逻辑
src/worker.js              Cloudflare Worker API，处理 /api/sync/:syncKey
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

Cloudflare GitHub 自动部署建议配置：

```txt
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
Output directory: dist
```

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
- `scheduleCloudSave()`：快捷方式或小组件变更后延迟同步。

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
  "widgets": []
}
```

同步码相当于这份数据的简单密码。不同设备输入同一个同步码，就读写同一条 D1 记录。

## 同步排错

如果页面提示同步失败，优先检查 API：

```bash
curl.exe -i "https://xx.webber.qzz.io/api/sync/codex-debug-key"
```

正常未创建数据时应返回：

```json
{"exists":false,"payload":null,"updatedAt":null}
```

测试写入：

```bash
curl.exe -i -X PUT "https://xx.webber.qzz.io/api/sync/codex-debug-key" ^
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
- 小组件更多类型，比如 RSS、服务器状态、备忘录。
- 天气城市手动选择，避免每次依赖浏览器定位。
- D1 数据版本号，解决多设备同时编辑覆盖问题。

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
