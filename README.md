# 快捷浏览器首页

一个可以部署到 VPS 的静态浏览器起始页，包含主搜索引擎、搜索引擎切换、快捷方式分组、添加/编辑/删除、导入/导出、自定义小组件。

当前界面使用了蜡笔小新官方电影站公开页面中的角色图片，并已下载到 `assets/` 目录，部署时需要一起上传该目录。相关素材版权归原权利方所有，建议用于个人首页或内部使用。

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

- `GET /api/sync/:syncKey`：按同步码读取快捷方式和小组件。
- `PUT /api/sync/:syncKey`：按同步码保存快捷方式和小组件。

未配置 D1 数据库时，网页仍可正常打开，但同步面板会提示数据库未配置。

### GitHub 自动部署

1. 进入 Cloudflare Dashboard。
2. 打开 Workers & Pages。
3. 选择创建 Worker，并连接 GitHub 仓库 `Swebersmith/browser-start-page-v2`。
4. 使用下面的构建配置：

```txt
Build command: npm run build
Deploy command: npx wrangler deploy
Root directory: /
Output directory: dist
```

`wrangler.jsonc` 会把 `dist/` 作为 Workers Static Assets 发布目录。之后每次推送到 GitHub `main` 分支，Cloudflare 都会自动重新构建并部署。

### 启用多设备同步

1. 在 Cloudflare Dashboard 创建一个 D1 数据库，建议名称：

```txt
browser-start-page-db-v2
```

2. 进入数据库详情，复制 `database_id`。

3. 打开 `wrangler.jsonc`，取消 `d1_databases` 注释，并把 `database_id` 替换成你的真实 ID。`binding` 必须保持为 `DB`。

4. 推送到 GitHub，Cloudflare Workers 会自动重新部署。

5. 第一次部署后，运行一次 D1 迁移：

```bash
npm install
npm run db:migrate
```

如果不想在本地运行命令，也可以在 Cloudflare D1 控制台手动执行 `migrations/0001_sync_profiles.sql` 里的 SQL。

同步使用方式：

1. 打开网页。
2. 在“同步码”输入框输入一个只有你知道的同步码。
3. 点击“启用同步”。
4. 其他设备输入同一个同步码并点击“拉取云端”，即可看到同一份快捷方式和小组件。

同步码相当于这份数据的简单密码，请不要使用太短或公开的同步码。

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

未启用同步时，快捷方式和小组件保存在浏览器本地 `localStorage` 中。换电脑或换浏览器时，快捷方式可以用页面右上角的“导出”和“导入”迁移数据。

启用同步并配置 D1 后，快捷方式和小组件会同时保存到 Cloudflare D1，同步码相同的设备会读取同一份云端数据。

## 小组件

页面支持三类小组件：

- 便签：记录短文字。
- 倒计时：内容填写日期，例如 `2026-12-31`。
- 链接：内容填写网址，双击组件可打开。
