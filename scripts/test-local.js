#!/usr/bin/env node

/**
 * 本地测试脚本
 * 用于测试部署后的 Webhooker 服务
 */

const https = require('https');
const http = require('http');

// 配置
const WORKER_URL = process.env.WORKER_URL || 'http://localhost:8787';
const TEST_FEISHU_WEBHOOK = process.env.TEST_FEISHU_WEBHOOK || 'https://httpbin.org/post';

/**
 * 发送 HTTP 请求
 */
function makeRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https:') ? https : http;
    
    const req = lib.request(url, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const jsonBody = JSON.parse(body);
          resolve({ status: res.statusCode, data: jsonBody });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

/**
 * 测试用例
 */
const tests = [
  {
    name: '测试健康检查',
    method: 'GET',
    path: '/v1/health',
    expectedStatus: 200
  },
  {
    name: '测试未知路径',
    method: 'POST',
    path: '/unknown',
    data: { text: 'test' },
    expectedStatus: 404
  },
  {
    name: '测试缺少 targets 参数',
    method: 'POST',
    path: '/v1/slack',
    data: { text: 'test message' },
    expectedStatus: 400
  },
  {
    name: '测试空消息文本',
    method: 'POST',
    path: '/v1/slack?targets=' + encodeURIComponent(TEST_FEISHU_WEBHOOK),
    data: { text: '' },
    expectedStatus: 400
  },
  {
    name: '测试 Slack 格式消息发送',
    method: 'POST',
    path: '/v1/slack?targets=' + encodeURIComponent(TEST_FEISHU_WEBHOOK),
    data: { text: '🧪 Slack格式测试消息 - ' + new Date().toISOString() },
    expectedStatus: 200
  },
  {
    name: '测试原始 JSON 消息发送',
    method: 'POST',
    path: '/v1/raw?targets=' + encodeURIComponent(TEST_FEISHU_WEBHOOK),
    data: {
      msg_type: 'text',
      content: { text: '🔧 原始JSON测试消息 - ' + new Date().toISOString() }
    },
    expectedStatus: 200
  },
  {
    name: '测试透传模式',
    method: 'POST',
    path: '/v1/slack?targets=' + encodeURIComponent(TEST_FEISHU_WEBHOOK) + '&passthrough=true',
    data: {
      msg_type: 'text',
      content: { text: '🚀 透传模式测试消息 - ' + new Date().toISOString() }
    },
    expectedStatus: 200
  },
  {
    name: '测试指定输出格式',
    method: 'POST',
    path: '/v1/slack?targets=' + encodeURIComponent(TEST_FEISHU_WEBHOOK) + '&output=dingtalk',
    data: { text: '📱 钉钉格式测试消息 - ' + new Date().toISOString() },
    expectedStatus: 200
  },
  {
    name: '测试多目标发送',
    method: 'POST',
    path: '/v1/slack?targets=' + [TEST_FEISHU_WEBHOOK, TEST_FEISHU_WEBHOOK].map(encodeURIComponent).join(','),
    data: { text: '🎯 多目标测试消息 - ' + new Date().toISOString() },
    expectedStatus: 200
  }
];

/**
 * 运行测试
 */
async function runTests() {
  console.log('🚀 开始测试 Webhooker 服务...');
  console.log(`📍 目标地址: ${WORKER_URL}`);
  console.log(`🎯 测试 Webhook: ${TEST_FEISHU_WEBHOOK}`);
  console.log('');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`⏳ ${test.name}...`);
      
      const url = `${WORKER_URL}${test.path}`;
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      const result = await makeRequest(url, options, test.data);
      
      if (result.status === test.expectedStatus) {
        console.log(`✅ 通过 (状态码: ${result.status})`);
        passed++;
      } else {
        console.log(`❌ 失败 (期望: ${test.expectedStatus}, 实际: ${result.status})`);
        console.log(`   响应: ${JSON.stringify(result.data, null, 2)}`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ 错误: ${error.message}`);
      failed++;
    }
    
    console.log('');
  }

  console.log('📊 测试结果:');
  console.log(`✅ 通过: ${passed}`);
  console.log(`❌ 失败: ${failed}`);
  console.log(`📈 成功率: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    process.exit(1);
  }
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests };
