/**
 * Text 消息解析器
 * 处理纯文本消息
 */

import type { SourceParser, GatewayEvent } from '../core/types';
import { fromText } from '../utils/message';

interface TextPayload {
  message?: string;
  text?: string;
  content?: string;
  body?: string;
}

export class TextParser implements SourceParser {
  readonly name = 'text';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    let text: string;

    if (typeof body === 'string') {
      text = body;
    } else if (body && typeof body === 'object') {
      const payload = body as TextPayload;
      text = payload.message || payload.text || payload.content || payload.body || '';
    } else {
      text = String(body ?? '');
    }

    return fromText(text.trim(), this.name);
  }
}
