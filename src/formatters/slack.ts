/**
 * Slack 格式化器
 * 将 IMMessage 转换为 Slack Incoming Webhook 消息格式
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { PROVIDER_BASE_URLS, LEVEL_COLORS, HEADERS } from '../core/constants';

interface SlackTextObject {
  type: string;
  text: string;
  emoji?: boolean;
}

interface SlackBlockElement {
  type: string;
  text?: SlackTextObject | string;
  url?: string;
  style?: string;
}

interface SlackBlock {
  type: string;
  text?: SlackTextObject;
  fields?: Array<{ type: string; text: string }>;
  elements?: SlackBlockElement[];
  accessory?: { type: string; url?: string; alt_text?: string };
  image_url?: string;
  alt_text?: string;
}

interface SlackAttachment {
  color?: string;
  fallback?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  footer?: string;
  ts?: number;
}

export class SlackFormatter implements OutputFormatter {
  readonly name = 'slack';
  readonly provider = 'slack' as const;

  format(event: GatewayEvent, target: TargetEndpoint): FormattedRequest {
    const { message } = event;
    const body = this.buildMessage(message);

    return {
      url: this.buildUrl(target),
      method: 'POST',
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.CONTENT_TYPE_JSON },
      body,
    };
  }

  private buildUrl(target: TargetEndpoint): string {
    // Slack token 可能是完整路径 (T.../B.../xxx) 或只是最后一段
    const token = target.token;
    if (token.includes('/')) {
      return `${PROVIDER_BASE_URLS.slack}${token}`;
    }
    return target.fullUrl || `${PROVIDER_BASE_URLS.slack}${token}`;
  }

  private buildMessage(message: IMMessage): Record<string, unknown> {
    const color = LEVEL_COLORS.slack[message.level] as string;
    const blocks: SlackBlock[] = [];

    // Header
    if (message.title) {
      blocks.push({
        type: 'header',
        text: {
          type: 'plain_text',
          text: message.title,
          emoji: true,
        },
      });
    }

    // Body (Section)
    if (message.body) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message.body,
        },
      });
    }

    // Fields
    if (message.fields && message.fields.length > 0) {
      // Slack section 最多支持 10 个 fields
      const fieldChunks = this.chunkArray(message.fields, 10);

      for (const chunk of fieldChunks) {
        blocks.push({
          type: 'section',
          fields: chunk.map((field) => ({
            type: 'mrkdwn',
            text: `*${field.label}*\n${field.value}`,
          })),
        });
      }
    }

    // Image
    const coverImage = message.images?.find((img) => img.type === 'cover');
    if (coverImage) {
      blocks.push({
        type: 'image',
        image_url: coverImage.url,
        alt_text: coverImage.alt || 'Image',
      });
    }

    // Divider before footer
    if (message.footer || message.actions) {
      blocks.push({ type: 'divider' });
    }

    // Actions (Buttons)
    if (message.actions && message.actions.length > 0) {
      blocks.push({
        type: 'actions',
        elements: message.actions.map((action) => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: action.text,
            emoji: true,
          },
          url: action.url,
          style: action.style === 'primary' ? 'primary' : action.style === 'danger' ? 'danger' : undefined,
        })),
      });
    } else if (message.link) {
      // 如果没有 actions 但有 link，添加一个默认按钮
      blocks.push({
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '查看详情',
              emoji: true,
            },
            url: message.link,
            style: 'primary',
          },
        ],
      });
    }

    // Footer (Context)
    if (message.footer) {
      blocks.push({
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: message.footer,
          },
        ],
      });
    }

    // 构建最终消息
    const result: Record<string, unknown> = {};

    if (blocks.length > 0) {
      result.blocks = blocks;
    }

    // 使用 attachments 添加颜色边框
    if (color) {
      const attachment: SlackAttachment = { color };

      // 如果没有 blocks，使用 attachment 显示内容
      if (blocks.length === 0) {
        attachment.fallback = message.title || message.body;
        attachment.title = message.title;
        attachment.title_link = message.link;
        attachment.text = message.body;

        if (message.fields) {
          attachment.fields = message.fields.map((f) => ({
            title: f.label,
            value: f.value,
            short: f.short,
          }));
        }

        if (message.footer) {
          attachment.footer = message.footer;
        }

        if (message.timestamp) {
          attachment.ts = message.timestamp;
        }
      }

      result.attachments = [attachment];
    }

    // Fallback text (用于通知)
    result.text = message.title || message.body || 'New notification';

    return result;
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}
