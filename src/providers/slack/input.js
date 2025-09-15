/** Slack Input Provider */
import { fromSlackPayload } from './parse.js';

export class SlackInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload format' };
    const hasText = typeof payload.text === 'string' && payload.text.trim().length > 0;
    const hasBlocks = Array.isArray(payload.blocks) && payload.blocks.length > 0;
    const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;
    if (!(hasText || hasBlocks || hasAttachments)) {
      // 为兼容现有测试用例，错误信息需包含 'empty'
      return { valid: false, error: 'Message text is empty or missing' };
    }
    return { valid: true };
  }
  process(payload) {
    return fromSlackPayload(payload);
  }
}

