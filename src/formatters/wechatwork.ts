/**
 * 企业微信格式化器
 * 将 IMMessage 转换为企业微信机器人消息格式
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { PROVIDER_BASE_URLS, HEADERS } from '../core/constants';

export class WechatWorkFormatter implements OutputFormatter {
  readonly name = 'wechatwork';
  readonly provider = 'wechatwork' as const;

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
    return `${PROVIDER_BASE_URLS.wechatwork}${target.token}`;
  }

  private buildMessage(message: IMMessage): Record<string, unknown> {
    // 如果有链接或图片，使用图文消息
    if (message.link && message.images?.some((img) => img.type === 'cover')) {
      return this.buildNewsMessage(message);
    }

    // 默认使用 Markdown
    return this.buildMarkdown(message);
  }

  private buildMarkdown(message: IMMessage): Record<string, unknown> {
    const parts: string[] = [];

    // 标题 (使用绿色高亮)
    if (message.title) {
      parts.push(`### ${message.title}`);
    }

    // 正文
    if (message.body) {
      parts.push(message.body);
    }

    // 字段
    if (message.fields && message.fields.length > 0) {
      parts.push('');
      for (const field of message.fields) {
        parts.push(`> **${field.label}**: <font color="comment">${field.value}</font>`);
      }
    }

    // 链接
    if (message.link) {
      parts.push('');
      parts.push(`[查看详情](${message.link})`);
    }

    // 页脚
    if (message.footer) {
      parts.push('');
      parts.push(`<font color="comment">${message.footer}</font>`);
    }

    const result: Record<string, unknown> = {
      msgtype: 'markdown',
      markdown: {
        content: parts.join('\n'),
      },
    };

    // @提及
    if (message.mentions && message.mentions.length > 0) {
      const mentioned_list: string[] = [];
      const mentioned_mobile_list: string[] = [];

      for (const mention of message.mentions) {
        if (mention.type === 'all') {
          mentioned_list.push('@all');
        } else if (mention.userId) {
          mentioned_list.push(mention.userId);
        } else if (mention.name) {
          mentioned_mobile_list.push(mention.name);
        }
      }

      // 在内容末尾添加 @
      if (mentioned_list.length > 0 || mentioned_mobile_list.length > 0) {
        const mentions: string[] = [];
        for (const m of mentioned_list) {
          mentions.push(`<@${m}>`);
        }
        result.markdown = {
          content: parts.join('\n') + '\n' + mentions.join(' '),
          mentioned_list,
          mentioned_mobile_list,
        };
      }
    }

    return result;
  }

  private buildNewsMessage(message: IMMessage): Record<string, unknown> {
    const coverImage = message.images?.find((img) => img.type === 'cover');

    return {
      msgtype: 'news',
      news: {
        articles: [
          {
            title: message.title || '通知',
            description: message.body,
            url: message.link,
            picurl: coverImage?.url,
          },
        ],
      },
    };
  }
}
