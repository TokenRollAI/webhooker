/**
 * 钉钉消息解析器
 * 支持钉钉机器人消息格式
 */

import type { SourceParser, GatewayEvent, IMMessage, MessageField, ActionButton } from '../core/types';
import { createMessage, createGatewayEvent } from '../utils/message';

interface DingtalkPayload {
  msgtype?: string;
  text?: { content?: string };
  markdown?: { title?: string; text?: string };
  link?: { title?: string; text?: string; picUrl?: string; messageUrl?: string };
  actionCard?: {
    title?: string;
    text?: string;
    singleTitle?: string;
    singleURL?: string;
    btnOrientation?: string;
    btns?: Array<{ title?: string; actionURL?: string }>;
  };
  feedCard?: {
    links?: Array<{ title?: string; messageURL?: string; picURL?: string }>;
  };
  at?: {
    atMobiles?: string[];
    atUserIds?: string[];
    isAtAll?: boolean;
  };
}

export class DingtalkParser implements SourceParser {
  readonly name = 'dingtalk';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    const payload = body as DingtalkPayload;
    const message = this.parsePayload(payload);
    return createGatewayEvent(message, this.name, body);
  }

  private parsePayload(payload: DingtalkPayload): IMMessage {
    const msgType = payload.msgtype;

    switch (msgType) {
      case 'text':
        return this.parseText(payload);
      case 'markdown':
        return this.parseMarkdown(payload);
      case 'link':
        return this.parseLink(payload);
      case 'actionCard':
        return this.parseActionCard(payload);
      case 'feedCard':
        return this.parseFeedCard(payload);
      default:
        // 尝试自动检测
        if (payload.text?.content) {
          return this.parseText(payload);
        }
        if (payload.markdown?.text) {
          return this.parseMarkdown(payload);
        }
        return createMessage({ body: JSON.stringify(payload) });
    }
  }

  private parseText(payload: DingtalkPayload): IMMessage {
    const mentions = this.parseMentions(payload.at);
    return createMessage({
      body: payload.text?.content || '',
      mentions,
    });
  }

  private parseMarkdown(payload: DingtalkPayload): IMMessage {
    const mentions = this.parseMentions(payload.at);
    return createMessage({
      body: payload.markdown?.text || '',
      title: payload.markdown?.title,
      mentions,
    });
  }

  private parseLink(payload: DingtalkPayload): IMMessage {
    return createMessage({
      body: payload.link?.text || '',
      title: payload.link?.title,
      link: payload.link?.messageUrl,
      images: payload.link?.picUrl
        ? [{ url: payload.link.picUrl, type: 'cover' as const }]
        : undefined,
    });
  }

  private parseActionCard(payload: DingtalkPayload): IMMessage {
    const actionCard = payload.actionCard;
    if (!actionCard) {
      return createMessage({ body: '' });
    }

    const actions: ActionButton[] = [];

    // 单按钮
    if (actionCard.singleTitle && actionCard.singleURL) {
      actions.push({
        text: actionCard.singleTitle,
        url: actionCard.singleURL,
        style: 'primary',
      });
    }

    // 多按钮
    if (actionCard.btns) {
      for (const btn of actionCard.btns) {
        if (btn.title && btn.actionURL) {
          actions.push({
            text: btn.title,
            url: btn.actionURL,
          });
        }
      }
    }

    return createMessage({
      body: actionCard.text || '',
      title: actionCard.title,
      actions: actions.length > 0 ? actions : undefined,
    });
  }

  private parseFeedCard(payload: DingtalkPayload): IMMessage {
    const feedCard = payload.feedCard;
    if (!feedCard?.links) {
      return createMessage({ body: '' });
    }

    const fields: MessageField[] = feedCard.links.map((link) => ({
      label: link.title || 'Link',
      value: link.messageURL || '',
    }));

    return createMessage({
      body: feedCard.links.map((l) => `- [${l.title}](${l.messageURL})`).join('\n'),
      fields,
    });
  }

  private parseMentions(at?: DingtalkPayload['at']): IMMessage['mentions'] {
    if (!at) return undefined;

    const mentions: IMMessage['mentions'] = [];

    if (at.isAtAll) {
      mentions.push({ type: 'all' });
    }

    if (at.atUserIds) {
      for (const userId of at.atUserIds) {
        mentions.push({ type: 'user', userId });
      }
    }

    if (at.atMobiles) {
      for (const mobile of at.atMobiles) {
        mentions.push({ type: 'user', name: mobile });
      }
    }

    return mentions.length > 0 ? mentions : undefined;
  }
}
