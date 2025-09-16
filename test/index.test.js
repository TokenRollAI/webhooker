import { describe, it, expect, vi, beforeEach } from 'vitest';

// 模拟 Cloudflare Workers 环境
global.fetch = vi.fn();

// 导入我们的 worker
import worker from '../src/index.js';

describe('Webhooker - 多平台 Webhook 转发器', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('路由测试', () => {
    it('应该拒绝非 POST 请求到 /v1/slack', async () => {
      const request = new Request('https://example.com/v1/slack', {
        method: 'GET'
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.status).toBe('error');
      expect(data.message).toContain('not found');
    });

    it('应该拒绝非 POST 请求到 /v1/feishu', async () => {
      const request = new Request('https://example.com/v1/feishu', {
        method: 'GET'
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.status).toBe('error');
      expect(data.message).toContain('not found');
    });

    it('应该响应健康检查', async () => {
      const request = new Request('https://example.com/v1/health', {
        method: 'GET'
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.supportedInputs).toContain('slack');
      expect(data.supportedOutputs).toContain('feishu');
    });

    it('应该返回 404 对未知路径', async () => {
      const request = new Request('https://example.com/unknown', {
        method: 'POST'
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.status).toBe('error');
    });
  });

  describe('参数验证', () => {
    it('应该要求 targets 参数', async () => {
      const request = new Request('https://example.com/v1/slack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'test message' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('targets');
    });

    it('应该要求有效的 JSON 请求体', async () => {
      const request = new Request('https://example.com/v1/slack?targets=http%3A//example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('Invalid JSON');
    });

    it('应该要求非空的消息文本', async () => {
      const request = new Request('https://example.com/v1/slack?targets=http%3A//example.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: '' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.status).toBe('error');
      expect(data.message).toContain('empty');
    });
  });

  describe('消息转发', () => {
    it('应该成功转发到单个目标', async () => {
      // 模拟成功的飞书 API 响应
      global.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200
      });

      const feishuUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook';
      const encodedUrl = encodeURIComponent(feishuUrl);
      
      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Test message' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.message).toContain('1/1 target');
      
      // 验证飞书 API 调用
      expect(global.fetch).toHaveBeenCalledWith(
        feishuUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'text',
            content: { text: 'Test message' }
          })
        })
      );
    });

    it('应该成功转发到多个目标', async () => {
      // 模拟多个成功的飞书 API 响应
      global.fetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: true, status: 200 });

      const url1 = 'https://open.feishu.cn/open-apis/bot/v2/hook/webhook1';
      const url2 = 'https://open.feishu.cn/open-apis/bot/v2/hook/webhook2';
      const encodedUrls = `${encodeURIComponent(url1)},${encodeURIComponent(url2)}`;
      
      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrls}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Multi-target message' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.message).toContain('2/2 target');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('应该处理部分失败的情况', async () => {
      // 模拟一个成功，一个失败
      global.fetch
        .mockResolvedValueOnce({ ok: true, status: 200 })
        .mockResolvedValueOnce({ ok: false, status: 400 });

      const url1 = 'https://open.feishu.cn/open-apis/bot/v2/hook/webhook1';
      const url2 = 'https://open.feishu.cn/open-apis/bot/v2/hook/webhook2';
      const encodedUrls = `${encodeURIComponent(url1)},${encodeURIComponent(url2)}`;
      
      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrls}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Partial failure test' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.message).toContain('1/2 target');
    });
  });

  describe('多输入源支持', () => {
    it('应该支持原始 JSON 输入', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const feishuUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook';
      const encodedUrl = encodeURIComponent(feishuUrl);

      const request = new Request(`https://example.com/v1/raw?targets=${encodedUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: 'Raw JSON test' }
        })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.inputType).toBe('raw');

      const [, feishuRequest] = global.fetch.mock.calls[0];
      const forwardedPayload = JSON.parse(feishuRequest.body);
      expect(forwardedPayload.msg_type).toBe('text');
      expect(forwardedPayload.content.text).toBe(
        JSON.stringify({
          msg_type: 'text',
          content: { text: 'Raw JSON test' }
        })
      );
    });

    it('应该支持透传模式', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const feishuUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook';
      const encodedUrl = encodeURIComponent(feishuUrl);

      const customPayload = {
        msg_type: 'interactive',
        card: { elements: [{ tag: 'div', text: { content: 'Custom card' } }] }
      };

      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrl}&passthrough=true`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customPayload)
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.passthrough).toBe(true);

      // 验证透传的内容被转为文本发送
      const [, feishuRequest] = global.fetch.mock.calls[0];
      const forwardedPayload = JSON.parse(feishuRequest.body);
      expect(forwardedPayload.msg_type).toBe('text');
      expect(forwardedPayload.content.text).toBe(JSON.stringify(customPayload));
    });
  });

  describe('飞书输入', () => {
    it('应该将飞书文本转发到 Slack', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const slackUrl = 'https://hooks.slack.com/services/T000/B000/XXXXXXXX';
      const encodedUrl = encodeURIComponent(slackUrl);

      const request = new Request(`https://example.com/v1/feishu?targets=${encodedUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: '来自飞书的提醒' }
        })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.details[0].processorType).toBe('slack');

      const [, slackRequest] = global.fetch.mock.calls[0];
      const slackPayload = JSON.parse(slackRequest.body);
      expect(slackPayload.text).toBe('来自飞书的提醒');
      expect(slackPayload.mrkdwn).toBe(false);
    });

    it('应该将飞书文本转发到钉钉', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const dingtalkUrl = 'https://oapi.dingtalk.com/robot/send?access_token=abcd';
      const encodedUrl = encodeURIComponent(dingtalkUrl);

      const request = new Request(`https://example.com/v1/feishu?targets=${encodedUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          msg_type: 'text',
          content: { text: '同步到钉钉' }
        })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.details[0].processorType).toBe('dingtalk');

      const [, dingtalkRequest] = global.fetch.mock.calls[0];
      const dingtalkPayload = JSON.parse(dingtalkRequest.body);
      expect(dingtalkPayload.msgtype).toBe('text');
      expect(dingtalkPayload.text.content).toBe('同步到钉钉');
    });
  });

  describe('多输出源支持', () => {
    it('应该自动检测飞书 URL', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const feishuUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook';
      const encodedUrl = encodeURIComponent(feishuUrl);

      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Auto detect test' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.details[0].processorType).toBe('feishu');
    });

    it('应该支持指定输出类型', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const genericUrl = 'https://httpbin.org/post';
      const encodedUrl = encodeURIComponent(genericUrl);

      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrl}&output=dingtalk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'DingTalk format test' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.details[0].processorType).toBe('dingtalk');
    });
  });

  describe('URL 处理', () => {
    it('应该正确解码 URL 编码的目标地址', async () => {
      global.fetch.mockResolvedValueOnce({ ok: true, status: 200 });

      const originalUrl = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-webhook?param=value&other=123';
      const encodedUrl = encodeURIComponent(originalUrl);

      const request = new Request(`https://example.com/v1/slack?targets=${encodedUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'URL decode test' })
      });

      await worker.fetch(request);

      expect(global.fetch).toHaveBeenCalledWith(
        originalUrl,
        expect.any(Object)
      );
    });

    it('应该处理无效的 URL', async () => {
      const invalidUrl = encodeURIComponent('not-a-valid-url');

      const request = new Request(`https://example.com/v1/slack?targets=${invalidUrl}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Invalid URL test' })
      });

      const response = await worker.fetch(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('success');
      expect(data.message).toContain('0/1 target');
    });
  });

});
