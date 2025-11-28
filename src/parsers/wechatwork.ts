/**
 * 企业微信消息解析器
 * 支持企业微信机器人消息格式
 */

import type { SourceParser, GatewayEvent, IMMessage, Mention } from '../core/types';
import { createMessage, createGatewayEvent } from '../utils/message';

interface WechatWorkPayload {
  msgtype?: string;
  text?: {
    content?: string;
    mentioned_list?: string[];
    mentioned_mobile_list?: string[];
  };
  markdown?: {
    content?: string;
  };
  image?: {
    base64?: string;
    md5?: string;
  };
  news?: {
    articles?: Array<{
      title?: string;
      description?: string;
      url?: string;
      picurl?: string;
    }>;
  };
  file?: {
    media_id?: string;
  };
  template_card?: WechatWorkTemplateCard;
}

interface WechatWorkTemplateCard {
  card_type?: string;
  source?: { icon_url?: string; desc?: string; desc_color?: number };
  main_title?: { title?: string; desc?: string };
  emphasis_content?: { title?: string; desc?: string };
  quote_area?: { type?: number; url?: string; title?: string; quote_text?: string };
  sub_title_text?: string;
  horizontal_content_list?: Array<{
    keyname?: string;
    value?: string;
    type?: number;
    url?: string;
  }>;
  jump_list?: Array<{ type?: number; title?: string; url?: string }>;
  card_action?: { type?: number; url?: string };
}

export class WechatWorkParser implements SourceParser {
  readonly name = 'wechatwork';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    const payload = body as WechatWorkPayload;
    const message = this.parsePayload(payload);
    return createGatewayEvent(message, this.name, body);
  }

  private parsePayload(payload: WechatWorkPayload): IMMessage {
    const msgType = payload.msgtype;

    switch (msgType) {
      case 'text':
        return this.parseText(payload);
      case 'markdown':
        return this.parseMarkdown(payload);
      case 'news':
        return this.parseNews(payload);
      case 'template_card':
        return this.parseTemplateCard(payload);
      default:
        // 尝试自动检测
        if (payload.text?.content) {
          return this.parseText(payload);
        }
        if (payload.markdown?.content) {
          return this.parseMarkdown(payload);
        }
        return createMessage({ body: JSON.stringify(payload) });
    }
  }

  private parseText(payload: WechatWorkPayload): IMMessage {
    const text = payload.text;
    const mentions = this.parseMentions(text?.mentioned_list, text?.mentioned_mobile_list);

    return createMessage({
      body: text?.content || '',
      mentions,
    });
  }

  private parseMarkdown(payload: WechatWorkPayload): IMMessage {
    return createMessage({
      body: payload.markdown?.content || '',
    });
  }

  private parseNews(payload: WechatWorkPayload): IMMessage {
    const articles = payload.news?.articles || [];
    if (articles.length === 0) {
      return createMessage({ body: '' });
    }

    // 使用第一篇文章作为主内容
    const mainArticle = articles[0];
    const body = articles.length > 1
      ? articles.map((a) => `- [${a.title}](${a.url})`).join('\n')
      : mainArticle.description || '';

    return createMessage({
      body,
      title: mainArticle.title,
      link: mainArticle.url,
      images: mainArticle.picurl
        ? [{ url: mainArticle.picurl, type: 'cover' as const }]
        : undefined,
    });
  }

  private parseTemplateCard(payload: WechatWorkPayload): IMMessage {
    const card = payload.template_card;
    if (!card) {
      return createMessage({ body: '' });
    }

    const bodyParts: string[] = [];
    let title = card.main_title?.title;

    // 主标题描述
    if (card.main_title?.desc) {
      bodyParts.push(card.main_title.desc);
    }

    // 引用区域
    if (card.quote_area?.quote_text) {
      bodyParts.push(`> ${card.quote_area.quote_text}`);
    }

    // 副标题
    if (card.sub_title_text) {
      bodyParts.push(card.sub_title_text);
    }

    // 水平内容列表
    if (card.horizontal_content_list) {
      for (const item of card.horizontal_content_list) {
        if (item.keyname && item.value) {
          bodyParts.push(`**${item.keyname}**: ${item.value}`);
        }
      }
    }

    // 强调内容
    if (card.emphasis_content?.title) {
      if (!title) {
        title = card.emphasis_content.title;
      } else {
        bodyParts.unshift(`**${card.emphasis_content.title}**`);
      }
    }

    return createMessage({
      body: bodyParts.join('\n'),
      title,
      link: card.card_action?.url,
      actions: card.jump_list?.filter((j) => j.url && j.title).map((j) => ({
        text: j.title!,
        url: j.url!,
      })),
    });
  }

  private parseMentions(
    mentionedList?: string[],
    mentionedMobileList?: string[]
  ): Mention[] | undefined {
    const mentions: Mention[] = [];

    if (mentionedList) {
      for (const userId of mentionedList) {
        if (userId === '@all') {
          mentions.push({ type: 'all' });
        } else {
          mentions.push({ type: 'user', userId });
        }
      }
    }

    if (mentionedMobileList) {
      for (const mobile of mentionedMobileList) {
        mentions.push({ type: 'user', name: mobile });
      }
    }

    return mentions.length > 0 ? mentions : undefined;
  }
}
