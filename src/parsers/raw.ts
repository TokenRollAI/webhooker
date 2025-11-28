/**
 * Raw 消息解析器
 * 将任意 JSON 序列化为字符串，作为文本消息发送
 * 这是无法解析输入格式时的兜底方案
 */

import type { SourceParser, GatewayEvent } from '../core/types';
import { createMessage, createGatewayEvent } from '../utils/message';

export class RawParser implements SourceParser {
  readonly name = 'raw';

  parse(body: unknown, _headers?: Headers): GatewayEvent {
    // 将任意输入序列化为 JSON 字符串
    let text: string;

    if (typeof body === 'string') {
      text = body;
    } else {
      try {
        text = JSON.stringify(body, null, 2);
      } catch {
        text = String(body);
      }
    }

    const message = createMessage({
      body: text,
      level: 'info',
    });

    return createGatewayEvent(message, this.name);
  }
}
