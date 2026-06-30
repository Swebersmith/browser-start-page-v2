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

本项目已包含 `wrangler.jsonc`，使用 Cloudflare Workers Static Assets。

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

快捷方式和小组件保存在浏览器本地 `localStorage` 中。换电脑或换浏览器时，快捷方式可以用页面右上角的“导出”和“导入”迁移数据。

## 小组件

页面支持三类小组件：

- 便签：记录短文字。
- 倒计时：内容填写日期，例如 `2026-12-31`。
- 链接：内容填写网址，双击组件可打开。
