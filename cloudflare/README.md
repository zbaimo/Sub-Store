# Sub-Store Cloudflare Workers 部署指南

本目录包含将 Sub-Store 部署到 Cloudflare Workers 的所有必要文件，使用 KV 存储管理订阅数据。

## 📁 文件说明

```
cloudflare/
├── worker.js          # Cloudflare Worker 主程序 (完整 KV 模式)
├── wrangler.toml      # Wrangler 配置文件
└── README.md          # 本部署文档
```

## 🚀 快速部署

### 前置要求

1. **Cloudflare 账号** - 访问 [dash.cloudflare.com](https://dash.cloudflare.com/sign-up) 注册
2. **Account ID** - 在 Cloudflare 首页复制
3. **API Token** - 访问 [API Tokens](https://dash.cloudflare.com/profile/api-tokens) 创建（使用 "Edit Cloudflare Workers" 模板）
4. **KV 命名空间** - 访问 [KV Namespaces](https://dash.cloudflare.com/?to=/:account/workers/kv/namespaces) 创建

### 方式一: GitHub 一键部署 (推荐)

#### 步骤 1: Fork 仓库

点击 GitHub 页面右上角 **Fork** 按钮，将仓库 Fork 到你的账号。

#### 步骤 2: 配置 Secrets

1. 进入 Fork 的仓库 → **Settings** → **Secrets and variables** → **Actions**
2. 添加以下 Secrets:

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `CF_API_TOKEN` | 你的 API Token | 用于部署 Worker |
| `CF_ACCOUNT_ID` | 你的 Account ID | Cloudflare 账号 ID |

#### 步骤 3: 配置 wrangler.toml

编辑 `cloudflare/wrangler.toml`:

```toml
name = "sub-store"
main = "cloudflare/worker.js"
compatibility_date = "2024-01-01"

[vars]
# KV 模式: 留空
UPSTREAM_URL = ""

# 认证令牌 (强烈建议设置)
AUTH_TOKEN = "your-secret-token-here"

# 缓存时间 (秒)
CACHE_TTL = "300"

[[kv_namespaces]]
binding = "SUB_STORE_KV"
id = "这里填入你的KV_NAMESPACE_ID"
```

**注意:**
- `AUTH_TOKEN` 用密码管理器生成随机字符串
- `id` 填入前面创建的 KV Namespace ID

#### 步骤 4: 触发部署

1. 推送修改到 `main` 分支会自动触发
2. 或手动触发: **Actions** → **Deploy to Cloudflare Workers** → **Run workflow**

#### 步骤 5: 访问 Worker

部署成功后，访问:
```
https://sub-store.你的ACCOUNT_ID.workers.dev
```

### 方式二: 本地 Wrangler CLI 部署

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录
wrangler login

# 3. 创建 KV 命名空间 (如果还没创建)
wrangler kv:namespace create SUB_STORE_KV
# 复制输出的 id

# 4. 编辑 wrangler.toml, 填入 KV id 和 AUTH_TOKEN

# 5. 本地测试
wrangler dev

# 6. 部署
wrangler deploy

# 7. 查看部署信息
wrangler deploy --dry-run
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `UPSTREAM_URL` | 上游 Sub-Store 地址 (代理模式, 留空使用 KV 模式) | `""` |
| `AUTH_TOKEN` | 认证令牌 | `""` |
| `CACHE_TTL` | 缓存时间 (秒) | `300` |
| `PATH_PREFIX` | 路径前缀 | `""` |

### KV 存储结构

Worker 会自动在 KV 中存储以下数据:

```
sub-store:settings         → 全局设置
sub-store:subs             → 订阅列表
sub-store:collections      → 组合订阅列表
sub-store:files            → 文件列表
sub-store:modules          → 模块列表
sub-store:artifacts        → 产物列表
sub-store:rules            → 规则列表
sub-store:tokens           → 令牌列表
sub-store:archives         → 归档数据
sub-store:cached-resource  → 资源缓存
sub-store:cached-headers   → 头缓存
sub-store:cached-scripts   → 脚本缓存
sub-store:logs             → 日志
sub-store:positions        → 位置信息
```

## 📖 使用方式

### 1. 访问欢迎页面

打开浏览器访问你的 Worker URL，会看到一个包含所有 API 文档的欢迎页面。

### 2. 创建订阅

```bash
# 创建远程订阅
curl -X POST "https://sub-store.xxx.workers.dev/api/subs?token=your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-airport",
    "url": "https://your-airport.com/sub/link",
    "source": "remote"
  }'

# 创建本地订阅
curl -X POST "https://sub-store.xxx.workers.dev/api/subs?token=your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "local-nodes",
    "content": "vmess://xxx\ntrojan://xxx",
    "source": "local"
  }'
```

### 3. 下载订阅

```bash
# Clash.Meta (mihomo) 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Clash.Meta&token=your-token"

# sing-box 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=sing-box&token=your-token"

# Surge 格式
curl "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Surge&token=your-token"

# 下载组合订阅
curl "https://sub-store.xxx.workers.dev/api/download/collection/all-subs?target=Clash.Meta&token=your-token"
```

### 4. 管理订阅

```bash
# 查看订阅列表
curl "https://sub-store.xxx.workers.dev/api/subs?token=your-token"

# 更新订阅
curl -X PUT "https://sub-store.xxx.workers.dev/api/subs/my-airport?token=your-token" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://new-url.com/sub"}'

# 删除订阅
curl -X DELETE "https://sub-store.xxx.workers.dev/api/subs/my-airport?token=your-token"
```

### 5. 在客户端中使用

**Clash.Meta (mihomo):**
```yaml
proxy-providers:
  sub-store:
    type: http
    url: "https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Clash.Meta&token=your-token"
    interval: 3600
    path: ./sub-store.yaml
```

**Surge:**
```ini
[Proxy]
Sub-Store = http, sub-store.xxx.workers.dev, /api/download/sub/my-airport?target=Surge&token=your-token
```

**Loon:**
```ini
[Remote Proxy]
Sub-Store = https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Loon&token=your-token
```

**Shadowrocket:**
添加订阅 URL:
```
https://sub-store.xxx.workers.dev/api/download/sub/my-airport?target=Shadowrocket&token=your-token
```

## 🔐 安全建议

1. **务必设置 `AUTH_TOKEN`**, 防止未授权访问
2. 不要在代码中硬编码敏感信息, 使用 Cloudflare 环境变量
3. 定期更换认证令牌
4. 如需绑定自定义域名, 在 Cloudflare 控制台添加即可

## 🔧 高级配置

### 自定义域名

1. 在 Cloudflare Dashboard → Workers → 你的 Worker → Triggers
2. 添加自定义域名, 例如: `sub.yourdomain.com`
3. Cloudflare 会自动处理 SSL 证书

### 缓存优化

- GET 请求会被自动缓存
- 缓存时间由 `CACHE_TTL` 控制
- 缓存命中时会返回 `X-Cache: HIT` 头

### 日志查看

```bash
# 实时查看 Worker 日志
wrangler tail
```

## 📋 API 端点

### 订阅管理

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/subs` | 获取所有订阅 |
| POST | `/api/subs` | 创建订阅 |
| PUT | `/api/subs/:name` | 更新订阅 |
| DELETE | `/api/subs/:name` | 删除订阅 |

### 组合订阅

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/collections` | 获取所有组合 |
| POST | `/api/collections` | 创建组合 |
| PUT | `/api/collections/:name` | 更新组合 |
| DELETE | `/api/collections/:name` | 删除组合 |

### 下载

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/download/sub/:name` | 下载单条订阅 |
| GET | `/api/download/collection/:name` | 下载组合订阅 |

### 其他

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

## 📤 支持的输出格式 (target 参数)

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

## 🐛 故障排除

### 部署失败

- 检查 `CLOUDFLARE_API_TOKEN` 是否正确
- 确保 Token 有 Workers 编辑权限
- 查看 GitHub Actions 日志

### 500 错误

- 查看 Worker 实时日志: `wrangler tail`
- 检查 KV 命名空间是否正确绑定

### 401 错误

- 检查 URL 中的 `token` 参数是否正确
- 确认 `AUTH_TOKEN` 配置一致

### KV 写入失败

- 检查 KV Namespace ID 是否正确
- 确认免费版配额未用完（1GB 存储, 1000 写入/分钟）

## 📝 注意事项

1. Cloudflare Workers 免费版有每日 10 万次请求限制
2. KV 存储免费版 1GB 容量限制
3. Worker 脚本执行时间限制 10ms (免费版) / 30s (付费版)
4. 此版本为轻量级 KV 模式, 不包含 Sub-Store 完整的后端功能（如节点解析、高级过滤等）

## 🔄 升级 Worker

当仓库有更新时：

```bash
# 同步上游
git remote add upstream https://github.com/sub-store-org/Sub-Store.git
git fetch upstream
git merge upstream/main
git push

# GitHub Actions 会自动部署
```

## 🔗 相关链接

- [Sub-Store 官方文档](https://github.com/sub-store-org/Sub-Store)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
- [KV 存储文档](https://developers.cloudflare.com/workers/runtime-apis/kv/)
