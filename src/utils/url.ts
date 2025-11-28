/**
 * URL 构建工具
 */

import { PROVIDER_BASE_URLS, TELEGRAM_METHOD, PROVIDER_ALIASES } from '../core/constants';
import type { Provider, TargetEndpoint } from '../core/types';

/**
 * 根据 provider 和 token 构建完整的 Webhook URL
 */
export function buildWebhookUrl(target: TargetEndpoint): string {
  const { provider, token, fullUrl } = target;

  // generic 类型使用完整 URL
  if (provider === 'generic') {
    if (!fullUrl) {
      throw new Error('Generic provider requires fullUrl');
    }
    return fullUrl;
  }

  const baseUrl = PROVIDER_BASE_URLS[provider];
  if (!baseUrl) {
    throw new Error(`Unknown provider: ${provider}`);
  }

  // Telegram 特殊处理
  if (provider === 'telegram') {
    return `${baseUrl}${token}${TELEGRAM_METHOD}`;
  }

  return `${baseUrl}${token}`;
}

/**
 * 解析 URL 参数中的 provider
 */
export function resolveProvider(alias: string): Provider | null {
  const normalized = alias.toLowerCase().trim();
  return PROVIDER_ALIASES[normalized] || null;
}

/**
 * 从 URL 中检测 provider 类型
 */
export function detectProviderFromUrl(url: string): Provider {
  const lowerUrl = url.toLowerCase();

  if (lowerUrl.includes('feishu.cn') || lowerUrl.includes('larksuite.com')) {
    return 'feishu';
  }
  if (lowerUrl.includes('dingtalk.com') || lowerUrl.includes('oapi.dingtalk')) {
    return 'dingtalk';
  }
  if (lowerUrl.includes('qyapi.weixin.qq.com')) {
    return 'wechatwork';
  }
  if (lowerUrl.includes('discord.com/api/webhooks')) {
    return 'discord';
  }
  if (lowerUrl.includes('api.telegram.org')) {
    return 'telegram';
  }
  if (lowerUrl.includes('hooks.slack.com')) {
    return 'slack';
  }

  return 'generic';
}

/**
 * 验证 token 格式 (基础检查)
 */
export function isValidToken(token: string): boolean {
  return token.length > 0 && !/\s/.test(token);
}

/**
 * 从 URL Query 解析目标列表
 * 支持格式:
 * - ?feishu=TOKEN1&feishu=TOKEN2&dingtalk=TOKEN3
 * - ?fs=TOKEN (别名)
 * - ?generic=https://example.com/webhook (完整 URL)
 */
export function parseTargetsFromQuery(searchParams: URLSearchParams): TargetEndpoint[] {
  const targets: TargetEndpoint[] = [];
  const secretMap = new Map<string, string>();

  // 首先收集所有 secret
  for (const [key, value] of searchParams.entries()) {
    if (key.endsWith('_secret')) {
      const providerAlias = key.slice(0, -7); // 移除 _secret
      secretMap.set(providerAlias, value);
    }
  }

  // 解析目标
  for (const [key, value] of searchParams.entries()) {
    // 跳过选项参数和 secret
    if (['title', 'level', 'auth'].includes(key) || key.endsWith('_secret')) {
      continue;
    }

    const provider = resolveProvider(key);
    if (!provider) {
      continue; // 忽略未知的 provider
    }

    if (!value) {
      continue;
    }

    // generic 需要完整 URL
    if (provider === 'generic') {
      if (isValidHttpUrl(value)) {
        targets.push({
          provider,
          token: '',
          fullUrl: value,
        });
      }
    } else {
      // 其他 provider 只需要 token
      targets.push({
        provider,
        token: value,
        secret: secretMap.get(key),
      });
    }
  }

  return targets;
}

/**
 * 检查是否为有效的 HTTP(S) URL
 */
export function isValidHttpUrl(str: string): boolean {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
