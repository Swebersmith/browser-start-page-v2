# 快捷浏览器首页

一个可以部署到 VPS 的静态浏览器起始页，包含搜索引擎切换、快捷方式分组、添加/编辑/删除、导入/导出、搜索偏好和多设备同步。

搜索框上沿使用生成的六角色透明插画，素材与生成提示词保存在 `assets/illustrations/`；构建时会自动复制实际引用的图片。

## 本地打开

直接用浏览器打开 `index.html` 即可。

如果要先生成部署产物：

```bash
npm install
npm run build
```

生成后的文件在 `dist/` 目录。

## 部署到 VPS

### 方式一：Nginx 静态站点

1. 把整个目录上传到 VPS，例如：

```bash
scp -r . root@你的服务器IP:/var/www/launchpad
```

2. 安装 Nginx：

```bash
apt update
apt install -y nginx
```

3. 创建站点配置：

```nginx
server {
    listen 80;
    server_name 你的域名;
    root /var/www/launchpad;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

4. 启用配置并重载：

```bash
ln -s /etc/nginx/sites-available/launchpad /etc/nginx/sites-enabled/launchpad
nginx -t
systemctl reload nginx
```

5. 如果有域名，建议配置 HTTPS：

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d 你的域名
```

### 方式二：Docker

在 VPS 上进入项目目录后运行：

```bash
docker run -d --name launchpad -p 8080:80 -v "$PWD":/usr/share/nginx/html:ro nginx:alpine
```

然后访问 `http://你的服务器IP:8080`。

## 部署到 Cloudflare Workers

本项目已包含 `wrangler.jsonc`，使用 Cloudflare Workers Static Assets。推荐直接在 Cloudflare Workers 里连接 GitHub 仓库自动部署。

项目包含 Worker API：

- `GET /api/sync/:syncKey`：按同步码读取快捷方式和偏好设置。
- `PUT /api/sync/:syncKey`：按同步码保存快捷方式和偏好设置。

未配置 D1 数据库时，网页仍可正常打开，但同步面板会提示数据库未配置。

### GitHub 自动部署

1. 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 打开 **Workers & Pages** → **Create** → **Workers** → **Import a repository**（连接 Git）。
3. 首次连接需要授权 Cloudflare 的 GitHub App。本仓库是**私有仓库**，授权时务必勾选 `Swebersmith/browser-start-page-v2`，否则仓库列表里看不到它。
4. 选择仓库 `Swebersmith/browser-start-page-v2`，生产分支选择 `main`。
5. 进入 **Settings → Build**，确认构建配置：

```txt
Build command:  npm run build
Deploy command: npx wrangler deploy
Root directory: /
```

Workers Builds 会使用 `package.json` 里声明的 Wrangler 版本（本项目为 `^4.0.0`）。

`wrangler.jsonc` 已经把 `./dist` 配置成 Workers Static Assets 的发布目录，所以**不需要**再填 Output directory。之后每次推送到 `main` 分支，Cloudflare 都会自动重新构建并部署。

### 多设备同步（v2 已配置完成）

v2 使用独立的 D1 数据库，已经创建完成并跑过建表迁移，`wrangler.jsonc` 里也已经绑定好，正常情况下不需要再改动：

```txt
Worker 名称：browser-start-page-v2
D1 数据库：  browser-start-page-db-v2
binding：    DB（必须保持这个名字，Worker 代码里用的是 env.DB）
```

如果需要另外重建一套环境：

1. 创建数据库：`npx wrangler d1 create browser-start-page-db-v2`
2. 把输出的 `database_id` 填进 `wrangler.jsonc`，`binding` 必须保持为 `DB`。
3. 推送到 GitHub，Workers 会自动重新部署。
4. 运行一次迁移建表：

```bash
npm install
npm run db:migrate
```

如果不想在本地运行命令，也可以在 Cloudflare D1 控制台手动执行 `migrations/0001_sync_profiles.sql` 里的 SQL。

同步使用方式：

1. 打开网页。
2. 在“同步码”输入框输入一个只有你知道的同步码。
3. 如果是新同步码，填写“创建密码”后点击“启用同步”；已有同步码无需创建密码。
4. 其他设备输入同一个同步码并点击“拉取云端”，即可使用同一份快捷方式和偏好设置。

同步码相当于这份数据的简单密码，请不要使用太短或公开的同步码。

创建密码只在服务端通过 Cloudflare Secret `SYNC_CREATE_PASSWORD` 配置，不保存在网页代码或同步数据里。部署新环境时运行以下命令，并在隐藏输入提示中设置密码：

```bash
npx wrangler secret put SYNC_CREATE_PASSWORD
```

未配置该 Secret 时会拒绝创建新同步码，已有同步码仍可正常读取和更新。

### 本地手动部署

```bash
npm install
npm run build
npx wrangler login
npx wrangler deploy
```

也可以直接运行：

```bash
npm run deploy:cloudflare
```

## 部署到 Vercel

本项目已包含 `vercel.json`。

```bash
npm install
npm run build
npx vercel --prod
```

也可以直接运行：

```bash
npm run deploy:vercel
```

## 数据说明

未启用同步时，快捷方式和偏好设置保存在浏览器本地 `localStorage` 中。换电脑或换浏览器时，快捷方式可以用工具条的“导出”和“导入”迁移数据。

启用同步并配置 D1 后，快捷方式和偏好设置会同时保存到 Cloudflare D1，同步码相同的设备会读取同一份云端数据。

## 设置入口

页面右上角的设置按钮位于暗色模式按钮下方。设置弹窗集中管理站名、默认分组、搜索结果在本标签页或新标签页打开、搜索引擎和同步码。点击弹窗外部或按 Escape 可以关闭。

小组件功能已移除；同步协议中的旧字段仅做兼容透传，避免覆盖历史数据。
