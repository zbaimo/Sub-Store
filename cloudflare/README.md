# Sub-Store Cloudflare Workers 部署指南

本目录包含将 Sub-Store 部署到 Cloudflare Workers 的所有必要文件。

## 📁 文件说明

```
cloudflare/
├── worker.js          # Cloudflare Worker 主程序
├── wrangler.toml      # Wrangler 配置文件
└── README.md          # 本部署文档
```

## 🚀 快速部署

### 方式一: GitHub 一键部署 (推荐)

1. **Fork 本仓库** 到你的 GitHub 账号

2. **创建 Cloudflare API Token**
   - 访问 https://dash.cloudflare.com/profile/api-tokens
   - 点击 "Create Token"
   - 选择 "Edit Cloudflare Workers" 模板
   - 复制生成的 Token

3. **获取 Account ID**
   - 访问 https://dash.cloudflare.com/
   - 右侧栏可以找到你的 Account ID

4. **配置 GitHub Secrets**
   - 进入你的 Fork 仓库 → Settings → Secrets and variables → Actions
   - 添加以下 Secrets:
     - `CF_API_TOKEN`: 上一步创建的 Cloudflare API Token
     - `CF_ACCOUNT_ID`: 你的 Cloudflare Account ID

5. **触发部署**
   - 推送任何对 `cloudflare/` 目录的修改到 `main` 分支
   - 或手动触发: Actions → Deploy to Cloudflare Workers → Run workflow

6. **访问你的 Worker**
   - 部署成功后, 访问: `https://sub-store.你的ACCOUNT_ID.workers.dev`

### 方式二: 本地 Wrangler CLI 部署

```bash
# 1. 安装 Wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. (可选) 创建 KV 命名空间
wrangler kv:namespace create SUB_STORE_KV

# 4. 编辑 wrangler.toml, 填入 KV namespace ID 和其他配置

# 5. 本地预览
wrangler dev

# 6. 部署
wrangler deploy
```

## ⚙️ 配置说明

### 编辑 `wrangler.toml`

```toml
[vars]
# 模式 1: 代理模式 (推荐)
# 填写你已有的 Sub-Store 后端地址
UPSTREAM_URL = "https://your-sub-store.example.com"

# 模式 2: KV 模式 (独立使用)
# 留空 UPSTREAM_URL, 使用下面的 KV 配置
# [[kv_namespaces]]
# binding = "SUB_STORE_KV"
# id = "你的KV_NAMESPACE_ID"

# 认证令牌 (可选, 强烈建议设置)
AUTH_TOKEN = "your-secret-token"

# 缓存时间 (秒)
CACHE_TTL = "300"
```

### 环境变量列表

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `UPSTREAM_URL` | 上游 Sub-Store 地址 (代理模式) | `""` |
| `AUTH_TOKEN` | 认证令牌 | `""` |
| `CACHE_TTL` | 缓存时间 (秒) | `300` |
| `PATH_PREFIX` | 路径前缀 | `""` |

## 🔐 安全建议

1. **务必设置 `AUTH_TOKEN`**, 防止未授权访问
2. 不要在代码中硬编码敏感信息, 使用 Cloudflare 环境变量
3. 定期更换认证令牌
4. 如需绑定自定义域名, 在 Cloudflare 控制台添加即可

## 📖 使用方式

### 代理模式

```bash
# 获取订阅 (自动转发到上游)
curl "https://sub-store.xxx.workers.dev/api/download/collection/my-sub?target=Clash.Meta&token=your-token"
```

### KV 模式

```bash
# 列出所有订阅
curl "https://sub-store.xxx.workers.dev/api/subs?token=your-token"

# 保存订阅
curl -X POST "https://sub-store.xxx.workers.dev/api/sub/my-sub?token=your-token" \
  -H "Content-Type: application/json" \
  -d '{"proxies": [...]}'

# 获取订阅
curl "https://sub-store.xxx.workers.dev/api/sub/my-sub?target=Clash.Meta&token=your-token"

# 删除订阅
curl -X DELETE "https://sub-store.xxx.workers.dev/api/sub/my-sub?token=your-token"
```

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

## 🐛 故障排除

### 部署失败

- 检查 `CLOUDFLARE_API_TOKEN` 是否正确
- 确保 Token 有 Workers 编辑权限
- 查看 GitHub Actions 日志

### 500 错误

- 检查 `UPSTREAM_URL` 是否可访问
- 查看 Worker 实时日志: `wrangler tail`

### 401 错误

- 检查 URL 中的 `token` 参数是否正确
- 确认 `AUTH_TOKEN` 配置一致

## 📝 注意事项

1. Cloudflare Workers 免费版有每日 10 万次请求限制
2. KV 存储免费版 1GB 容量限制
3. Worker 脚本执行时间限制 10ms (免费版) / 30s (付费版)
4. 此版本为轻量级代理, 不包含 Sub-Store 完整的后端功能

## 🔗 相关链接

- [Sub-Store 官方文档](https://github.com/sub-store-org/Sub-Store)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Wrangler 文档](https://developers.cloudflare.com/workers/wrangler/)
