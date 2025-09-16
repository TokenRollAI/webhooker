# Webhooker - 多平台 Webhook 转发器

一个强大、灵活的 Cloudflare Workers 应用，支持多种输入格式和输出平台的 Webhook 消息转发。

## 🚀 核心特性

- Provider 架构：输入/输出按平台解耦，结构清晰
- Canonical v2 中间模型：envelope/body/options/ext，兼容 type/content/passthrough
- 能力矩阵 + 渲染选择：统一选择 raw/markdown/text 并优雅降级
- 多输入源：Slack、飞书、原始 JSON（支持透传）、通用文本
- 多输出平台：Slack、飞书、钉钉、企业微信、通用 HTTP
- 智能格式转换：自动检测目标平台，尽力映射，不支持时降级
- 原始透传：复杂载荷可直接透传为 raw，避免信息丢失
- 零配置与高性能：URL 参数控制，运行于 Cloudflare Workers

## 📋 API 规格

### 主要端点

```http
POST /v1/slack    # Slack 格式输入
POST /v1/feishu   # 飞书格式输入
POST /v1/raw      # 原始 JSON 输入
GET  /v1/health   # 健康检查
```

### 查询参数

- `targets` (必需): URL编码的目标地址，多个用逗号分隔
- `output` (可选): 指定输出格式 (`auto`|`feishu`|`dingtalk`|`wechatwork`|`generic`)
- `passthrough` (可选): 是否开启透传模式 (`true`|`false`)，开启后会将原始 JSON 序列化为字符串并作为文本发送

## 📚 Provider 能力一览

| Provider | 解析（Input） | 输出（Output） | 说明 |
| --- | --- | --- | --- |
| Slack | 文本、Block Kit、Attachments | 文本、Markdown、Blocks | 支持 Slack 入站与出站，适合监控告警等场景 |
| 飞书 | 文本、Markdown、富文本 Post（自动转 Markdown） | 文本（自动处理 Markdown 降级） | 可将飞书消息转发到钉钉、Slack、企业微信等平台 |
| 钉钉 | 文本、Markdown | 文本、Markdown | 自动补全标题，兼容 at 字段 |
| 企业微信 | 文本、Markdown | 文本、Markdown | 与钉钉格式高度相似，互转方便 |
| 原始 JSON | 任意结构 | 原始结构（POST body） | 适合调试或保留完整事件数据 |
| 纯文本 | 纯文本 | 纯文本 | 适配极简脚本/监控系统 |
| 通用 HTTP | Canonical v2 | Canonical v2 | 将标准化后的消息推送到自建 HTTP 服务 |

### 请求体示例

**Slack 格式：**
```json
{
  "text": "你的消息内容"
}
```

**原始 JSON（任意格式）：**
```json
{
  "msg_type": "interactive",
  "card": { "elements": [...] }
}
```

### 响应格式

成功响应 (200):
```json
{
  "status": "success",
  "message": "Request received and forwarded to 2/2 target(s).",
  "inputType": "slack",
  "passthrough": false,
  "details": [...]
}
```

错误响应 (400/404/500):
```json
{
  "status": "error",
  "message": "错误描述"
}
```

## 🛠️ 使用示例

### 1. 获取飞书机器人 Webhook URL
在飞书群组中添加自定义机器人，获取类似这样的 URL：
```
https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 2. URL 编码
将飞书 Webhook URL 进行 URL 编码：
```javascript
const feishuUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
const encodedUrl = encodeURIComponent(feishuUrl);
```

### 3. 发送请求
```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=https%3A//open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{"text": "服务器磁盘空间不足，请立即处理！"}'
```

### 4. 多目标转发
```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=URL1,URL2,URL3" \
  -H "Content-Type: application/json" \
  -d '{"text": "重要通知：系统维护将在30分钟后开始"}'

```

### 5. 透传 Raw JSON 示例（Feishu 卡片）
```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/raw?targets=https%3A//open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&passthrough=true" \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "interactive",
    "card": {
      "config": { "wide_screen_mode": true },
      "elements": [ { "tag": "div", "text": { "tag": "lark_md", "content": "**部署完成**\\n版本: v1.2.3" } } ]
    }
  }'

```

### 飞书输入快速示例

#### 飞书 → 钉钉

```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/feishu?targets=https%3A//oapi.dingtalk.com/robot/send%3Faccess_token%3Dxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "text",
    "content": { "text": "来自飞书的告警，已同步到钉钉" }
  }'
```

#### 飞书 → Slack

```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/feishu?targets=https%3A//hooks.slack.com/services/T000/B000/XXXXXXXX" \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "text",
    "content": { "text": "飞书消息已推送到 Slack" }
  }'
```

## 🚀 部署指南

### 前置要求
- Node.js 18+
- Cloudflare 账户
- Wrangler CLI

### 安装依赖
```bash
npm install
```

### 本地开发
```bash
npm run dev
```

### 部署到生产环境
```bash
npm run deploy
```

## 🧪 测试

运行测试：
```bash
npm test
```

## 🧱 架构与目录

- 中间层：Canonical v2（envelope/body/options/ext），并保留兼容字段 type/content/passthrough
- 输入 Provider：按平台独立解析
  - Slack：src/providers/slack/input.js（解析逻辑已下沉至 src/providers/slack/parse.js）
  - Raw：src/index.js 中经 fromRawPayload 进入 Canonical v2
  - Text：src/index.js 中经 fromTextPayload 进入 Canonical v2
- 输出 Provider：统一通过 core/render 的能力矩阵选择 raw/markdown/text
  - 飞书：src/providers/feishu/output.js（目前 markdown 降级为 text）
  - 钉钉：src/providers/dingtalk/output.js（原生 markdown / text）
  - 企业微信：src/providers/wechatwork/output.js（原生 markdown / text）
  - 通用 HTTP：src/providers/generic/output.js（输出完整 Canonical v2 上下文）
- 渲染选择器：src/core/render.js（能力矩阵 + selectPresentation）
- Canonical 构造：src/core/canonical.js（仅保留通用构造与兼容逻辑）

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
