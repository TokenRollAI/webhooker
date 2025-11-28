/**
 * Node.js 入口
 * 使用 @hono/node-server 运行 Hono 应用
 */

import { serve } from '@hono/node-server';
import { app } from './index';

const port = parseInt(process.env.PORT || '3000', 10);
const hostname = process.env.HOST || '0.0.0.0';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                      Webhooker v2.0                       ║
║           轻量级多平台 Webhook 转发网关                   ║
╚═══════════════════════════════════════════════════════════╝

🚀 Server starting...
📍 Listening on http://${hostname}:${port}

Endpoints:
  POST /api/v1/forward/:source  - Forward webhook
  GET  /api/v1/health           - Health check
  GET  /                        - API info

Example:
  curl -X POST "http://localhost:${port}/api/v1/forward/slack?feishu=YOUR_TOKEN" \\
    -H "Content-Type: application/json" \\
    -d '{"text": "Hello from Webhooker!"}'
`);

serve({
  fetch: app.fetch,
  port,
  hostname,
});
