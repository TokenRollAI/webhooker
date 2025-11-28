/**
 * 飞书格式化器
 * 将 IMMessage 转换为飞书机器人消息格式
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { PROVIDER_BASE_URLS, LEVEL_COLORS, HEADERS } from '../core/constants';

export class FeishuFormatter implements OutputFormatter {
  readonly name = 'feishu';
  readonly provider = 'feishu' as const;

  format(event: GatewayEvent, target: TargetEndpoint): FormattedRequest {
    const { message } = event;
    const body = this.buildCardMessage(message);

    return {
      url: this.buildUrl(target),
      method: 'POST',
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.CONTENT_TYPE_JSON },
      body,
    };
  }

  private buildUrl(target: TargetEndpoint): string {
    return `${PROVIDER_BASE_URLS.feishu}${target.token}`;
  }

  private buildCardMessage(message: IMMessage): Record<string, unknown> {
    const color = LEVEL_COLORS.feishu[message.level] as string;

    // 构建卡片元素
    const elements: unknown[] = [];

    // 正文
    if (message.body) {
      elements.push({
        tag: 'markdown',
        content: message.body,
      });
    }

    // 字段列表
    if (message.fields && message.fields.length > 0) {
      const fieldElements = message.fields.map((field) => ({
        is_short: field.short ?? true,
        text: {
          tag: 'lark_md',
          content: `**${field.label}**\n${field.value}`,
        },
      }));

      elements.push({
        tag: 'div',
        fields: fieldElements,
      });
    }

    // 分隔线 + 页脚
    if (message.footer || message.timestamp) {
      elements.push({ tag: 'hr' });

      const noteElements: unknown[] = [];
      if (message.footer) {
        noteElements.push({
          tag: 'plain_text',
          content: message.footer,
        });
      }
      if (message.timestamp) {
        const date = new Date(message.timestamp * 1000);
        noteElements.push({
          tag: 'plain_text',
          content: date.toLocaleString('zh-CN'),
        });
      }

      if (noteElements.length > 0) {
        elements.push({
          tag: 'note',
          elements: noteElements,
        });
      }
    }

    // 操作按钮
    if (message.actions && message.actions.length > 0) {
      elements.push({
        tag: 'action',
        actions: message.actions.map((action) => ({
          tag: 'button',
          text: {
            tag: 'plain_text',
            content: action.text,
          },
          url: action.url,
          type: action.style === 'primary' ? 'primary' : 'default',
        })),
      });
    }

    // 主链接按钮
    if (message.link && !message.actions?.some((a) => a.url === message.link)) {
      elements.push({
        tag: 'action',
        actions: [
          {
            tag: 'button',
            text: { tag: 'plain_text', content: '查看详情' },
            url: message.link,
            type: 'primary',
          },
        ],
      });
    }

    return {
      msg_type: 'interactive',
      card: {
        header: message.title
          ? {
              title: {
                tag: 'plain_text',
                content: message.title,
              },
              template: color,
            }
          : undefined,
        elements,
      },
    };
  }
}
