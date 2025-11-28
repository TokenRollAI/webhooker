/**
 * Telegram 格式化器
 * 将 IMMessage 转换为 Telegram Bot API 消息格式
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { PROVIDER_BASE_URLS, TELEGRAM_METHOD, LEVEL_COLORS, HEADERS } from '../core/constants';

interface TelegramInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export class TelegramFormatter implements OutputFormatter {
  readonly name = 'telegram';
  readonly provider = 'telegram' as const;

  format(event: GatewayEvent, target: TargetEndpoint): FormattedRequest {
    const { message } = event;
    const body = this.buildMessage(message, target);

    return {
      url: this.buildUrl(target),
      method: 'POST',
      headers: { [HEADERS.CONTENT_TYPE]: HEADERS.CONTENT_TYPE_JSON },
      body,
    };
  }

  private buildUrl(target: TargetEndpoint): string {
    // Telegram token 格式: BOT_TOKEN:CHAT_ID
    // 或者只是 BOT_TOKEN，chat_id 在 body 中指定
    const [botToken] = target.token.split(':');
    return `${PROVIDER_BASE_URLS.telegram}${botToken}${TELEGRAM_METHOD}`;
  }

  private buildMessage(message: IMMessage, target: TargetEndpoint): Record<string, unknown> {
    // 解析 chat_id
    const tokenParts = target.token.split(':');
    const chatId = tokenParts.length > 1 ? tokenParts.slice(1).join(':') : undefined;

    const parts: string[] = [];
    const levelEmoji = LEVEL_COLORS.telegram[message.level] as string;

    // 标题 (加粗 + emoji)
    if (message.title) {
      const prefix = levelEmoji ? `${levelEmoji} ` : '';
      parts.push(`${prefix}<b>${this.escapeHtml(message.title)}</b>`);
      parts.push('');
    } else if (levelEmoji) {
      parts.push(levelEmoji);
    }

    // 正文
    if (message.body) {
      parts.push(this.convertToHtml(message.body));
    }

    // 字段
    if (message.fields && message.fields.length > 0) {
      parts.push('');
      for (const field of message.fields) {
        parts.push(`<b>${this.escapeHtml(field.label)}:</b> ${this.escapeHtml(field.value)}`);
      }
    }

    // 链接
    if (message.link) {
      parts.push('');
      parts.push(`<a href="${message.link}">查看详情</a>`);
    }

    // 页脚
    if (message.footer) {
      parts.push('');
      parts.push(`<i>${this.escapeHtml(message.footer)}</i>`);
    }

    const result: Record<string, unknown> = {
      text: parts.join('\n'),
      parse_mode: 'HTML',
      disable_web_page_preview: !message.link,
    };

    // chat_id
    if (chatId) {
      result.chat_id = chatId;
    }

    // 按钮 (Inline Keyboard)
    if (message.actions && message.actions.length > 0) {
      const buttons: TelegramInlineKeyboardButton[][] = [];
      const row: TelegramInlineKeyboardButton[] = [];

      for (const action of message.actions) {
        row.push({
          text: action.text,
          url: action.url,
        });

        // 每行最多 2 个按钮
        if (row.length >= 2) {
          buttons.push([...row]);
          row.length = 0;
        }
      }

      if (row.length > 0) {
        buttons.push(row);
      }

      result.reply_markup = {
        inline_keyboard: buttons,
      };
    }

    return result;
  }

  /**
   * 转义 HTML 特殊字符
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * 将 Markdown 转换为 Telegram HTML
   */
  private convertToHtml(text: string): string {
    return text
      // 加粗
      .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
      .replace(/__(.+?)__/g, '<b>$1</b>')
      // 斜体
      .replace(/\*(.+?)\*/g, '<i>$1</i>')
      .replace(/_(.+?)_/g, '<i>$1</i>')
      // 删除线
      .replace(/~~(.+?)~~/g, '<s>$1</s>')
      // 代码
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
      // 转义其他 HTML
      .replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;')
      .replace(/<(?!\/?(?:b|i|s|code|a|pre)[\s>])/g, '&lt;');
  }
}
