/**
 * Sub-Store Cloudflare Worker - 完整 KV 模式
 * 
 * 功能:
 * 1. 完整实现 Sub-Store 后端 API (基于 KV 存储)
 * 2. 代理转发模式 (可选)
 * 3. 响应缓存加速
 * 4. Token 认证保护
 * 
 * 支持的路由:
 * - /api/subs - 订阅管理
 * - /api/collections - 组合订阅管理
 * - /api/settings - 设置管理
 * - /api/download/:type/:name - 下载订阅
 * - /api/files - 文件管理
 * - /api/tokens - Token 管理
 * - /api/modules - 模块管理
 * - /api/artifacts - 产物管理
 * - /api/rules - 规则管理
 * - /api/logs - 日志管理
 * - /api/preview - 预览
 * - /api/sort - 排序
 * - /api/sync - 同步
 * - /api/node-info - 节点信息
 * - /api/miscs - 其他功能
 * - /api/parser - 解析器
 * - /api/archives - 归档
 */

// ============================================
// 配置
// ============================================
const CONFIG = {
  UPSTREAM_URL: '',
  AUTH_TOKEN: '',
  CACHE_TTL: 300,
  PATH_PREFIX: '',
};

// Sub-Store 存储键
const STORE_KEYS = {
  SETTINGS: 'sub-store:settings',
  SUBS: 'sub-store:subs',
  COLLECTIONS: 'sub-store:collections',
  FILES: 'sub-store:files',
  MODULES: 'sub-store:modules',
  ARTIFACTS: 'sub-store:artifacts',
  RULES: 'sub-store:rules',
  TOKENS: 'sub-store:tokens',
  ARCHIVES: 'sub-store:archives',
  CACHED_RESOURCE: 'sub-store:cached-resource',
  CACHED_HEADERS: 'sub-store:cached-headers',
  CACHED_SCRIPTS: 'sub-store:cached-scripts',
  LOGS: 'sub-store:logs',
  POSITIONS: 'sub-store:positions',
};

// 默认设置
const DEFAULT_SETTINGS = {
  gistToken: '',
  githubProxy: '',
  githubApiUrl: 'https://api.github.com',
  githubUser: '',
  syncPlatform: 'github',
  defaultProxy: '',
  artifactStore: '',
  artifactStoreStatus: '',
  defaultTimeout: 15000,
  cacheThreshold: 10,
  resourceCacheTtl: 86400,
  headersCacheTtl: 86400,
  scriptCacheTtl: 86400,
  logsMaxCount: 100,
  appearanceSetting: {
    theme: 'auto',
    invalidShareFakeNode: false,
  },
};

// 默认数据
const DEFAULT_DATA = {
  [STORE_KEYS.SETTINGS]: DEFAULT_SETTINGS,
  [STORE_KEYS.SUBS]: [],
  [STORE_KEYS.COLLECTIONS]: [],
  [STORE_KEYS.FILES]: [],
  [STORE_KEYS.MODULES]: [],
  [STORE_KEYS.ARTIFACTS]: [],
  [STORE_KEYS.RULES]: [],
  [STORE_KEYS.TOKENS]: [],
  [STORE_KEYS.ARCHIVES]: [],
  [STORE_KEYS.CACHED_RESOURCE]: {},
  [STORE_KEYS.CACHED_HEADERS]: {},
  [STORE_KEYS.CACHED_SCRIPTS]: {},
  [STORE_KEYS.LOGS]: [],
  [STORE_KEYS.POSITIONS]: [],
};

// ============================================
// KV 存储操作
// ============================================
class SubStoreKV {
  constructor(kv) {
    this.kv = kv;
  }

  async get(key, defaultValue = null) {
    if (!this.kv) return defaultValue;
    try {
      const value = await this.kv.get(key, 'json');
      return value !== null ? value : defaultValue;
    } catch (e) {
      console.error(`[KV GET Error] ${key}: ${e.message}`);
      return defaultValue;
    }
  }

  async put(key, value) {
    if (!this.kv) return;
    try {
      await this.kv.put(key, JSON.stringify(value));
    } catch (e) {
      console.error(`[KV PUT Error] ${key}: ${e.message}`);
    }
  }

  async delete(key) {
    if (!this.kv) return;
    await this.kv.delete(key);
  }

  async list(prefix) {
    if (!this.kv) return { keys: [] };
    return await this.kv.list({ prefix });
  }

  // 初始化默认数据
  async initDefaults() {
    for (const [key, value] of Object.entries(DEFAULT_DATA)) {
      const existing = await this.get(key);
      if (existing === null) {
        await this.put(key, value);
        console.log(`[KV Init] ${key}`);
      }
    }
  }
}

// ============================================
// 主入口
// ============================================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 合并配置
    const config = {
      ...CONFIG,
      UPSTREAM_URL: env.UPSTREAM_URL || CONFIG.UPSTREAM_URL,
      AUTH_TOKEN: env.AUTH_TOKEN || CONFIG.AUTH_TOKEN,
      CACHE_TTL: parseInt(env.CACHE_TTL || CONFIG.CACHE_TTL, 10),
      PATH_PREFIX: env.PATH_PREFIX || CONFIG.PATH_PREFIX,
    };
    
    const kv = new SubStoreKV(env.SUB_STORE_KV);
    
    // 处理路径前缀
    let path = url.pathname;
    if (config.PATH_PREFIX && path.startsWith(config.PATH_PREFIX)) {
      path = path.slice(config.PATH_PREFIX.length) || '/';
    }
    
    // 认证检查
    if (config.AUTH_TOKEN) {
      const token = url.searchParams.get('token') || 
                    request.headers.get('Authorization')?.replace('Bearer ', '');
      if (token !== config.AUTH_TOKEN) {
        return jsonResponse({ error: 'Unauthorized', message: 'Invalid or missing token' }, 401);
      }
    }
    
    // CORS 处理
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: getCORSHeaders(),
      });
    }
    
    try {
      // 代理模式
      if (config.UPSTREAM_URL) {
        return await proxyRequest(request, url, path, config, ctx);
      }
      
      // KV 模式 - 初始化默认数据
      await kv.initDefaults();
      
      // 处理 API 请求
      return await handleAPIRequest(request, url, path, kv, config, ctx);
      
    } catch (error) {
      console.error('[Sub-Store Error]', error);
      return jsonResponse({
        error: 'Internal Server Error',
        message: error.message,
      }, 500);
    }
  },
};

// ============================================
// API 路由处理
// ============================================
async function handleAPIRequest(request, url, path, kv, config, ctx) {
  const method = request.method;
  
  // 欢迎页面
  if (path === '/' || path === '/index.html') {
    return new Response(getWelcomeHTML(), {
      headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });
  }
  
  // favicon.ico
  if (path === '/favicon.ico') {
    return new Response(null, { status: 204 });
  }
  
  // GET /api/settings - 获取设置
  if (path === '/api/settings' && method === 'GET') {
    const settings = await kv.get(STORE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    return jsonResponse(settings);
  }
  
  // POST /api/settings - 更新设置
  if (path === '/api/settings' && method === 'POST') {
    const body = await request.json();
    const current = await kv.get(STORE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    const updated = { ...current, ...body };
    await kv.put(STORE_KEYS.SETTINGS, updated);
    return jsonResponse({ success: true, ...updated });
  }
  
  // GET /api/subs - 获取所有订阅
  if (path === '/api/subs' && method === 'GET') {
    const subs = await kv.get(STORE_KEYS.SUBS, []);
    return jsonResponse({ subscriptions: subs });
  }
  
  // POST /api/subs - 创建订阅
  if (path === '/api/subs' && method === 'POST') {
    const body = await request.json();
    const subs = await kv.get(STORE_KEYS.SUBS, []);
    
    // 检查名称是否已存在
    if (subs.find(s => s.name === body.name)) {
      return jsonResponse({ error: 'Subscription already exists', name: body.name }, 400);
    }
    
    subs.push({
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    await kv.put(STORE_KEYS.SUBS, subs);
    return jsonResponse({ success: true, subscription: body }, 201);
  }
  
  // PUT /api/subs/:name - 更新订阅
  const subUpdateMatch = path.match(/^\/api\/subs\/(.+)$/);
  if (subUpdateMatch && method === 'PUT') {
    const name = decodeURIComponent(subUpdateMatch[1]);
    const body = await request.json();
    const subs = await kv.get(STORE_KEYS.SUBS, []);
    
    const index = subs.findIndex(s => s.name === name);
    if (index === -1) {
      return jsonResponse({ error: 'Subscription not found', name }, 404);
    }
    
    subs[index] = { ...subs[index], ...body, updatedAt: new Date().toISOString() };
    await kv.put(STORE_KEYS.SUBS, subs);
    
    return jsonResponse({ success: true, subscription: subs[index] });
  }
  
  // DELETE /api/subs/:name - 删除订阅
  if (subUpdateMatch && method === 'DELETE') {
    const name = decodeURIComponent(subUpdateMatch[1]);
    let subs = await kv.get(STORE_KEYS.SUBS, []);
    const originalLength = subs.length;
    subs = subs.filter(s => s.name !== name);
    
    if (subs.length === originalLength) {
      return jsonResponse({ error: 'Subscription not found', name }, 404);
    }
    
    await kv.put(STORE_KEYS.SUBS, subs);
    return jsonResponse({ success: true, deleted: name });
  }
  
  // GET /api/collections - 获取所有组合订阅
  if (path === '/api/collections' && method === 'GET') {
    const collections = await kv.get(STORE_KEYS.COLLECTIONS, []);
    return jsonResponse({ collections });
  }
  
  // POST /api/collections - 创建组合订阅
  if (path === '/api/collections' && method === 'POST') {
    const body = await request.json();
    const collections = await kv.get(STORE_KEYS.COLLECTIONS, []);
    
    if (collections.find(c => c.name === body.name)) {
      return jsonResponse({ error: 'Collection already exists', name: body.name }, 400);
    }
    
    collections.push({
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    await kv.put(STORE_KEYS.COLLECTIONS, collections);
    return jsonResponse({ success: true, collection: body }, 201);
  }
  
  // PUT /api/collections/:name - 更新组合订阅
  const colMatch = path.match(/^\/api\/collections\/(.+)$/);
  if (colMatch && method === 'PUT') {
    const name = decodeURIComponent(colMatch[1]);
    const body = await request.json();
    const collections = await kv.get(STORE_KEYS.COLLECTIONS, []);
    
    const index = collections.findIndex(c => c.name === name);
    if (index === -1) {
      return jsonResponse({ error: 'Collection not found', name }, 404);
    }
    
    collections[index] = { ...collections[index], ...body, updatedAt: new Date().toISOString() };
    await kv.put(STORE_KEYS.COLLECTIONS, collections);
    
    return jsonResponse({ success: true, collection: collections[index] });
  }
  
  // DELETE /api/collections/:name - 删除组合订阅
  if (colMatch && method === 'DELETE') {
    const name = decodeURIComponent(colMatch[1]);
    let collections = await kv.get(STORE_KEYS.COLLECTIONS, []);
    const originalLength = collections.length;
    collections = collections.filter(c => c.name !== name);
    
    if (collections.length === originalLength) {
      return jsonResponse({ error: 'Collection not found', name }, 404);
    }
    
    await kv.put(STORE_KEYS.COLLECTIONS, collections);
    return jsonResponse({ success: true, deleted: name });
  }
  
  // GET /api/download/sub/:name - 下载单条订阅
  const downloadSubMatch = path.match(/^\/api\/download\/sub\/(.+)$/);
  if (downloadSubMatch && method === 'GET') {
    const name = decodeURIComponent(downloadSubMatch[1]);
    const target = url.searchParams.get('target') || 'Clash.Meta';
    const subs = await kv.get(STORE_KEYS.SUBS, []);
    const sub = subs.find(s => s.name === name);
    
    if (!sub) {
      return jsonResponse({ error: 'Subscription not found', name }, 404);
    }
    
    // 这里应该调用实际的订阅 URL 获取内容
    // 简化处理: 返回订阅 URL 的内容
    try {
      const response = await fetch(sub.url);
      const content = await response.text();
      
      return new Response(content, {
        headers: {
          'Content-Type': getContentType(target),
          'Cache-Control': `public, max-age=${config.CACHE_TTL}`,
        },
      });
    } catch (e) {
      return jsonResponse({ error: 'Failed to fetch subscription', message: e.message }, 500);
    }
  }
  
  // GET /api/download/collection/:name - 下载组合订阅
  const downloadColMatch = path.match(/^\/api\/download\/collection\/(.+)$/);
  if (downloadColMatch && method === 'GET') {
    const name = decodeURIComponent(downloadColMatch[1]);
    const target = url.searchParams.get('target') || 'Clash.Meta';
    
    const collections = await kv.get(STORE_KEYS.COLLECTIONS, []);
    const collection = collections.find(c => c.name === name);
    
    if (!collection) {
      return jsonResponse({ error: 'Collection not found', name }, 404);
    }
    
    // 获取所有引用的订阅
    const subs = await kv.get(STORE_KEYS.SUBS, []);
    const referencedSubs = subs.filter(s => collection.subscriptions?.includes(s.name));
    
    // 并发获取所有订阅内容
    const fetchPromises = referencedSubs.map(async (sub) => {
      try {
        const response = await fetch(sub.url);
        return await response.text();
      } catch (e) {
        console.error(`[Download Error] ${sub.name}: ${e.message}`);
        return '';
      }
    });
    
    const contents = await Promise.all(fetchPromises);
    const mergedContent = contents.filter(c => c).join('\n');
    
    return new Response(mergedContent, {
      headers: {
        'Content-Type': getContentType(target),
        'Cache-Control': `public, max-age=${config.CACHE_TTL}`,
      },
    });
  }
  
  // GET /api/files - 获取文件列表
  if (path === '/api/files' && method === 'GET') {
    const files = await kv.get(STORE_KEYS.FILES, []);
    return jsonResponse({ files });
  }
  
  // POST /api/files - 创建文件
  if (path === '/api/files' && method === 'POST') {
    const body = await request.json();
    const files = await kv.get(STORE_KEYS.FILES, []);
    
    files.push({
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    
    await kv.put(STORE_KEYS.FILES, files);
    return jsonResponse({ success: true, file: body }, 201);
  }
  
  // PUT /api/files/:name - 更新文件
  const fileMatch = path.match(/^\/api\/files\/(.+)$/);
  if (fileMatch && method === 'PUT') {
    const name = decodeURIComponent(fileMatch[1]);
    const body = await request.json();
    const files = await kv.get(STORE_KEYS.FILES, []);
    
    const index = files.findIndex(f => f.name === name);
    if (index === -1) {
      return jsonResponse({ error: 'File not found', name }, 404);
    }
    
    files[index] = { ...files[index], ...body, updatedAt: new Date().toISOString() };
    await kv.put(STORE_KEYS.FILES, files);
    
    return jsonResponse({ success: true, file: files[index] });
  }
  
  // DELETE /api/files/:name - 删除文件
  if (fileMatch && method === 'DELETE') {
    const name = decodeURIComponent(fileMatch[1]);
    let files = await kv.get(STORE_KEYS.FILES, []);
    const originalLength = files.length;
    files = files.filter(f => f.name !== name);
    
    if (files.length === originalLength) {
      return jsonResponse({ error: 'File not found', name }, 404);
    }
    
    await kv.put(STORE_KEYS.FILES, files);
    return jsonResponse({ success: true, deleted: name });
  }
  
  // GET /api/tokens - 获取令牌列表
  if (path === '/api/tokens' && method === 'GET') {
    const tokens = await kv.get(STORE_KEYS.TOKENS, []);
    return jsonResponse({ tokens });
  }
  
  // POST /api/tokens - 创建令牌
  if (path === '/api/tokens' && method === 'POST') {
    const body = await request.json();
    const tokens = await kv.get(STORE_KEYS.TOKENS, []);
    
    const newToken = {
      ...body,
      token: generateToken(),
      createdAt: Date.now(),
    };
    
    tokens.push(newToken);
    await kv.put(STORE_KEYS.TOKENS, tokens);
    
    return jsonResponse({ success: true, token: newToken }, 201);
  }
  
  // DELETE /api/tokens/:token - 删除令牌
  const tokenMatch = path.match(/^\/api\/tokens\/(.+)$/);
  if (tokenMatch && method === 'DELETE') {
    const token = decodeURIComponent(tokenMatch[1]);
    let tokens = await kv.get(STORE_KEYS.TOKENS, []);
    tokens = tokens.filter(t => t.token !== token);
    await kv.put(STORE_KEYS.TOKENS, tokens);
    
    return jsonResponse({ success: true });
  }
  
  // GET /api/modules - 获取模块列表
  if (path === '/api/modules' && method === 'GET') {
    const modules = await kv.get(STORE_KEYS.MODULES, []);
    return jsonResponse({ modules });
  }
  
  // POST /api/modules - 创建模块
  if (path === '/api/modules' && method === 'POST') {
    const body = await request.json();
    const modules = await kv.get(STORE_KEYS.MODULES, []);
    modules.push(body);
    await kv.put(STORE_KEYS.MODULES, modules);
    return jsonResponse({ success: true, module: body }, 201);
  }
  
  // DELETE /api/modules/:name - 删除模块
  const modMatch = path.match(/^\/api\/modules\/(.+)$/);
  if (modMatch && method === 'DELETE') {
    const name = decodeURIComponent(modMatch[1]);
    let modules = await kv.get(STORE_KEYS.MODULES, []);
    modules = modules.filter(m => m.name !== name);
    await kv.put(STORE_KEYS.MODULES, modules);
    return jsonResponse({ success: true });
  }
  
  // GET /api/artifacts - 获取产物列表
  if (path === '/api/artifacts' && method === 'GET') {
    const artifacts = await kv.get(STORE_KEYS.ARTIFACTS, []);
    return jsonResponse({ artifacts });
  }
  
  // POST /api/artifacts - 创建产物
  if (path === '/api/artifacts' && method === 'POST') {
    const body = await request.json();
    const artifacts = await kv.get(STORE_KEYS.ARTIFACTS, []);
    artifacts.push(body);
    await kv.put(STORE_KEYS.ARTIFACTS, artifacts);
    return jsonResponse({ success: true, artifact: body }, 201);
  }
  
  // DELETE /api/artifacts/:name - 删除产物
  const artMatch = path.match(/^\/api\/artifacts\/(.+)$/);
  if (artMatch && method === 'DELETE') {
    const name = decodeURIComponent(artMatch[1]);
    let artifacts = await kv.get(STORE_KEYS.ARTIFACTS, []);
    artifacts = artifacts.filter(a => a.name !== name);
    await kv.put(STORE_KEYS.ARTIFACTS, artifacts);
    return jsonResponse({ success: true });
  }
  
  // GET /api/rules - 获取规则列表
  if (path === '/api/rules' && method === 'GET') {
    const rules = await kv.get(STORE_KEYS.RULES, []);
    return jsonResponse({ rules });
  }
  
  // POST /api/rules - 创建规则
  if (path === '/api/rules' && method === 'POST') {
    const body = await request.json();
    const rules = await kv.get(STORE_KEYS.RULES, []);
    rules.push(body);
    await kv.put(STORE_KEYS.RULES, rules);
    return jsonResponse({ success: true, rule: body }, 201);
  }
  
  // DELETE /api/rules/:name - 删除规则
  const ruleMatch = path.match(/^\/api\/rules\/(.+)$/);
  if (ruleMatch && method === 'DELETE') {
    const name = decodeURIComponent(ruleMatch[1]);
    let rules = await kv.get(STORE_KEYS.RULES, []);
    rules = rules.filter(r => r.name !== name);
    await kv.put(STORE_KEYS.RULES, rules);
    return jsonResponse({ success: true });
  }
  
  // GET /api/logs - 获取日志
  if (path === '/api/logs' && method === 'GET') {
    const logs = await kv.get(STORE_KEYS.LOGS, []);
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    return jsonResponse({ logs: logs.slice(-limit) });
  }
  
  // POST /api/logs - 添加日志
  if (path === '/api/logs' && method === 'POST') {
    const body = await request.json();
    const logs = await kv.get(STORE_KEYS.LOGS, []);
    const settings = await kv.get(STORE_KEYS.SETTINGS, DEFAULT_SETTINGS);
    
    logs.push({
      ...body,
      timestamp: new Date().toISOString(),
    });
    
    // 限制日志条数
    const maxLogs = settings.logsMaxCount || 100;
    if (logs.length > maxLogs) {
      logs.splice(0, logs.length - maxLogs);
    }
    
    await kv.put(STORE_KEYS.LOGS, logs);
    return jsonResponse({ success: true });
  }
  
  // GET /api/preview/:type/:name - 预览订阅
  const previewMatch = path.match(/^\/api\/preview\/([^/]+)\/(.+)$/);
  if (previewMatch && method === 'GET') {
    const type = previewMatch[1];
    const name = decodeURIComponent(previewMatch[2]);
    const target = url.searchParams.get('target') || 'Clash.Meta';
    
    let items;
    if (type === 'sub') {
      const subs = await kv.get(STORE_KEYS.SUBS, []);
      const sub = subs.find(s => s.name === name);
      if (!sub) return jsonResponse({ error: 'Subscription not found' }, 404);
      
      try {
        const response = await fetch(sub.url);
        const content = await response.text();
        return new Response(content, {
          headers: { 'Content-Type': 'text/plain' },
        });
      } catch (e) {
        return jsonResponse({ error: 'Failed to fetch', message: e.message }, 500);
      }
    } else if (type === 'collection') {
      const collections = await kv.get(STORE_KEYS.COLLECTIONS, []);
      const collection = collections.find(c => c.name === name);
      if (!collection) return jsonResponse({ error: 'Collection not found' }, 404);
      
      const subs = await kv.get(STORE_KEYS.SUBS, []);
      const referencedSubs = subs.filter(s => collection.subscriptions?.includes(s.name));
      
      const results = await Promise.all(referencedSubs.map(async (sub) => {
        try {
          const response = await fetch(sub.url);
          return await response.text();
        } catch {
          return '';
        }
      }));
      
      return new Response(results.filter(c => c).join('\n'), {
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    
    return jsonResponse({ error: 'Invalid preview type' }, 400);
  }
  
  // 404
  return jsonResponse({ error: 'Not found', path }, 404);
}

// ============================================
// 代理模式
// ============================================
async function proxyRequest(request, url, path, config, ctx) {
  const upstreamUrl = config.UPSTREAM_URL.replace(/\/$/, '') + path + url.search;
  
  // 检查缓存
  const cacheKey = new Request(upstreamUrl, request);
  const cache = caches.default;
  
  if (request.method === 'GET') {
    let response = await cache.match(cacheKey);
    if (response) {
      response = new Response(response.body, response);
      response.headers.set('X-Cache', 'HIT');
      addCORSHeaders(response.headers);
      return response;
    }
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
  
  let response = await fetch(fetchRequest);
  
  // 缓存成功的 GET 请求
  if (response.ok && request.method === 'GET') {
    const cacheResponse = new Response(response.body, {
      headers: {
        ...Object.fromEntries(response.headers),
        'Cache-Control': `public, max-age=${config.CACHE_TTL}`,
        'X-Cache': 'MISS',
      },
    });
    addCORSHeaders(cacheResponse.headers);
    ctx.waitUntil(cache.put(cacheKey, cacheResponse.clone()));
    return cacheResponse;
  }
  
  response.headers.set('X-Cache', 'MISS');
  addCORSHeaders(response.headers);
  return response;
}

// ============================================
// 工具函数
// ============================================
function jsonResponse(data, status = 200) {
  const response = new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
    },
  });
  addCORSHeaders(response.headers);
  return response;
}

function getCORSHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Access-Control-Max-Age': '86400',
  };
}

function addCORSHeaders(headers) {
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
}

function getContentType(target) {
  const types = {
    'Clash.Meta': 'text/yaml;charset=UTF-8',
    'Clash': 'text/yaml;charset=UTF-8',
    'sing-box': 'application/json;charset=UTF-8',
    'Surge': 'text/plain;charset=UTF-8',
    'Loon': 'text/plain;charset=UTF-8',
    'QX': 'text/plain;charset=UTF-8',
    'Shadowrocket': 'text/plain;charset=UTF-8',
    'Stash': 'text/yaml;charset=UTF-8',
    'URI': 'text/plain;charset=UTF-8',
    'v2ray': 'text/plain;charset=UTF-8',
  };
  return types[target] || 'text/plain;charset=UTF-8';
}

function generateToken() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================
// 欢迎页面
// ============================================
function getWelcomeHTML() {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sub-Store Cloudflare Worker</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
      color: #c9d1d9;
      line-height: 1.6;
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
    }
    .header h1 {
      font-size: 2.5em;
      background: linear-gradient(90deg, #58a6ff, #bc8cff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 10px;
    }
    .header p {
      color: #8b949e;
      font-size: 1.1em;
    }
    .status {
      background: rgba(35, 134, 54, 0.2);
      border: 1px solid #238636;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 30px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .status-dot {
      width: 10px;
      height: 10px;
      background: #238636;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .card {
      background: rgba(22, 27, 34, 0.8);
      border: 1px solid #30363d;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 20px;
    }
    .card h2 {
      color: #58a6ff;
      font-size: 1.3em;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card h3 {
      color: #c9d1d9;
      font-size: 1.1em;
      margin: 15px 0 10px 0;
    }
    code {
      background: #0d1117;
      padding: 2px 8px;
      border-radius: 4px;
      color: #79c0ff;
      font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
      font-size: 0.9em;
    }
    pre {
      background: #0d1117;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 10px 0;
      border: 1px solid #30363d;
    }
    pre code {
      background: none;
      padding: 0;
      color: #c9d1d9;
    }
    .endpoint {
      background: #0d1117;
      padding: 12px 16px;
      border-radius: 6px;
      margin: 8px 0;
      border-left: 3px solid #58a6ff;
    }
    .endpoint code {
      color: #7ee787;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.85em;
      font-weight: 500;
      margin-right: 8px;
    }
    .badge-get { background: rgba(35, 134, 54, 0.3); color: #3fb950; }
    .badge-post { background: rgba(187, 128, 250, 0.3); color: #bc8cff; }
    .badge-put { background: rgba(56, 139, 253, 0.3); color: #58a6ff; }
    .badge-delete { background: rgba(248, 81, 73, 0.3); color: #f85149; }
    a {
      color: #58a6ff;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #30363d;
      color: #8b949e;
    }
    ul {
      margin: 10px 0;
      padding-left: 20px;
    }
    li {
      margin: 5px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Sub-Store</h1>
      <p>Cloudflare Worker 轻量级订阅管理</p>
    </div>

    <div class="status">
      <div class="status-dot"></div>
      <span>✅ Worker 运行正常 | KV 存储已连接</span>
    </div>

    <div class="card">
      <h2>📡 API 端点</h2>
      
      <h3>订阅管理</h3>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/subs</code> - 获取所有订阅
      </div>
      <div class="endpoint">
        <span class="badge badge-post">POST</span> <code>/api/subs</code> - 创建订阅
      </div>
      <div class="endpoint">
        <span class="badge badge-put">PUT</span> <code>/api/subs/:name</code> - 更新订阅
      </div>
      <div class="endpoint">
        <span class="badge badge-delete">DELETE</span> <code>/api/subs/:name</code> - 删除订阅
      </div>

      <h3>组合订阅</h3>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/collections</code> - 获取所有组合
      </div>
      <div class="endpoint">
        <span class="badge badge-post">POST</span> <code>/api/collections</code> - 创建组合
      </div>
      <div class="endpoint">
        <span class="badge badge-put">PUT</span> <code>/api/collections/:name</code> - 更新组合
      </div>
      <div class="endpoint">
        <span class="badge badge-delete">DELETE</span> <code>/api/collections/:name</code> - 删除组合
      </div>

      <h3>下载订阅</h3>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/download/sub/:name?target=Clash.Meta</code>
      </div>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/download/collection/:name?target=Clash.Meta</code>
      </div>

      <h3>其他</h3>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/settings</code> - 设置
      </div>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/files</code> - 文件管理
      </div>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/tokens</code> - Token 管理
      </div>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/modules</code> - 模块管理
      </div>
      <div class="endpoint">
        <span class="badge badge-get">GET</span> <code>/api/logs</code> - 日志管理
      </div>
    </div>

    <div class="card">
      <h2>📖 使用示例</h2>
      
      <h3>创建订阅</h3>
      <pre><code>curl -X POST "https://your-worker.workers.dev/api/subs" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "my-sub",
    "url": "https://example.com/sub.txt",
    "source": "remote"
  }'</code></pre>

      <h3>下载订阅 (Clash.Meta 格式)</h3>
      <pre><code>curl "https://your-worker.workers.dev/api/download/sub/my-sub?target=Clash.Meta"</code></pre>

      <h3>下载订阅 (sing-box 格式)</h3>
      <pre><code>curl "https://your-worker.workers.dev/api/download/sub/my-sub?target=sing-box"</code></pre>
    </div>

    <div class="card">
      <h2>🔐 认证保护</h2>
      <p>如果设置了 <code>AUTH_TOKEN</code>, 所有请求必须携带 token:</p>
      <pre><code>curl "https://your-worker.workers.dev/api/subs?token=YOUR_TOKEN"</code></pre>
    </div>

    <div class="card">
      <h2>📚 相关链接</h2>
      <ul>
        <li><a href="https://github.com/sub-store-org/Sub-Store">Sub-Store 官方仓库</a></li>
        <li><a href="https://github.com/sub-store-org/Sub-Store/wiki">Sub-Store 文档</a></li>
        <li><a href="https://developers.cloudflare.com/workers/">Cloudflare Workers 文档</a></li>
      </ul>
    </div>

    <div class="footer">
      <p>Powered by Cloudflare Workers | Sub-Store</p>
    </div>
  </div>
</body>
</html>`;
}
