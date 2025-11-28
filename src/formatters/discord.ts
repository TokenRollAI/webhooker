/**
 * Discord 格式化器
 * 将 IMMessage 转换为 Discord Webhook 消息格式 (Embeds)
 */

import type { GatewayEvent, TargetEndpoint, FormattedRequest, IMMessage, OutputFormatter } from '../core/types';
import { PROVIDER_BASE_URLS, LEVEL_COLORS, HEADERS } from '../core/constants';

interface DiscordEmbed {
  title?: string;
  description?: string;
  url?: string;
  color?: number;
  fields?: Array<{ name: string; value: string; inline?: boolean }>;
  footer?: { text: string; icon_url?: string };
  timestamp?: string;
  image?: { url: string };
  thumbnail?: { url: string };
}

export class DiscordFormatter implements OutputFormatter {
  readonly name = 'discord';
  readonly provider = 'discord' as const;

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
    return `${PROVIDER_BASE_URLS.discord}${target.token}`;
  }

  private buildMessage(message: IMMessage): Record<string, unknown> {
    const embed: DiscordEmbed = {};
    const color = LEVEL_COLORS.discord[message.level] as number;

    // 标题
    if (message.title) {
      embed.title = message.title;
    }

    // 正文
    if (message.body) {
      embed.description = this.convertMarkdown(message.body);
    }

    // 链接
    if (message.link) {
      embed.url = message.link;
    }

    // 颜色
    embed.color = color;

    // 字段
    if (message.fields && message.fields.length > 0) {
      embed.fields = message.fields.map((field) => ({
        name: field.label,
        value: field.value,
        inline: field.short ?? true,
      }));
    }

    // 图片
    if (message.images && message.images.length > 0) {
      const cover = message.images.find((img) => img.type === 'cover');
      const thumbnail = message.images.find((img) => img.type === 'thumbnail');

      if (cover) {
        embed.image = { url: cover.url };
      }
      if (thumbnail) {
        embed.thumbnail = { url: thumbnail.url };
      }
    }

    // 页脚
    if (message.footer) {
      embed.footer = { text: message.footer };
    }

    // 时间戳
    if (message.timestamp) {
      embed.timestamp = new Date(message.timestamp * 1000).toISOString();
    }

    const result: Record<string, unknown> = {
      embeds: [embed],
    };

    // @提及 - 在 content 中处理
    if (message.mentions && message.mentions.length > 0) {
      const mentionParts: string[] = [];

      for (const mention of message.mentions) {
        if (mention.type === 'all') {
          mentionParts.push('@everyone');
        } else if (mention.userId) {
          // Discord 用户 ID 格式: <@USER_ID>
          mentionParts.push(`<@${mention.userId}>`);
        }
      }

      if (mentionParts.length > 0) {
        result.content = mentionParts.join(' ');
      }
    }

    return result;
  }

  /**
   * 转换 Markdown 格式
   * Slack/飞书的 Markdown 和 Discord 略有不同
   */
  private convertMarkdown(text: string): string {
    return text
      // 钉钉/飞书的 > 引用在 Discord 中需要保持
      .replace(/^>\s*/gm, '> ')
      // 限制长度 (Discord embed description 最大 4096 字符)
      .slice(0, 4000);
  }
}
