/**
 * Webhooker - 轻量级多平台 Webhook 转发网关
 *
 * 支持平台：飞书、钉钉、企业微信、Discord、Telegram、Slack
 * 运行环境：Cloudflare Workers / Node.js
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import type { Env, DispatchOptions, MessageLevel } from './core/types';
import { ROUTES, SUPPORTED_SOURCES } from './core/constants';
import { parseTargetsFromQuery } from './utils/url';
import { parseLevel } from './utils/message';
import { parseRequest } from './parsers/registry';
import { dispatch, createDispatchConfig } from './core/dispatcher';
import { getSupportedSources } from './parsers/registry';
import { getSupportedProviders } from './formatters/registry';

// 创建 Hono 应用
const app = new Hono<{ Bindings: Env }>();

// 中间件
app.use('*', cors());
app.use('*', logger());

// ============================================================================
// 路由
// ============================================================================

/**
 * 首页 - 显示 API 信息
 */
app.get(ROUTES.HOME, (c) => {
  return c.json({
    name: 'Webhooker',
    version: '2.0.0',
    description: '轻量级多平台 Webhook 转发网关',
    docs: 'https://github.com/your-repo/webhooker',
    endpoints: {
      forward: `POST ${ROUTES.API_PREFIX}/forward/:source`,
      health: `GET ${ROUTES.API_PREFIX}/health`,
    },
    supportedSources: getSupportedSources(),
    supportedTargets: getSupportedProviders(),
  });
});

/**
 * 健康检查
 */
app.get(`${ROUTES.API_PREFIX}/health`, (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    supportedSources: getSupportedSources(),
    supportedTargets: getSupportedProviders(),
  });
});

/**
 * 主要转发路由
 * POST /api/v1/forward/:source
 *
 * URL 参数示例:
 * - ?feishu=TOKEN&dingtalk=TOKEN
 * - ?fs=TOKEN1&fs=TOKEN2  (多目标)
 * - ?title=CustomTitle  (覆盖标题)
 * - ?level=error  (覆盖级别)
 *
 * 特殊 source:
 * - /raw: 直接透传原始 JSON body 到目标平台
 */
app.post(`${ROUTES.API_PREFIX}/forward/:source`, async (c) => {
  const source = c.req.param('source');
  const url = new URL(c.req.url);

  // 1. 验证输入源
  if (!SUPPORTED_SOURCES.includes(source as any)) {
    return c.json(
      {
        error: 'Invalid source',
        message: `Unsupported source: ${source}`,
        supportedSources: SUPPORTED_SOURCES,
      },
      400
    );
  }

  // 2. 解析目标
  const targets = parseTargetsFromQuery(url.searchParams);
  if (targets.length === 0) {
    return c.json(
      {
        error: 'No targets',
        message: 'At least one target is required. Use query params like ?feishu=TOKEN&dingtalk=TOKEN',
        supportedTargets: getSupportedProviders(),
      },
      400
    );
  }

  // 3. 解析选项
  const options: DispatchOptions = {
    forceTitle: url.searchParams.get('title') || undefined,
    forceLevel: parseLevel(url.searchParams.get('level') || undefined) as MessageLevel | undefined,
  };

  // 4. 解析请求体
  let body: unknown;
  try {
    const contentType = c.req.header('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await c.req.json();
    } else if (contentType.includes('text/plain')) {
      body = await c.req.text();
    } else {
      // 尝试解析为 JSON
      const text = await c.req.text();
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
  } catch (error) {
    return c.json(
      {
        error: 'Invalid body',
        message: 'Failed to parse request body',
      },
      400
    );
  }

  // 5. 解析消息
  const event = parseRequest(source, body, c.req.raw.headers);

  // 6. 创建分发配置
  const config = createDispatchConfig(targets, options);

  // 7. 异步分发 (使用 waitUntil)
  const dispatchPromise = dispatch(event, config);

  // 在 Cloudflare Workers 中使用 waitUntil
  if (c.executionCtx?.waitUntil) {
    // Fire and forget - 立即返回响应
    c.executionCtx.waitUntil(
      dispatchPromise.then((result) => {
        if (result.successCount < result.totalTargets) {
          console.error('Dispatch partial failure:', JSON.stringify(result));
        }
      }).catch((error) => {
        console.error('Dispatch error:', error);
      })
    );

    return c.json({
      status: 'accepted',
      message: `Request accepted, forwarding to ${targets.length} target(s)`,
      targets: targets.map((t) => ({ provider: t.provider })),
      options,
    }, 202);
  }

  // 在 Node.js 中等待结果
  const result = await dispatchPromise;

  return c.json({
    status: result.successCount === result.totalTargets ? 'success' : 'partial',
    message: `Forwarded to ${result.successCount}/${result.totalTargets} target(s)`,
    results: result.results.map((r) => ({
      provider: r.target.provider,
      success: r.success,
      statusCode: r.statusCode,
      error: r.error,
    })),
  }, result.successCount > 0 ? 200 : 500);
});

/**
 * 兼容旧版路由 (不带 /api/v1 前缀)
 */
app.post('/forward/:source', async (c) => {
  // 重定向到新路由
  const source = c.req.param('source');
  const url = new URL(c.req.url);
  url.pathname = `${ROUTES.API_PREFIX}/forward/${source}`;

  return c.redirect(url.toString(), 307);
});

/**
 * 简化路由 - 直接使用源名称
 * POST /slack, POST /feishu, etc.
 */
for (const source of SUPPORTED_SOURCES) {
  app.post(`/${source}`, async (c) => {
    const url = new URL(c.req.url);
    url.pathname = `${ROUTES.API_PREFIX}/forward/${source}`;

    // 内部重写请求
    const newRequest = new Request(url.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: c.req.raw.body,
    });

    return app.fetch(newRequest, c.env, c.executionCtx);
  });
}

// 404 处理
app.notFound((c) => {
  return c.json(
    {
      error: 'Not Found',
      message: `Route not found: ${c.req.method} ${c.req.path}`,
      availableEndpoints: [
        `POST ${ROUTES.API_PREFIX}/forward/:source`,
        `GET ${ROUTES.API_PREFIX}/health`,
        `GET /`,
      ],
    },
    404
  );
});

// 错误处理
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json(
    {
      error: 'Internal Server Error',
      message: err.message,
    },
    500
  );
});

// 导出 Cloudflare Workers 入口
export default app;

// 导出 app 实例供 Node.js 使用
export { app };
