# 高级使用指南

## 🚀 新功能概览

Webhooker 2.0 引入了以下新特性：

- **多输入源支持**：Slack、原始JSON、通用文本格式
- **多输出平台**：飞书、钉钉、企业微信、通用HTTP
- **智能格式转换**：自动检测目标平台并转换消息格式
- **直接透传模式**：对于复杂格式，支持原始JSON直接发送
- **灵活路由**：通过不同端点和参数控制处理方式

## 📋 API 端点

### 1. Slack 格式输入
```
POST /v1/slack?targets=<encoded-urls>&output=<type>&passthrough=<bool>
```

### 2. 原始 JSON 输入
```
POST /v1/raw?targets=<encoded-urls>&output=<type>
```

### 3. 健康检查
```
GET /v1/health
```

## 🔧 查询参数

- `targets` (必需): URL编码的目标地址，多个用逗号分隔
- `output` (可选): 指定输出格式 (`auto`|`feishu`|`dingtalk`|`wechatwork`|`generic`)
- `passthrough` (可选): 是否直接透传原始JSON (`true`|`false`)

## 💡 使用场景

### 场景1：标准 Slack 到飞书转发

```bash
curl -X POST "https://your-worker.workers.dev/v1/slack?targets=ENCODED_FEISHU_URL" \
  -H "Content-Type: application/json" \
  -d '{"text": "服务器告警：CPU使用率过高"}'
```

### 场景2：多平台同时通知

```bash
# 同时发送到飞书、钉钉、企业微信
FEISHU_URL="https://open.feishu.cn/open-apis/bot/v2/hook/xxx"
DINGTALK_URL="https://oapi.dingtalk.com/robot/send?access_token=xxx"
WECHAT_URL="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx"

TARGETS=$(python3 -c "
import urllib.parse
urls = ['$FEISHU_URL', '$DINGTALK_URL', '$WECHAT_URL']
print(','.join([urllib.parse.quote(url, safe='') for url in urls]))
")

curl -X POST "https://your-worker.workers.dev/v1/slack?targets=$TARGETS" \
  -H "Content-Type: application/json" \
  -d '{"text": "🎉 新版本发布成功！"}'
```

### 场景3：复杂消息直接透传

对于飞书的复杂卡片消息，使用透传模式：

```bash
curl -X POST "https://your-worker.workers.dev/v1/slack?targets=ENCODED_FEISHU_URL&passthrough=true" \
  -H "Content-Type: application/json" \
  -d '{
    "msg_type": "interactive",
    "card": {
      "elements": [
        {
          "tag": "div",
          "text": {
            "content": "**系统监控报告**",
            "tag": "lark_md"
          }
        },
        {
          "tag": "div",
          "fields": [
            {
              "is_short": true,
              "text": {
                "content": "**CPU使用率**\n85%",
                "tag": "lark_md"
              }
            },
            {
              "is_short": true,
              "text": {
                "content": "**内存使用率**\n72%",
                "tag": "lark_md"
              }
            }
          ]
        }
      ]
    }
  }'
```

### 场景4：原始 JSON 输入

直接发送任意JSON格式：

```bash
curl -X POST "https://your-worker.workers.dev/v1/raw?targets=ENCODED_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "alert": {
      "name": "High CPU Usage",
      "severity": "warning",
      "value": 85.2,
      "threshold": 80,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  }'
```

### 场景5：指定输出格式

强制使用特定的输出格式：

```bash
# 将消息格式化为钉钉格式，即使URL不是钉钉的
curl -X POST "https://your-worker.workers.dev/v1/slack?targets=ENCODED_GENERIC_URL&output=dingtalk" \
  -H "Content-Type: application/json" \
  -d '{"text": "这条消息会被格式化为钉钉格式"}'
```

## 🔄 消息格式转换

### 自动转换规则

1. **飞书格式**：
   ```json
   {
     "msg_type": "text",
     "content": {
       "text": "消息内容"
     }
   }
   ```

2. **钉钉格式**：
   ```json
   {
     "msgtype": "text",
     "text": {
       "content": "消息内容"
     }
   }
   ```

3. **企业微信格式**：
   ```json
   {
     "msgtype": "text",
     "text": {
       "content": "消息内容"
     }
   }
   ```

4. **通用格式**：
   ```json
   {
     "message": "消息内容",
     "type": "text",
     "metadata": {...}
   }
   ```

## 🎯 平台自动检测

系统会根据URL自动检测目标平台：

- `open.feishu.cn` 或 `open.larksuite.com` → 飞书格式
- `oapi.dingtalk.com` → 钉钉格式  
- `qyapi.weixin.qq.com` → 企业微信格式
- 其他URL → 通用格式

## 🛠️ 高级配置示例

### 监控系统集成

```javascript
// Prometheus Alertmanager Webhook
const alertData = {
  "receiver": "webhooker",
  "status": "firing",
  "alerts": [
    {
      "status": "firing",
      "labels": {
        "alertname": "HighCPUUsage",
        "instance": "server-01",
        "severity": "warning"
      },
      "annotations": {
        "summary": "CPU usage is above 80%",
        "description": "CPU usage has been above 80% for more than 5 minutes"
      }
    }
  ]
};

// 使用原始JSON端点发送复杂告警数据
fetch('https://your-worker.workers.dev/v1/raw?targets=' + encodeURIComponent(feishuUrl), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(alertData)
});
```

### CI/CD 管道集成

```yaml
# GitHub Actions 示例
- name: Notify Multiple Platforms
  run: |
    # 构建多平台目标列表
    TARGETS=$(python3 -c "
    import urllib.parse
    import os
    urls = [
      os.environ['FEISHU_WEBHOOK'],
      os.environ['DINGTALK_WEBHOOK'],
      os.environ['SLACK_WEBHOOK']  # 使用通用格式发送到Slack
    ]
    print(','.join([urllib.parse.quote(url, safe='') for url in urls]))
    ")
    
    # 发送构建状态通知
    curl -X POST "https://your-worker.workers.dev/v1/slack?targets=$TARGETS" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"🚀 部署完成\\n项目: ${{ github.repository }}\\n分支: ${{ github.ref }}\\n状态: ${{ job.status }}\"}"
```

## 🔍 调试和监控

### 健康检查

```bash
curl https://your-worker.workers.dev/v1/health
```

响应示例：
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "version": "2.0.0",
  "supportedInputs": ["slack", "raw", "text"],
  "supportedOutputs": ["feishu", "dingtalk", "wechatwork", "generic"]
}
```

### 详细响应信息

所有成功的转发请求都会返回详细信息：

```json
{
  "status": "success",
  "message": "Request received and forwarded to 2/3 target(s).",
  "inputType": "slack",
  "passthrough": false,
  "details": [
    {
      "success": true,
      "status": 200,
      "url": "https://open.feishu.cn/...",
      "processorType": "feishu"
    },
    {
      "success": true,
      "status": 200,
      "url": "https://oapi.dingtalk.com/...",
      "processorType": "dingtalk"
    },
    {
      "success": false,
      "url": "https://invalid-url",
      "error": "Invalid URL format"
    }
  ]
}
```

## 🚨 最佳实践

1. **使用透传模式**：对于复杂的富文本、卡片消息，使用 `passthrough=true`
2. **平台特定优化**：为不同平台准备专门的消息格式
3. **错误处理**：检查响应中的 `details` 数组，处理部分失败的情况
4. **URL编码**：确保所有目标URL都正确进行了URL编码
5. **批量发送**：利用多目标功能减少请求次数
