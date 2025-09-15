# 使用示例

## 基本使用流程

### 1. 准备飞书机器人 Webhook URL

首先在飞书群组中创建自定义机器人：

1. 打开飞书群组
2. 点击群设置 → 群机器人 → 添加机器人 → 自定义机器人
3. 设置机器人名称和描述
4. 复制生成的 Webhook URL，格式类似：
   ```
   https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
   ```

### 2. URL 编码

使用任何编程语言或在线工具对 Webhook URL 进行编码：

**JavaScript:**
```javascript
const feishuUrl = "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx";
const encodedUrl = encodeURIComponent(feishuUrl);
console.log(encodedUrl);
```

**Python:**
```python
import urllib.parse

feishu_url = "https://open.feishu.cn/open-apis/bot/v2/hook/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
encoded_url = urllib.parse.quote(feishu_url, safe='')
print(encoded_url)
```

**在线工具:**
使用 https://www.urlencoder.org/ 等在线工具

### 3. 发送测试消息

```bash
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=YOUR_ENCODED_URL_HERE" \
  -H "Content-Type: application/json" \
  -d '{"text": "🎉 Webhooker 测试消息：系统运行正常！"}'
```

## 实际应用场景

### 场景1：服务器监控告警

**Zabbix 监控系统集成:**
```bash
# 在 Zabbix 中配置 Webhook 媒体类型
# URL: https://your-worker.your-subdomain.workers.dev/v1/slack?targets={ALERT.SENDTO}
# 消息体模板:
{
  "text": "🚨 告警通知\n主机: {HOST.NAME}\n问题: {EVENT.NAME}\n严重程度: {EVENT.SEVERITY}\n时间: {EVENT.DATE} {EVENT.TIME}"
}
```

### 场景2：CI/CD 构建通知

**GitHub Actions 集成:**
```yaml
# .github/workflows/deploy.yml
- name: Notify Feishu
  if: always()
  run: |
    curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=${{ secrets.FEISHU_WEBHOOK_ENCODED }}" \
      -H "Content-Type: application/json" \
      -d "{\"text\": \"🚀 部署状态: ${{ job.status }}\\n分支: ${{ github.ref }}\\n提交: ${{ github.sha }}\"}"
```

**Jenkins 集成:**
```groovy
pipeline {
    agent any
    post {
        always {
            script {
                def message = "📦 构建完成\\n项目: ${env.JOB_NAME}\\n状态: ${currentBuild.result}\\n构建号: ${env.BUILD_NUMBER}"
                sh """
                curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=${env.FEISHU_WEBHOOK_ENCODED}" \
                  -H "Content-Type: application/json" \
                  -d '{"text": "${message}"}'
                """
            }
        }
    }
}
```

### 场景3：多团队通知

**同时通知开发、运维、产品团队:**
```bash
# 准备多个飞书群组的 Webhook URL
DEV_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/dev-team-webhook"
OPS_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/ops-team-webhook"
PRODUCT_WEBHOOK="https://open.feishu.cn/open-apis/bot/v2/hook/product-team-webhook"

# URL 编码
DEV_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$DEV_WEBHOOK', safe=''))")
OPS_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$OPS_WEBHOOK', safe=''))")
PRODUCT_ENCODED=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$PRODUCT_WEBHOOK', safe=''))")

# 组合目标
TARGETS="$DEV_ENCODED,$OPS_ENCODED,$PRODUCT_ENCODED"

# 发送通知
curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=$TARGETS" \
  -H "Content-Type: application/json" \
  -d '{"text": "🎯 重要通知：新版本 v2.1.0 已发布到生产环境"}'
```

### 场景4：应用程序集成

**Node.js 应用:**
```javascript
const axios = require('axios');

async function sendFeishuNotification(message, webhookUrls) {
  const encodedTargets = webhookUrls
    .map(url => encodeURIComponent(url))
    .join(',');
  
  const webhookerUrl = `https://your-worker.your-subdomain.workers.dev/v1/slack?targets=${encodedTargets}`;
  
  try {
    const response = await axios.post(webhookerUrl, {
      text: message
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    console.log('通知发送成功:', response.data);
  } catch (error) {
    console.error('通知发送失败:', error.message);
  }
}

// 使用示例
sendFeishuNotification(
  '💰 新订单提醒：订单号 #12345，金额 ¥299.00',
  [
    'https://open.feishu.cn/open-apis/bot/v2/hook/sales-team-webhook',
    'https://open.feishu.cn/open-apis/bot/v2/hook/finance-team-webhook'
  ]
);
```

**Python 应用:**
```python
import requests
import urllib.parse

def send_feishu_notification(message, webhook_urls):
    encoded_targets = ','.join([
        urllib.parse.quote(url, safe='') 
        for url in webhook_urls
    ])
    
    webhooker_url = f"https://your-worker.your-subdomain.workers.dev/v1/slack?targets={encoded_targets}"
    
    try:
        response = requests.post(webhooker_url, json={
            'text': message
        })
        response.raise_for_status()
        print('通知发送成功:', response.json())
    except requests.RequestException as e:
        print('通知发送失败:', str(e))

# 使用示例
send_feishu_notification(
    '🔧 系统维护通知：将在今晚 23:00 进行例行维护，预计耗时 2 小时',
    [
        'https://open.feishu.cn/open-apis/bot/v2/hook/dev-team-webhook',
        'https://open.feishu.cn/open-apis/bot/v2/hook/ops-team-webhook'
    ]
)
```

## 故障排查

### 常见问题

1. **400 错误 - targets 参数缺失**
   - 检查 URL 中是否包含 `targets` 查询参数
   - 确保参数值不为空

2. **400 错误 - 消息文本为空**
   - 检查请求体中的 `text` 字段是否存在且不为空
   - 确保 JSON 格式正确

3. **部分目标发送失败**
   - 检查飞书 Webhook URL 是否正确
   - 确认机器人是否被禁用或删除
   - 验证 URL 编码是否正确

4. **网络超时**
   - Cloudflare Workers 有执行时间限制
   - 考虑减少同时发送的目标数量

### 调试技巧

1. **验证 URL 编码:**
   ```bash
   # 编码
   python3 -c "import urllib.parse; print(urllib.parse.quote('YOUR_URL_HERE', safe=''))"
   
   # 解码验证
   python3 -c "import urllib.parse; print(urllib.parse.unquote('YOUR_ENCODED_URL_HERE'))"
   ```

2. **测试单个目标:**
   ```bash
   curl -X POST "https://your-worker.your-subdomain.workers.dev/v1/slack?targets=SINGLE_ENCODED_URL" \
     -H "Content-Type: application/json" \
     -d '{"text": "测试消息"}' \
     -v
   ```

3. **检查响应详情:**
   响应中的 `details` 字段包含每个目标的发送状态，可用于诊断问题。
