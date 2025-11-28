/**
 * 消息构建工具
 */

import type { IMMessage, IMMessageInput, MessageLevel, GatewayEvent, EventMetadata } from '../core/types';
import { DEFAULTS } from '../core/constants';

/**
 * 创建 IMMessage
 */
export function createMessage(input: IMMessageInput): IMMessage {
  return {
    body: input.body,
    level: input.level ?? DEFAULTS.level,
    title: input.title,
    link: input.link,
    fields: input.fields,
    mentions: input.mentions,
    images: input.images,
    actions: input.actions,
    footer: input.footer,
    timestamp: input.timestamp,
  };
}

/**
 * 创建 GatewayEvent
 */
export function createGatewayEvent(
  message: IMMessage,
  source: string,
  rawPayload?: unknown
): GatewayEvent {
  const metadata: EventMetadata = {
    source,
    receivedAt: Date.now(),
    traceId: generateTraceId(),
  };

  return {
    message,
    metadata,
    rawPayload,
  };
}

/**
 * 生成追踪 ID
 */
function generateTraceId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}

/**
 * 从纯文本创建简单消息
 */
export function fromText(text: string, source: string): GatewayEvent {
  const message = createMessage({ body: text });
  return createGatewayEvent(message, source);
}

/**
 * 从原始 payload 创建事件 (raw 模式)
 */
export function fromRawPayload(payload: unknown, source: string): GatewayEvent {
  const message = createMessage({
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
    level: 'info',
  });
  return createGatewayEvent(message, source, payload);
}

/**
 * 解析消息级别
 */
export function parseLevel(level: string | undefined): MessageLevel {
  if (!level) return DEFAULTS.level;

  const normalized = level.toLowerCase();
  const validLevels: MessageLevel[] = ['info', 'success', 'warning', 'error'];

  if (validLevels.includes(normalized as MessageLevel)) {
    return normalized as MessageLevel;
  }

  // 别名映射
  const aliases: Record<string, MessageLevel> = {
    ok: 'success',
    good: 'success',
    warn: 'warning',
    danger: 'error',
    critical: 'error',
    fatal: 'error',
  };

  return aliases[normalized] || DEFAULTS.level;
}

/**
 * 截断文本
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * 移除 Markdown 格式
 */
export function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // **bold**
    .replace(/\*([^*]+)\*/g, '$1')         // *italic*
    .replace(/__([^_]+)__/g, '$1')         // __underline__
    .replace(/~~([^~]+)~~/g, '$1')         // ~~strikethrough~~
    .replace(/`([^`]+)`/g, '$1')           // `code`
    .replace(/```[\s\S]*?```/g, '')        // code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [link](url)
    .replace(/^#+\s*/gm, '')               // headers
    .replace(/^[-*]\s*/gm, '')             // list items
    .replace(/^>\s*/gm, '');               // blockquotes
}

/**
 * 提取第一行作为标题
 */
export function extractTitle(text: string, maxLength = 50): string {
  const firstLine = text.split('\n')[0].trim();
  return truncate(stripMarkdown(firstLine), maxLength);
}
