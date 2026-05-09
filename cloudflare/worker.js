/**
 * Sub-Store Cloudflare Worker - 轻量级订阅代理/缓存层
 * 
 * 功能:
 * 1. 代理转发到上游 Sub-Store 实例
 * 2. 响应缓存加速
 * 3. 可选的认证保护
 * 
 * 部署方式:
 * - 通过 Wrangler CLI: npx wrangler deploy
 * - 或通过 GitHub Actions 自动部署
 */

// ============================================
// 配置 (也可以通过 Cloudflare 环境变量设置)
// ============================================
const CONFIG = {
  // 上游 Sub-Store 地址 (留空则使用 KV 模式)
  UPSTREAM_URL: '', // 例如: https://your-sub-store.example.com
  
  // KV 命名空间绑定 (在 wrangler.toml 中配置)
  // KV_BINDING: 'SUB_STORE_KV'
  
  // 认证令牌 (可选, 留空则不启用认证)
  AUTH_TOKEN: '',
  
  // 缓存时间 (秒)
  CACHE_TTL: 300,
  
  // 路径前缀 (如果部署在子路径)
  PATH_PREFIX: '',
};

// ============================================
// 主入口
// ============================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 合并配置 (环境变量优先)
    const config = {
      ...CONFIG,
      UPSTREAM_URL: env.UPSTREAM_URL || CONFIG.UPSTREAM_URL,
      AUTH_TOKEN: env.AUTH_TOKEN || CONFIG.AUTH_TOKEN,
      CACHE_TTL: parseInt(env.CACHE_TTL || CONFIG.CACHE_TTL, 10),
      PATH_PREFIX: env.PATH_PREFIX || CONFIG.PATH_PREFIX,
    };
    
    const kv = env.SUB_STORE_KV || null;
    
    // 处理路径前缀
    let path = url.pathname;
    if (config.PATH_PREFIX && path.startsWith(config.PATH_PREFIX)) {
      path = path.slice(config.PATH_PREFIX.length);
    }
    
    // 认证检查
    if (config.AUTH_TOKEN) {
      const token = url.searchParams.get('token') || 
                    request.headers.get('Authorization')?.replace('Bearer ', '');
      if (token !== config.AUTH_TOKEN) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }
    
    // 路由处理
    try {
      // 如果有上游地址, 使用代理模式
      if (config.UPSTREAM_URL) {
        return await proxyRequest(request, url, path, config, ctx);
      }
      
      // 否则使用 KV 模式
      if (kv) {
        return await handleKVRequest(request, url, path, kv, config, ctx);
      }
      
      // 都没有配置, 返回欢迎页面
      return new Response(getWelcomeHTML(), {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      });
      
    } catch (error) {
      return new Response(JSON.stringify({
        error: error.message,
        stack: error.stack,
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

// ============================================
// 代理模式 - 转发到上游 Sub-Store
// ============================================
async function proxyRequest(request, url, path, config, ctx) {
  const upstreamUrl = config.UPSTREAM_URL.replace(/\/$/, '') + path + url.search;
  
  // 检查缓存
  const cacheKey = new Request(upstreamUrl, request);
  const cache = caches.default;
  
  let response = await cache.match(cacheKey);
  if (response) {
    response = new Response(response.body, response);
    response.headers.set('X-Cache', 'HIT');
    return response;
  }
  
  // 转发请求
  const headers = new Headers(request.headers);
  headers.set('Host', new URL(config.UPSTREAM_URL).host);
  
  const fetchRequest = new Request(upstreamUrl, {
    method: request.method,
    headers,
    body: request.body,
    redirect: 'follow',
  });
  
  response = await fetch(fetchRequest);
  
  // 缓存成功的 GET 请求
  if (response.ok && request.method === 'GET') {
    const cacheResponse = new Response(response.body, {
      headers: {
        ...Object.fromEntries(response.headers),
        'Cache-Control': `public, max-age=${config.CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
    });
    ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()));
    return cacheResponse;
  }
  
  response.headers.set('X-Cache', 'MISS');
  return response;
}

// ============================================
// KV 模式 - 直接处理订阅数据
// ============================================
async function handleKVRequest(request, url, path, kv, config, ctx) {
  const method = request.method;
  
  // GET /api/sub/:name - 获取订阅
  const subMatch = path.match(/^\/api\/sub\/(.+)$/);
  if (subMatch && method === 'GET') {
    const name = subMatch[1];
    const data = await kv.get(`sub:${name}`, 'json');
    
    if (!data) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const target = url.searchParams.get('target') || 'Clash.Meta';
    const content = generateSubscriptionContent(data, target);
    
    return new Response(content, {
      headers: {
        'Content-Type': target === 'Clash.Meta' ? 'text/yaml' : 'text/plain',
        'Cache-Control': `public, max-age=${config.CACHE_TTL}`,
      },
    });
  }
  
  // POST /api/sub/:name - 保存/更新订阅
  if (subMatch && method === 'POST') {
    const name = subMatch[1];
    const body = await request.json();
    
    await kv.put(`sub:${name}`, JSON.stringify({
      ...body,
      updatedAt: new Date().toISOString(),
    }));
    
    return new Response(JSON.stringify({ success: true, name }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // GET /api/subs - 列出所有订阅
  if (path === '/api/subs' && method === 'GET') {
    const list = await kv.list({ prefix: 'sub:' });
    const subs = [];
    
    for (const key of list.keys) {
      const name = key.name.replace('sub:', '');
      const data = await kv.get(key.name, 'json');
      subs.push({ name, ...data });
    }
    
    return new Response(JSON.stringify({ subscriptions: subs }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // DELETE /api/sub/:name - 删除订阅
  if (subMatch && method === 'DELETE') {
    const name = subMatch[1];
    await kv.delete(`sub:${name}`);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // 404
  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

// ============================================
// 生成订阅内容 (简化版)
// ============================================
function generateSubscriptionContent(data, target) {
  const proxies = data.proxies || [];
  
  if (target === 'Clash.Meta' || target === 'Clash') {
    return `proxies:\n${proxies.map(p => `  - ${JSON.stringify(p)}`).join('\n')}`;
  }
  
  if (target === 'sing-box') {
    return JSON.stringify({ outbounds: proxies }, null, 2);
  }
  
  // 默认输出 URI 格式
  return proxies.map(p => p.url || p.name || '').join('\n');
}

// ============================================
// 欢迎页面
// ============================================
function getWelcomeHTML() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sub-Store Cloudflare Worker</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; background: #0d1117; color: #c9d1d9; }
    h1 { color: #58a6ff; }
    code { background: #161b22; padding: 2px 6px; border-radius: 4px; color: #79c0ff; }
    pre { background: #161b22; padding: 16px; border-radius: 8px; overflow-x: auto; }
    a { color: #58a6ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>🚀 Sub-Store Cloudflare Worker</h1>
  <p>轻量级订阅代理/缓存服务已成功部署！</p>
  
  <h2>📖 使用方式</h2>
  
  <h3>模式 1: 代理模式 (推荐)</h3>
  <p>在 wrangler.toml 中设置 <code>UPSTREAM_URL</code> 为你的 Sub-Store 后端地址:</p>
  <pre>
[vars]
UPSTREAM_URL = "https://your-sub-store.example.com"
  </pre>
  
  <h3>模式 2: KV 模式</h3>
  <p>使用 Cloudflare KV 存储直接管理订阅:</p>
  <pre>
# 创建 KV 命名空间
npx wrangler kv:namespace create SUB_STORE_KV

# 在 wrangler.toml 中绑定
[[kv_namespaces]]
binding = "SUB_STORE_KV"
id = "your-kv-id"
  </pre>
  
  <h2>🔧 API 端点</h2>
  <ul>
    <li><code>GET /api/sub/:name</code> - 获取订阅</li>
    <li><code>POST /api/sub/:name</code> - 保存订阅</li>
    <li><code>GET /api/subs</code> - 列出所有订阅</li>
    <li><code>DELETE /api/sub/:name</code> - 删除订阅</li>
  </ul>
  
  <h2>🔐 认证</h2>
  <p>设置 <code>AUTH_TOKEN</code> 环境变量启用认证:</p>
  <pre>
[vars]
AUTH_TOKEN = "your-secret-token"
  </pre>
  <p>使用时在 URL 中添加: <code>?token=your-secret-token</code></p>
  
  <h2>📚 更多文档</h2>
  <p>查看 <a href="https://github.com/sub-store-org/Sub-Store">Sub-Store 官方文档</a></p>
  
  <footer style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #30363d; color: #8b949e;">
    Powered by Cloudflare Workers | Sub-Store
  </footer>
</body>
</html>`;
}
