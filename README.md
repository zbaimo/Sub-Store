<div align="center">
<br>
<img width="200" src="https://raw.githubusercontent.com/cc63/ICON/main/Sub-Store.png" alt="Sub-Store">
<br>
<br>
<h2 align="center">Sub-Store<h2>
</div>

<p align="center" color="#6a737d">
Advanced Subscription Manager for QX, Loon, Surge, Stash, Egern and Shadowrocket.
</p>

[![Build](https://github.com/sub-store-org/Sub-Store/actions/workflows/main.yml/badge.svg)](https://github.com/sub-store-org/Sub-Store/actions/workflows/main.yml) ![GitHub](https://img.shields.io/github/license/sub-store-org/Sub-Store) ![GitHub issues](https://img.shields.io/github/issues/sub-store-org/Sub-Store) ![GitHub closed pull requests](https://img.shields.io/github/issues-pr-closed-raw/Peng-Ym/Sub-Store) ![Lines of code](https://img.shields.io/tokei/lines/github/sub-store-org/Sub-Store) ![Size](https://img.shields.io/github/languages/code-size/sub-store-org/Sub-Store)
<a href="https://trendshift.io/repositories/4572" target="_blank"><img src="https://trendshift.io/api/badge/repositories/4572" alt="sub-store-org%2FSub-Store | Trendshift" style="width: 250px; height: 55px;" width="250" height="55"/></a>
[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/PengYM)

[📚 文档/DOC](https://github.com/sub-store-org/Sub-Store/wiki)

Core functionalities:

1. Conversion among various formats.
2. Subscription formatting.
3. Collect multiple subscriptions in one URL.
4. Host and modify subscriptions/files

> The following descriptions of features may not be updated in real-time. Please refer to the actual available features for accurate information.

## 1. Subscription Conversion

### Supported Input Formats

[本地节点怎么写/How To Write A Local Node](https://t.me/zhetengsha/824)

> ⚠️ Do not use `Shadowrocket` or `NekoBox` to export URI and then import it as input. The URIs exported in this way may not be standard URIs. However, we have already supported some very common non-standard URIs (such as VMess, VLESS).

- [x] Proxy URI Scheme(`socks5`, `socks5+tls`, `http`, `https`(it's ok))

  example: `socks5+tls://user:pass@ip:port#name`

- [x] URI(AnyTLS, SOCKS, SS, SSR, VMess, VLESS, Trojan, Hysteria, Hysteria 2, TUIC v5, WireGuard)
  > Please note, HTTP(s) does not have a standard URI format, so it is not supported. Please use other formats.
- [x] Clash Proxies YAML
- [x] Clash Proxy JSON/JSON5/YAML(single line)
  > [NaiveProxy](https://t.me/zhetengsha/4308)
- [x] QX (SS, SSR, VMess, Trojan, HTTP, SOCKS5, VLESS, AnyTLS)
- [x] Loon (SS, SSR, VMess, Trojan, HTTP, SOCKS5, SOCKS5-TLS, WireGuard, VLESS, Hysteria 2, AnyTLS)
- [x] Surge (Direct, SS, VMess, Trojan, HTTP, SOCKS5, SOCKS5-TLS, AnyTLS, TrustTunnel, TUIC, Snell, Hysteria 2, SSH(Password authentication only), External Proxy Program(only for macOS), WireGuard(Surge to Surge))
- [x] mihomo(Clash.Meta) Compatible (Direct, SS, SSR, VMess, Trojan, HTTP, SOCKS5, Snell, VLESS, WireGuard, Hysteria, Hysteria 2, TUIC, SSH, mieru, sudoku, AnyTLS, MASQUE, Tailscale)

Deprecated(The frontend doesn't show it, but the backend still supports it, with the query parameter `target=Clash`):

- [x] Clash (SS, SSR, VMess, Trojan, HTTP, SOCKS5, Snell, VLESS, WireGuard)

### Supported Target Platforms

- [x] Plain JSON
- [x] Stash
- [x] Clash.Meta(mihomo)
- [x] Surfboard
- [x] Surge
- [x] SurgeMac(Use mihomo to support protocols that are not supported by Surge itself)
- [x] Loon
- [x] Egern
- [x] Shadowrocket
- [x] QX
- [x] sing-box
- [x] V2Ray
- [x] V2Ray URI

Deprecated:

- [x] Clash

## 2. Subscription Formatting

### Filtering

- [x] **Regex filter**
- [x] **Discard regex filter**
- [x] **Region filter**
- [x] **Type filter**
- [x] **Useless proxies filter**
- [x] **Script filter**

### Proxy Operations

- [x] **Set property operator**: set some proxy properties such as `udp`,`tfo`, `skip-cert-verify` etc.
- [x] **Flag operator**: add flags or remove flags for proxies.
- [x] **Sort operator**: sort proxies by name.
- [x] **Regex sort operator**: sort proxies by keywords (fallback to normal sort).
- [x] **Regex rename operator**: replace by regex in proxy names.
- [x] **Regex delete operator**: delete by regex in proxy names.
- [x] **Script operator**: modify proxy by script.
- [x] **Resolve Domain Operator**: resolve the domain of nodes to an IP address.

## ☁️ 部署到 Cloudflare Workers (KV 模式)

本项目包含一个轻量级的 Cloudflare Workers 版本，使用 KV 存储管理订阅数据，支持从 GitHub 一键部署。

### 部署前准备

#### 1. 注册 Cloudflare 账号

访问 [Cloudflare](https://dash.cloudflare.com/sign-up) 注册免费账号。

#### 2. 获取 Account ID

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com)
2. 在首页右侧栏找到 **Account ID**
3. 点击复制，保存这个 ID（后面会用到）

#### 3. 创建 API Token

1. 访问 [API Tokens 页面](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 **Create Token**
3. 选择 **Edit Cloudflare Workers** 模板
4. 确认权限包含:
   - Account Settings: Read
   - Workers: Edit
   - KV Storage: Edit
5. 点击 **Continue to summary** → **Create Token**
6. **立即复制并保存 Token**（只显示一次，关闭后无法再次查看）

#### 4. 创建 KV 命名空间

有两种方式创建 KV 命名空间：

**方式 A: Cloudflare Dashboard（推荐新手）**

1. 访问 [KV 页面](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces)
2. 点击 **Create a namespace**
3. 输入名称: `SUB_STORE_KV`
4. 点击 **Add**
5. 创建完成后，鼠标悬停在命名空间上，点击复制 **Namespace ID**

**方式 B: Wrangler CLI**

```bash
# 安装 Wrangler (需要 Node.js)
npm install -g wrangler

# 登录
wrangler login

# 创建 KV 命名空间
wrangler kv:namespace create SUB_STORE_KV

# 输出示例:
# { binding: "SUB_STORE_KV", id: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" }
# 复制 id 的值
```

### 配置 GitHub Secrets

#### 1. Fork 本仓库

1. 点击本页面右上角的 **Fork** 按钮
2. 选择你的 GitHub 账号
3. 等待 Fork 完成

#### 2. 添加 Secrets

1. 进入你 Fork 的仓库
2. 点击 **Settings** → **Secrets and variables** → **Actions**
3. 点击 **New repository secret**
4. 依次添加以下 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `CF_API_TOKEN` | 前面创建的 API Token | 用于部署 Worker |
| `CF_ACCOUNT_ID` | 前面复制的 Account ID | 你的 Cloudflare 账号 ID |

### 配置 wrangler.toml

编辑你 Fork 的仓库中的 `cloudflare/wrangler.toml` 文件：

```toml
name = "sub-store"
main = "cloudflare/worker.js"
compatibility_date = "2024-01-01"

[vars]
# KV 模式: 留空即可
UPSTREAM_URL = ""

# 强烈建议设置认证令牌
AUTH_TOKEN = "your-secret-token-here"

# 缓存时间（秒）
CACHE_TTL = "300"

[[kv_namespaces]]
binding = "SUB_STORE_KV"
id = "这里填入你的KV_NAMESPACE_ID"
```

**重要：**
- 将 `your-secret-token-here` 替换为你自己生成的随机字符串（可以用密码管理器生成）
- 将 `YOUR_KV_NAMESPACE_ID` 替换为前面创建的 KV Namespace ID

### 一键部署

#### 方式一: GitHub Actions 自动部署（推荐）

1. **推送配置到仓库**
   ```bash
   git add cloudflare/wrangler.toml
   git commit -m "config: setup Cloudflare Worker"
   git push
   ```

2. **自动触发部署**
   - 推送到 `main` 分支会自动触发部署
   - 或手动触发: 进入 **Actions** → **Deploy to Cloudflare Workers** → **Run workflow**

3. **查看部署状态**
   - 进入 **Actions** 标签页查看部署进度
   - 成功后会显示 Worker URL

4. **访问你的 Worker**
   ```
   https://sub-store.你的ACCOUNT_ID.workers.dev
   ```

#### 方式二: 本地 Wrangler CLI 部署

```bash
# 1. 克隆你的 Fork
git clone https://github.com/你的用户名/Sub-Store.git
cd Sub-Store

# 2. 安装 Wrangler
npm install -g wrangler

# 3. 登录 Cloudflare
wrangler login

# 4. 编辑 cloudflare/wrangler.toml
# 填入 KV Namespace ID 和 AUTH_TOKEN

# 5. 本地测试
wrangler dev

# 6. 部署
wrangler deploy

# 7. 查看部署信息
wrangler deploy --dry-run
```

### 使用你的 Sub-Store Worker

#### 1. 访问欢迎页面

打开浏览器访问:
```
https://sub-store.你的ACCOUNT_ID.workers.dev
```

你会看到一个漂亮的欢迎页面，包含所有 API 端点说明。

#### 2. 创建订阅

使用 curl 或任何 HTTP 客户端创建订阅：

```bash
# 创建远程订阅
curl -X POST "https://sub-store.xxx.workers.dev/api/subs?token=your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-airport",
    "url": "https://your-airport.com/sub/link",
    "source": "remote"
  }'

# 创建本地订阅
curl -X POST "https://sub-store.xxx.workers.dev/api/subs?token=your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "local-nodes",
    "content": "vmess://xxx\ntrojan://xxx",
    "source": "local"
  }'
```

#### 3. 下载订阅

```bash
# Clash.Meta (mihomo) 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Clash.Meta&token=your-secret-token"

# sing-box 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=sing-box&token=your-secret-token"

# Surge 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Surge&token=your-secret-token"

# Loon 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Loon&token=your-secret-token"
```

#### 4. 创建组合订阅

```bash
# 创建组合订阅（合并多个订阅）
curl -X POST "https://sub-store.xxx.workers.dev/api/collections?token=your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "all-subs",
    "subscriptions": ["my-airport", "local-nodes"]
  }'

# 下载组合订阅
curl "https://sub-store.xxx.workers.dev/api/download/collection/all-subs?target=Clash.Meta&token=your-secret-token"
```

#### 5. 查看所有订阅

```bash
# 查看订阅列表
curl "https://sub-store.xxx.workers.dev/api/subs?token=your-secret-token"

# 查看组合订阅列表
curl "https://sub-store.xxx.workers.dev/api/collections?token=your-secret-token"
```

#### 6. 在客户端中使用

**Clash.Meta (mihomo):**
```yaml
proxy-providers:
  sub-store:
    type: http
    url: "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Clash.Meta&token=your-secret-token"
    interval: 3600
    path: ./sub-store.yaml
```

**Surge:**
```ini
[Proxy]
Sub-Store = http, sub-store.xxx.workers.dev, /api/download/sub/my-airport?target=Surge&token=your-secret-token
```

**Loon:**
```ini
[Remote Proxy]
Sub-Store = https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Loon&token=your-secret-token
```

**Shadowrocket:**
添加订阅 URL:
```
https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Shadowrocket&token=your-secret-token
```

### API 完整文档

#### 订阅管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subs` | 获取所有订阅 |
| POST | `/api/subs` | 创建订阅 |
| PUT | `/api/subs/:name` | 更新订阅 |
| DELETE | `/api/subs/:name` | 删除订阅 |

#### 组合订阅管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/collections` | 获取所有组合 |
| POST | `/api/collections` | 创建组合 |
| PUT | `/api/collections/:name` | 更新组合 |
| DELETE | `/api/collections/:name` | 删除组合 |

#### 下载订阅

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/download/sub/:name` | 下载单条订阅 |
| GET | `/api/download/collection/:name` | 下载组合订阅 |

#### 其他功能

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/settings` | 设置管理 |
| GET/POST/PUT/DELETE | `/api/files` | 文件管理 |
| GET/POST/DELETE | `/api/tokens` | Token 管理 |
| GET/POST/DELETE | `/api/modules` | 模块管理 |
| GET/POST/DELETE | `/api/artifacts` | 产物管理 |
| GET/POST/DELETE | `/api/rules` | 规则管理 |
| GET/POST | `/api/logs` | 日志管理 |
| GET | `/api/preview/:type/:name` | 预览订阅 |

### 支持的输出格式 (target 参数)

- `Clash.Meta` / `Clash` - Clash.Meta (mihomo) YAML
- `sing-box` - sing-box JSON
- `Surge` - Surge 配置
- `Loon` - Loon 配置
- `QX` - Quantumult X 配置
- `Shadowrocket` - Shadowrocket 配置
- `Stash` - Stash 配置
- `Surfboard` - Surfboard 配置
- `URI` - 原始 URI 列表
- `v2ray` - V2Ray 配置

### 环境变量说明

| 变量 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `UPSTREAM_URL` | string | `""` | 上游 Sub-Store 地址（代理模式） |
| `AUTH_TOKEN` | string | `""` | 认证令牌（建议设置） |
| `CACHE_TTL` | number | `300` | 缓存时间（秒） |
| `PATH_PREFIX` | string | `""` | 路径前缀（如 `/sub-store`） |

### 常见问题

#### Q: 部署失败怎么办？

1. 检查 `CF_API_TOKEN` 是否正确
2. 确认 Token 有 Workers 编辑权限
3. 查看 GitHub Actions 日志错误信息
4. 尝试本地部署: `wrangler deploy`

#### Q: 访问 Worker 返回 401

- 确认 URL 中携带正确的 `?token=YOUR_TOKEN` 参数
- 检查 `AUTH_TOKEN` 环境变量是否配置正确

#### Q: 如何更换 Worker 名称？

编辑 `cloudflare/wrangler.toml` 第一行：
```toml
name = "你想要的名称"  # 只能使用小写字母、数字和连字符
```

#### Q: 如何绑定自定义域名？

1. 在 Cloudflare Dashboard → Workers → 你的 Worker → Triggers
2. 点击 **Add Custom Domain**
3. 输入你的域名（如 `sub.example.com`）
4. Cloudflare 会自动处理 SSL 证书

#### Q: KV 存储有限制吗？

免费版限制：
- 存储容量: 1 GB
- 写入次数: 1000 次/分钟
- 读取次数: 100,000 次/分钟
- 单个值大小: 25 MB

对于个人订阅管理完全够用。

#### Q: 如何备份/迁移数据？

```bash
# 导出所有 KV 数据
wrangler kv:key list --namespace-id YOUR_ID > keys.json

# 逐个导出值
for key in $(cat keys.json); do
  wrangler kv:key get "$key" --namespace-id YOUR_ID > "data/${key}.json"
done
```

### 升级 Worker

当仓库有更新时：

1. **同步上游更新**
   ```bash
   git remote add upstream https://github.com/sub-store-org/Sub-Store.git
   git fetch upstream
   git merge upstream/main
   ```

2. **推送更新**
   ```bash
   git push
   ```

3. GitHub Actions 会自动触发部署

### 本地开发

```bash
# 安装依赖
npm install -g wrangler

# 启动本地开发服务器
wrangler dev

# 访问本地 Worker
curl http://127.0.0.1:8787

# 实时查看日志
wrangler tail
```

## Development

Install `pnpm`

Go to `backend` directories, install node dependencies:

```
pnpm i
```

```
SUB_STORE_BACKEND_API_PORT=3000 pnpm esbuild:dev
```

or this one if you're using `Termux`

```
SUB_STORE_BACKEND_API_PORT=3000 pnpm run --parallel "/^dev:.*/"
```

## Build

```
pnpm bundle:esbuild
```

## LICENSE

This project is under the GPL V3 LICENSE.

[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2FPeng-YM%2FSub-Store.svg?type=large)](https://app.fossa.com/projects/git%2Bgithub.com%2FPeng-YM%2FSub-Store?ref=badge_large)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=sub-store-org/sub-store&type=Date)](https://star-history.com/#sub-store-org/sub-store&Date)

## Acknowledgements

- Special thanks to @KOP-XIAO for his awesome resource-parser. Please give a [star](https://github.com/KOP-XIAO/QuantumultX) for his great work!
- Special thanks to @Orz-3 and @58xinian for their awesome icons.

## Sponsors

[![image](./support.nodeseek.com_page_promotion_id=8.png)](https://yxvm.com)

[NodeSupport](https://github.com/NodeSeekDev/NodeSupport) sponsored this project.
