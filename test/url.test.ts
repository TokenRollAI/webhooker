/**
 * URL 工具测试
 */

import { describe, it, expect } from 'vitest';
import {
  buildWebhookUrl,
  resolveProvider,
  detectProviderFromUrl,
  parseTargetsFromQuery,
} from '../src/utils/url';
import type { TargetEndpoint } from '../src/core/types';

describe('buildWebhookUrl', () => {
  it('should build feishu URL', () => {
    const target: TargetEndpoint = { provider: 'feishu', token: 'xxx-xxx' };
    const url = buildWebhookUrl(target);

    expect(url).toBe('https://open.feishu.cn/open-apis/bot/v2/hook/xxx-xxx');
  });

  it('should build dingtalk URL', () => {
    const target: TargetEndpoint = { provider: 'dingtalk', token: 'abc123' };
    const url = buildWebhookUrl(target);

    expect(url).toBe('https://oapi.dingtalk.com/robot/send?access_token=abc123');
  });

  it('should build discord URL', () => {
    const target: TargetEndpoint = { provider: 'discord', token: '123/abc' };
    const url = buildWebhookUrl(target);

    expect(url).toBe('https://discord.com/api/webhooks/123/abc');
  });

  it('should build telegram URL with method', () => {
    const target: TargetEndpoint = { provider: 'telegram', token: 'BOT_TOKEN' };
    const url = buildWebhookUrl(target);

    expect(url).toBe('https://api.telegram.org/botBOT_TOKEN/sendMessage');
  });

  it('should use fullUrl for generic provider', () => {
    const target: TargetEndpoint = {
      provider: 'generic',
      token: '',
      fullUrl: 'https://custom.example.com/webhook',
    };
    const url = buildWebhookUrl(target);

    expect(url).toBe('https://custom.example.com/webhook');
  });
});

describe('resolveProvider', () => {
  it('should resolve standard names', () => {
    expect(resolveProvider('feishu')).toBe('feishu');
    expect(resolveProvider('dingtalk')).toBe('dingtalk');
    expect(resolveProvider('discord')).toBe('discord');
  });

  it('should resolve aliases', () => {
    expect(resolveProvider('fs')).toBe('feishu');
    expect(resolveProvider('lark')).toBe('feishu');
    expect(resolveProvider('dd')).toBe('dingtalk');
    expect(resolveProvider('tg')).toBe('telegram');
    expect(resolveProvider('wxwork')).toBe('wechatwork');
  });

  it('should be case insensitive', () => {
    expect(resolveProvider('FEISHU')).toBe('feishu');
    expect(resolveProvider('DingTalk')).toBe('dingtalk');
  });

  it('should return null for unknown', () => {
    expect(resolveProvider('unknown')).toBeNull();
  });
});

describe('detectProviderFromUrl', () => {
  it('should detect feishu', () => {
    expect(detectProviderFromUrl('https://open.feishu.cn/open-apis/bot/v2/hook/xxx')).toBe('feishu');
    expect(detectProviderFromUrl('https://open.larksuite.com/open-apis/bot/v2/hook/xxx')).toBe('feishu');
  });

  it('should detect dingtalk', () => {
    expect(detectProviderFromUrl('https://oapi.dingtalk.com/robot/send?access_token=xxx')).toBe('dingtalk');
  });

  it('should detect wechatwork', () => {
    expect(detectProviderFromUrl('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx')).toBe('wechatwork');
  });

  it('should detect discord', () => {
    expect(detectProviderFromUrl('https://discord.com/api/webhooks/123/abc')).toBe('discord');
  });

  it('should default to generic', () => {
    expect(detectProviderFromUrl('https://example.com/webhook')).toBe('generic');
  });
});

describe('parseTargetsFromQuery', () => {
  it('should parse single target', () => {
    const params = new URLSearchParams('feishu=token123');
    const targets = parseTargetsFromQuery(params);

    expect(targets).toHaveLength(1);
    expect(targets[0].provider).toBe('feishu');
    expect(targets[0].token).toBe('token123');
  });

  it('should parse multiple targets of same type', () => {
    const params = new URLSearchParams('feishu=token1&feishu=token2');
    const targets = parseTargetsFromQuery(params);

    expect(targets).toHaveLength(2);
    expect(targets[0].token).toBe('token1');
    expect(targets[1].token).toBe('token2');
  });

  it('should parse multiple different providers', () => {
    const params = new URLSearchParams('feishu=token1&dingtalk=token2&discord=token3');
    const targets = parseTargetsFromQuery(params);

    expect(targets).toHaveLength(3);
    expect(targets.map(t => t.provider)).toEqual(['feishu', 'dingtalk', 'discord']);
  });

  it('should parse generic with full URL', () => {
    const params = new URLSearchParams('generic=https://example.com/webhook');
    const targets = parseTargetsFromQuery(params);

    expect(targets).toHaveLength(1);
    expect(targets[0].provider).toBe('generic');
    expect(targets[0].fullUrl).toBe('https://example.com/webhook');
  });

  it('should parse secret parameters', () => {
    const params = new URLSearchParams('dingtalk=token1&dingtalk_secret=secret123');
    const targets = parseTargetsFromQuery(params);

    expect(targets).toHaveLength(1);
    expect(targets[0].secret).toBe('secret123');
  });

  it('should ignore option parameters', () => {
    const params = new URLSearchParams('feishu=token1&title=Test&level=error');
    const targets = parseTargetsFromQuery(params);

    expect(targets).toHaveLength(1);
    expect(targets[0].provider).toBe('feishu');
  });
});
