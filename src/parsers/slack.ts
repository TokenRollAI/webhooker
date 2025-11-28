/**
 * Slack 消息解析器
 * 支持 Slack Block Kit 格式
 */

import type { SourceParser, GatewayEvent, IMMessage, MessageField } from '../core/types';
import { createMessage, createGatewayEvent, parseLevel } from '../utils/message';

interface SlackBlock {
  type: string;
  text?: SlackTextObject | string;
  fields?: SlackTextObject[];
  elements?: SlackElement[];
  accessory?: SlackElement;
  image_url?: string;
  alt_text?: string;
  block_id?: string;
}

interface SlackTextObject {
  type: 'plain_text' | 'mrkdwn';
  text: string;
  emoji?: boolean;
  verbatim?: boolean;
}

interface SlackElement {
  type: string;
  text?: SlackTextObject | string;
  url?: string;
  image_url?: string;
  alt_text?: string;
  action_id?: string;
  style?: string;
}

interface SlackAttachment {
  fallback?: string;
  color?: string;
  pretext?: string;
  author_name?: string;
  author_link?: string;
  author_icon?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: Array<{ title: string; value: string; short?: boolean }>;
  image_url?: string;
  thumb_url?: string;
  footer?: string;
  footer_icon?: string;
  ts?: number;
}

interface SlackPayload {
  text?: string;
  blocks?: SlackBlock[];
  attachments?: SlackAttachment[];
  username?: string;
  icon_emoji?: string;
  icon_url?: string;
  channel?: string;
  thread_ts?: string;
}

export class SlackParser implements SourceParser {
  readonly name = 'slack';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    const payload = body as SlackPayload;
    const message = this.parsePayload(payload);
    return createGatewayEvent(message, this.name, body);
  }

  private parsePayload(payload: SlackPayload): IMMessage {
    let body = '';
    let title: string | undefined;
    const fields: MessageField[] = [];
    let level = parseLevel(undefined);
    let link: string | undefined;
    let footer: string | undefined;
    let timestamp: number | undefined;

    // 1. 解析 blocks
    if (payload.blocks && payload.blocks.length > 0) {
      const blockContent = this.parseBlocks(payload.blocks);
      body = blockContent.text;
      if (blockContent.fields.length > 0) {
        fields.push(...blockContent.fields);
      }
    }

    // 2. 解析 attachments
    if (payload.attachments && payload.attachments.length > 0) {
      const attachmentContent = this.parseAttachments(payload.attachments);
      if (!body) {
        body = attachmentContent.text;
      } else if (attachmentContent.text) {
        body += '\n\n' + attachmentContent.text;
      }
      if (!title && attachmentContent.title) {
        title = attachmentContent.title;
      }
      if (attachmentContent.link) {
        link = attachmentContent.link;
      }
      if (attachmentContent.fields.length > 0) {
        fields.push(...attachmentContent.fields);
      }
      if (attachmentContent.color) {
        level = this.colorToLevel(attachmentContent.color);
      }
      if (attachmentContent.footer) {
        footer = attachmentContent.footer;
      }
      if (attachmentContent.timestamp) {
        timestamp = attachmentContent.timestamp;
      }
    }

    // 3. 使用纯文本作为兜底
    if (!body && payload.text) {
      body = payload.text;
    }

    return createMessage({
      body: body || '',
      title,
      level,
      link,
      fields: fields.length > 0 ? fields : undefined,
      footer,
      timestamp,
    });
  }

  private parseBlocks(blocks: SlackBlock[]): { text: string; fields: MessageField[] } {
    const textParts: string[] = [];
    const fields: MessageField[] = [];

    for (const block of blocks) {
      switch (block.type) {
        case 'section':
          if (block.text) {
            textParts.push(this.extractText(block.text));
          }
          if (block.fields) {
            for (const field of block.fields) {
              const text = this.extractText(field);
              // 尝试解析 "Label: Value" 格式
              const colonIndex = text.indexOf(':');
              if (colonIndex > 0) {
                fields.push({
                  label: text.slice(0, colonIndex).trim(),
                  value: text.slice(colonIndex + 1).trim(),
                  short: true,
                });
              } else {
                textParts.push(text);
              }
            }
          }
          break;

        case 'context':
          if (block.elements) {
            const contextText = block.elements
              .map((el) => {
                if (el.type === 'image') {
                  return `[${el.alt_text || 'image'}]`;
                }
                return this.extractText(el.text);
              })
              .join(' ');
            if (contextText) {
              textParts.push(contextText);
            }
          }
          break;

        case 'header':
          if (block.text) {
            textParts.push(`**${this.extractText(block.text)}**`);
          }
          break;

        case 'divider':
          textParts.push('---');
          break;

        case 'image':
          if (block.alt_text) {
            textParts.push(`[Image: ${block.alt_text}]`);
          }
          break;
      }
    }

    return {
      text: textParts.join('\n'),
      fields,
    };
  }

  private parseAttachments(attachments: SlackAttachment[]): {
    text: string;
    title?: string;
    link?: string;
    fields: MessageField[];
    color?: string;
    footer?: string;
    timestamp?: number;
  } {
    const textParts: string[] = [];
    const fields: MessageField[] = [];
    let title: string | undefined;
    let link: string | undefined;
    let color: string | undefined;
    let footer: string | undefined;
    let timestamp: number | undefined;

    for (const attachment of attachments) {
      if (attachment.title) {
        title = title || attachment.title;
      }
      if (attachment.title_link) {
        link = link || attachment.title_link;
      }
      if (attachment.pretext) {
        textParts.push(attachment.pretext);
      }
      if (attachment.text) {
        textParts.push(attachment.text);
      }
      if (attachment.fallback && !attachment.text) {
        textParts.push(attachment.fallback);
      }
      if (attachment.color) {
        color = attachment.color;
      }
      if (attachment.footer) {
        footer = attachment.footer;
      }
      if (attachment.ts) {
        timestamp = attachment.ts;
      }
      if (attachment.fields) {
        for (const field of attachment.fields) {
          fields.push({
            label: field.title,
            value: field.value,
            short: field.short,
          });
        }
      }
    }

    return {
      text: textParts.join('\n'),
      title,
      link,
      fields,
      color,
      footer,
      timestamp,
    };
  }

  private extractText(textObj: SlackTextObject | string | undefined): string {
    if (!textObj) return '';
    if (typeof textObj === 'string') return textObj;
    return textObj.text || '';
  }

  private colorToLevel(color: string): IMMessage['level'] {
    const lowerColor = color.toLowerCase();
    if (lowerColor === 'danger' || lowerColor === '#a30200' || lowerColor === 'red') {
      return 'error';
    }
    if (lowerColor === 'warning' || lowerColor === '#daa038' || lowerColor === 'yellow') {
      return 'warning';
    }
    if (lowerColor === 'good' || lowerColor === '#2eb886' || lowerColor === 'green') {
      return 'success';
    }
    return 'info';
  }
}
