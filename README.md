# Webhooker

Webhook 转发网关。把 Slack/飞书/钉钉 等平台的消息转发到其他 IM。

## 部署

**Cloudflare Workers (推荐)**
```bash
npm install
npm run deploy
```

**Docker**
```bash
docker-compose up -d
```

**Node.js**
```bash
npm run build && npm start
```

## 用法

```
POST /:source?target=TOKEN
```

把 Slack 消息转发到飞书和钉钉：
```bash
curl -X POST "https://xxx.workers.dev/slack?feishu=TOKEN1&dd=TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"text": "hello"}'
```

## 支持的平台

**输入** (source)
- `slack` - Slack webhook
- `feishu` - 飞书机器人
- `dingtalk` - 钉钉机器人
- `wechatwork` - 企业微信
- `generic` - 通用 JSON
- `raw` - 原样输出 (兜底)

**输出** (target 参数)

| 参数 | 平台 | 说明 |
|-----|------|-----|
| `feishu` / `fs` | 飞书 | 只需 token |
| `dingtalk` / `dd` | 钉钉 | 只需 access_token |
| `wechatwork` / `wxwork` | 企业微信 | 只需 key |
| `discord` / `dc` | Discord | 格式: `ID/TOKEN` |
| `telegram` / `tg` | Telegram | 格式: `BOT_TOKEN:CHAT_ID` |
| `slack` | Slack | 格式: `T.../B.../xxx` |
| `generic` | 自定义 | 完整 URL |

多个目标：`?feishu=A&feishu=B&dd=C`

## 可选参数

- `title=xxx` - 覆盖消息标题
- `level=error` - 设置级别 (info/success/warning/error)
- `dd_secret=xxx` - 钉钉加签密钥

## /raw 路由

解析不了的消息会走 `/raw`，把 JSON 转成字符串发出去：

```bash
curl -X POST "https://xxx.workers.dev/raw?feishu=TOKEN" \
  -d '{"any": "data"}'
# 飞书收到: {"any": "data"}
```

## 开发

```bash
npm install
npm run dev        # CF Workers 本地
npm run dev:node   # Node.js 本地
npm test
```

## License

MIT
