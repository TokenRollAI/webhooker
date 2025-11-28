/**
 * 通用消息解析器
 * 智能解析各种 JSON 格式
 */

import type { SourceParser, GatewayEvent, IMMessage, MessageField } from '../core/types';
import { createMessage, createGatewayEvent, parseLevel } from '../utils/message';

interface GenericPayload {
  // 常见的消息字段
  message?: string;
  text?: string;
  content?: string;
  body?: string;
  description?: string;
  msg?: string;

  // 常见的标题字段
  title?: string;
  subject?: string;
  summary?: string;
  name?: string;

  // 常见的级别字段
  level?: string;
  severity?: string;
  status?: string;
  type?: string;
  priority?: string;

  // 常见的链接字段
  url?: string;
  link?: string;
  href?: string;

  // 嵌套数据
  data?: Record<string, unknown>;
  payload?: Record<string, unknown>;
  alert?: Record<string, unknown>;

  // 其他字段
  [key: string]: unknown;
}

export class GenericParser implements SourceParser {
  readonly name = 'generic';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    const message = this.parsePayload(body);
    return createGatewayEvent(message, this.name, body);
  }

  private parsePayload(body: unknown): IMMessage {
    // 处理字符串
    if (typeof body === 'string') {
      return createMessage({ body });
    }

    // 处理非对象
    if (typeof body !== 'object' || body === null) {
      return createMessage({ body: String(body) });
    }

    const payload = body as GenericPayload;

    // 提取正文
    const bodyText = this.extractBody(payload);

    // 提取标题
    const title = this.extractTitle(payload);

    // 提取级别
    const level = this.extractLevel(payload);

    // 提取链接
    const link = this.extractLink(payload);

    // 提取字段
    const fields = this.extractFields(payload);

    return createMessage({
      body: bodyText,
      title,
      level,
      link,
      fields: fields.length > 0 ? fields : undefined,
    });
  }

  private extractBody(payload: GenericPayload): string {
    // 按优先级尝试提取正文
    const bodyFields = ['message', 'text', 'content', 'body', 'description', 'msg'];

    for (const field of bodyFields) {
      const value = payload[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    // 尝试从嵌套数据中提取
    const nestedFields = ['data', 'payload', 'alert'];
    for (const field of nestedFields) {
      const nested = payload[field];
      if (nested && typeof nested === 'object') {
        const nestedBody = this.extractBody(nested as GenericPayload);
        if (nestedBody) return nestedBody;
      }
    }

    // 最后尝试 JSON 序列化
    return JSON.stringify(payload, null, 2);
  }

  private extractTitle(payload: GenericPayload): string | undefined {
    const titleFields = ['title', 'subject', 'summary', 'name'];

    for (const field of titleFields) {
      const value = payload[field];
      if (typeof value === 'string' && value.trim()) {
        return value;
      }
    }

    // 尝试从嵌套数据中提取
    const nestedFields = ['data', 'payload', 'alert'];
    for (const field of nestedFields) {
      const nested = payload[field];
      if (nested && typeof nested === 'object') {
        const nestedTitle = this.extractTitle(nested as GenericPayload);
        if (nestedTitle) return nestedTitle;
      }
    }

    return undefined;
  }

  private extractLevel(payload: GenericPayload): IMMessage['level'] {
    const levelFields = ['level', 'severity', 'status', 'type', 'priority'];

    for (const field of levelFields) {
      const value = payload[field];
      if (typeof value === 'string') {
        const parsed = parseLevel(value);
        if (parsed !== 'info') return parsed;
      }
    }

    // 尝试从嵌套数据中提取
    const nestedFields = ['data', 'payload', 'alert'];
    for (const field of nestedFields) {
      const nested = payload[field];
      if (nested && typeof nested === 'object') {
        const nestedLevel = this.extractLevel(nested as GenericPayload);
        if (nestedLevel !== 'info') return nestedLevel;
      }
    }

    return 'info';
  }

  private extractLink(payload: GenericPayload): string | undefined {
    const linkFields = ['url', 'link', 'href'];

    for (const field of linkFields) {
      const value = payload[field];
      if (typeof value === 'string' && this.isValidUrl(value)) {
        return value;
      }
    }

    return undefined;
  }

  private extractFields(payload: GenericPayload): MessageField[] {
    const fields: MessageField[] = [];
    const skipFields = new Set([
      'message', 'text', 'content', 'body', 'description', 'msg',
      'title', 'subject', 'summary', 'name',
      'level', 'severity', 'status', 'type', 'priority',
      'url', 'link', 'href',
      'data', 'payload', 'alert',
    ]);

    for (const [key, value] of Object.entries(payload)) {
      if (skipFields.has(key)) continue;

      if (value === null || value === undefined) continue;

      // 只处理简单值
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        fields.push({
          label: this.formatFieldLabel(key),
          value: String(value),
          short: String(value).length < 30,
        });
      }
    }

    return fields.slice(0, 10); // 最多 10 个字段
  }

  private formatFieldLabel(key: string): string {
    // 将 snake_case 或 camelCase 转为可读格式
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/^./, (s) => s.toUpperCase());
  }

  private isValidUrl(str: string): boolean {
    try {
      const url = new URL(str);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
