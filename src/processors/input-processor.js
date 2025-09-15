// Provider-based input adapters (facade for backward compatibility)
import { SlackInputProvider } from '../providers/slack/input.js';
import { RawJsonInputProvider } from '../providers/raw/input.js';
import { TextInputProvider } from '../providers/text/input.js';

/**
 * 输入处理器 - 负责解析不同格式的输入消息
 */

/**
 * 基础输入处理器接口
 */
export class BaseInputProcessor {
  /**
   * 验证输入数据
   * @param {Object} payload - 输入数据
   * @returns {Object} 验证结果 { valid: boolean, error?: string }
   */
  validate(payload) {
    throw new Error('validate method must be implemented');
  }

  /**
   * 处理输入数据，转换为标准格式
   * @param {Object} payload - 输入数据
   * @returns {Object} 标准化的消息对象
   */
  process(payload) {
    throw new Error('process method must be implemented');
  }
}

/**
 * Slack 输入处理器
 */
export class SlackInputProcessor extends BaseInputProcessor {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }

    if (!payload.text || typeof payload.text !== 'string' || !payload.text.trim()) {
      return { valid: false, error: 'Message text is empty or missing' };
    }

    return { valid: true };
  }

  process(payload) {
    // MVP版本只处理 text 字段
    return {
      type: 'text',
      content: payload.text.trim(),
      originalFormat: 'slack',
      metadata: {
        hasBlocks: !!payload.blocks,
        hasAttachments: !!payload.attachments,
        channel: payload.channel,
        user: payload.user,
        timestamp: payload.ts
      }
    };
  }
}

/**
 * 原始 JSON 输入处理器
 */
export class RawJsonInputProcessor extends BaseInputProcessor {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }

    // 对于原始 JSON，我们只要求有内容即可
    if (Object.keys(payload).length === 0) {
      return { valid: false, error: 'Empty payload' };
    }

    return { valid: true };
  }

  process(payload) {
    return {
      type: 'raw',
      content: payload,
      originalFormat: 'raw',
      metadata: {
        keys: Object.keys(payload),
        size: JSON.stringify(payload).length
      }
    };
  }
}

/**
 * 通用文本输入处理器
 */
export class TextInputProcessor extends BaseInputProcessor {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }

    if (!payload.message || typeof payload.message !== 'string' || !payload.message.trim()) {
      return { valid: false, error: 'Message is empty or missing' };
    }

    return { valid: true };
  }

  process(payload) {
    return {
      type: 'text',
      content: payload.message.trim(),
      originalFormat: 'text',
      metadata: {
        title: payload.title,
        level: payload.level || 'info',
        source: payload.source
      }
    };
  }
}

/**
 * 输入处理器工厂
 */
export class InputProcessorFactory {
  static processors = {
    slack: SlackInputProvider,
    raw: RawJsonInputProvider,
    text: TextInputProvider,
  };

  static create(type) {
    const Cls = this.processors[type];
    if (!Cls) throw new Error(`Unknown input processor type: ${type}`);
    return new Cls();
  }

  static getSupportedTypes() {
    return Object.keys(this.processors);
  }
}
