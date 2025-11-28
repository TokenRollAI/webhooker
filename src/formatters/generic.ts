/**
 * 通用格式化器
 * 将 IMMessage 转换为通用 JSON 格式
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { HEADERS } from '../core/constants';

export class GenericFormatter implements OutputFormatter {
  readonly name = 'generic';
  readonly provider = 'generic' as const;

  format(event: GatewayEvent, target: TargetEndpoint): FormattedRequest {
    const { message, metadata } = event;

    return {
      url: this.buildUrl(target),
      method: 'POST',
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.CONTENT_TYPE_JSON },
      body: this.buildMessage(message, metadata),
    };
  }

  private buildUrl(target: TargetEndpoint): string {
    // generic 类型必须提供完整 URL
    if (target.fullUrl) {
      return target.fullUrl;
    }
    // 如果 token 看起来像 URL，直接使用
    if (target.token.startsWith('http://') || target.token.startsWith('https://')) {
      return target.token;
    }
    throw new Error('Generic formatter requires fullUrl or a valid URL as token');
  }

  private buildMessage(
    message: IMMessage,
    metadata: GatewayEvent['metadata']
  ): Record<string, unknown> {
    // 通用格式：直接映射 IMMessage 结构
    const result: Record<string, unknown> = {
      title: message.title,
      body: message.body,
      level: message.level,
      link: message.link,
      timestamp: message.timestamp || Math.floor(Date.now() / 1000),
      source: metadata.source,
      traceId: metadata.traceId,
    };

    // 可选字段
    if (message.fields && message.fields.length > 0) {
      result.fields = message.fields;
    }

    if (message.mentions && message.mentions.length > 0) {
      result.mentions = message.mentions;
    }

    if (message.images && message.images.length > 0) {
      result.images = message.images;
    }

    if (message.actions && message.actions.length > 0) {
      result.actions = message.actions;
    }

    if (message.footer) {
      result.footer = message.footer;
    }

    // 清理 undefined 值
    return Object.fromEntries(
      Object.entries(result).filter(([_, v]) => v !== undefined)
    );
  }
}
