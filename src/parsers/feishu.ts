/**
 * 飞书消息解析器
 * 支持飞书机器人消息格式
 */

import type { SourceParser, GatewayEvent, IMMessage, MessageField, ActionButton } from '../core/types';
import { createMessage, createGatewayEvent, parseLevel } from '../utils/message';

interface FeishuPayload {
  msg_type?: string;
  content?: FeishuContent;
  card?: FeishuCard;
}

interface FeishuContent {
  text?: string;
  post?: FeishuPost;
  image_key?: string;
}

interface FeishuPost {
  zh_cn?: FeishuPostContent;
  en_us?: FeishuPostContent;
}

interface FeishuPostContent {
  title?: string;
  content?: FeishuPostElement[][];
}

interface FeishuPostElement {
  tag: string;
  text?: string;
  href?: string;
  user_id?: string;
  image_key?: string;
  style?: string[];
}

interface FeishuCard {
  header?: {
    title?: { content?: string; tag?: string };
    template?: string;
  };
  elements?: FeishuCardElement[];
}

interface FeishuCardElement {
  tag: string;
  text?: { content?: string; tag?: string };
  content?: string;
  fields?: Array<{ is_short?: boolean; text?: { content?: string } }>;
  actions?: Array<{ tag: string; text?: { content?: string }; url?: string; type?: string }>;
  elements?: FeishuCardElement[];
  url?: string;
  alt?: { content?: string };
}

export class FeishuParser implements SourceParser {
  readonly name = 'feishu';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    const payload = body as FeishuPayload;
    const message = this.parsePayload(payload);
    return createGatewayEvent(message, this.name, body);
  }

  private parsePayload(payload: FeishuPayload): IMMessage {
    const msgType = payload.msg_type;

    // 卡片消息
    if (msgType === 'interactive' || payload.card) {
      return this.parseCard(payload.card);
    }

    // 富文本消息
    if (msgType === 'post' && payload.content?.post) {
      return this.parsePost(payload.content.post);
    }

    // 文本消息
    if (msgType === 'text' || payload.content?.text) {
      return createMessage({
        body: payload.content?.text || '',
      });
    }

    // 默认：尝试提取任何文本
    return createMessage({
      body: JSON.stringify(payload),
    });
  }

  private parseCard(card?: FeishuCard): IMMessage {
    if (!card) {
      return createMessage({ body: '' });
    }

    let title: string | undefined;
    let level = parseLevel(undefined);
    const bodyParts: string[] = [];
    const fields: MessageField[] = [];
    const actions: ActionButton[] = [];

    // 解析 header
    if (card.header) {
      title = card.header.title?.content;
      if (card.header.template) {
        level = this.templateToLevel(card.header.template);
      }
    }

    // 解析 elements
    if (card.elements) {
      for (const element of card.elements) {
        this.parseCardElement(element, bodyParts, fields, actions);
      }
    }

    return createMessage({
      body: bodyParts.join('\n'),
      title,
      level,
      fields: fields.length > 0 ? fields : undefined,
      actions: actions.length > 0 ? actions : undefined,
    });
  }

  private parseCardElement(
    element: FeishuCardElement,
    bodyParts: string[],
    fields: MessageField[],
    actions: ActionButton[]
  ): void {
    switch (element.tag) {
      case 'div':
        if (element.text?.content) {
          bodyParts.push(element.text.content);
        }
        if (element.fields) {
          for (const field of element.fields) {
            if (field.text?.content) {
              // 尝试解析 "**Label**: Value" 格式
              const content = field.text.content;
              const match = content.match(/^\*\*(.+?)\*\*[:\uff1a]\s*(.+)$/);
              if (match) {
                fields.push({
                  label: match[1],
                  value: match[2],
                  short: field.is_short,
                });
              } else {
                bodyParts.push(content);
              }
            }
          }
        }
        break;

      case 'markdown':
        if (element.content) {
          bodyParts.push(element.content);
        }
        break;

      case 'hr':
        bodyParts.push('---');
        break;

      case 'action':
        if (element.actions) {
          for (const action of element.actions) {
            if (action.url && action.text?.content) {
              actions.push({
                text: action.text.content,
                url: action.url,
                style: action.type === 'primary' ? 'primary' : 'default',
              });
            }
          }
        }
        break;

      case 'img':
        if (element.alt?.content) {
          bodyParts.push(`[Image: ${element.alt.content}]`);
        }
        break;

      case 'note':
        if (element.elements) {
          const noteText = element.elements
            .map((el) => el.content || el.text?.content || '')
            .filter(Boolean)
            .join(' ');
          if (noteText) {
            bodyParts.push(`> ${noteText}`);
          }
        }
        break;
    }
  }

  private parsePost(post: FeishuPost): IMMessage {
    // 优先使用中文，其次英文
    const content = post.zh_cn || post.en_us;
    if (!content) {
      return createMessage({ body: '' });
    }

    const title = content.title;
    const bodyParts: string[] = [];

    if (content.content) {
      for (const line of content.content) {
        const lineText = line
          .map((el) => {
            switch (el.tag) {
              case 'text':
                return el.text || '';
              case 'a':
                return el.href ? `[${el.text || 'link'}](${el.href})` : el.text || '';
              case 'at':
                return `@${el.user_id || 'user'}`;
              case 'img':
                return '[Image]';
              default:
                return el.text || '';
            }
          })
          .join('');
        bodyParts.push(lineText);
      }
    }

    return createMessage({
      body: bodyParts.join('\n'),
      title,
    });
  }

  private templateToLevel(template: string): IMMessage['level'] {
    switch (template) {
      case 'red':
        return 'error';
      case 'orange':
      case 'yellow':
        return 'warning';
      case 'green':
        return 'success';
      default:
        return 'info';
    }
  }
}
