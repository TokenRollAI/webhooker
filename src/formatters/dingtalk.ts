/**
 * 钉钉格式化器
 * 将 IMMessage 转换为钉钉机器人消息格式
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { PROVIDER_BASE_URLS, HEADERS } from '../core/constants';
import { signDingtalk } from '../utils/sign';

export class DingtalkFormatter implements OutputFormatter {
  readonly name = 'dingtalk';
  readonly provider = 'dingtalk' as const;

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
    let url = `${PROVIDER_BASE_URLS.dingtalk}${target.token}`;

    // 如果有 secret，需要异步签名
    // 注意：这里简化处理，实际使用时需要异步
    // 建议在调用前预处理签名
    return url;
  }

  /**
   * 异步构建带签名的 URL
   */
  async buildSignedUrl(target: TargetEndpoint): Promise<string> {
    let url = `${PROVIDER_BASE_URLS.dingtalk}${target.token}`;

    if (target.secret) {
      const { timestamp, sign } = await signDingtalk(target.secret);
      url += `&timestamp=${timestamp}&sign=${sign}`;
    }

    return url;
  }

  private buildMessage(message: IMMessage): Record<string, unknown> {
    // 优先使用 ActionCard (如果有标题或按钮)
    if (message.title || (message.actions && message.actions.length > 0)) {
      return this.buildActionCard(message);
    }

    // 其次使用 Markdown
    return this.buildMarkdown(message);
  }

  private buildMarkdown(message: IMMessage): Record<string, unknown> {
    const parts: string[] = [];

    // 标题
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
        parts.push(`> **${field.label}**: ${field.value}`);
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
      parts.push(`---`);
      parts.push(`*${message.footer}*`);
    }

    const result: Record<string, unknown> = {
      msgtype: 'markdown',
      markdown: {
        title: message.title || '通知',
        text: parts.join('\n'),
      },
    };

    // @提及
    if (message.mentions && message.mentions.length > 0) {
      const atMobiles: string[] = [];
      const atUserIds: string[] = [];
      let isAtAll = false;

      for (const mention of message.mentions) {
        if (mention.type === 'all') {
          isAtAll = true;
        } else if (mention.userId) {
          atUserIds.push(mention.userId);
        } else if (mention.name) {
          atMobiles.push(mention.name);
        }
      }

      result.at = {
        atMobiles,
        atUserIds,
        isAtAll,
      };
    }

    return result;
  }

  private buildActionCard(message: IMMessage): Record<string, unknown> {
    const parts: string[] = [];

    // 正文
    if (message.body) {
      parts.push(message.body);
    }

    // 字段
    if (message.fields && message.fields.length > 0) {
      parts.push('');
      for (const field of message.fields) {
        parts.push(`> **${field.label}**: ${field.value}`);
      }
    }

    const actionCard: Record<string, unknown> = {
      title: message.title || '通知',
      text: parts.join('\n'),
    };

    // 按钮
    if (message.actions && message.actions.length > 0) {
      if (message.actions.length === 1) {
        // 单按钮
        actionCard.singleTitle = message.actions[0].text;
        actionCard.singleURL = message.actions[0].url;
      } else {
        // 多按钮
        actionCard.btnOrientation = '0'; // 按钮竖直排列
        actionCard.btns = message.actions.map((action) => ({
          title: action.text,
          actionURL: action.url,
        }));
      }
    } else if (message.link) {
      // 没有按钮但有链接时，创建一个默认按钮
      actionCard.singleTitle = '查看详情';
      actionCard.singleURL = message.link;
    }

    return {
      msgtype: 'actionCard',
      actionCard,
    };
  }
}
