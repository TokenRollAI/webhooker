// Provider-based output adapters (facade for backward compatibility)
import { FeishuOutputProvider } from '../providers/feishu/output.js';
import { DingTalkOutputProvider } from '../providers/dingtalk/output.js';
import { WeChatWorkOutputProvider } from '../providers/wechatwork/output.js';
import { GenericHttpOutputProvider } from '../providers/generic/output.js';

/**
 * 输出处理器 - 负责将标准化消息转换为目标平台格式
 */

/**
 * 基础输出处理器接口
 */
export class BaseOutputProcessor {
  /**
   * 将标准化消息转换为目标平台格式
   * @param {Object} message - 标准化消息对象
   * @returns {Object} 目标平台格式的消息
   */
  transform(message) {
    throw new Error('transform method must be implemented');
  }

  /**
   * 发送消息到目标平台
   * @param {string} url - 目标 URL
   * @param {Object} payload - 消息载荷
   * @returns {Promise<Object>} 发送结果
   */
  async send(url, payload) {
    throw new Error('send method must be implemented');
  }
}

/**
 * 飞书输出处理器
 */
export class FeishuOutputProcessor extends BaseOutputProcessor {
  transform(message) {
    if (message.type === 'raw') {
      // 对于原始类型，直接透传
      return message.content;
    }

    // 对于文本类型，转换为飞书格式
    return {
      msg_type: 'text',
      content: {
        text: message.content
      }
    };
  }

  async send(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return {
        success: response.ok,
        status: response.status,
        url: url,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        url: url,
        error: error.message
      };
    }
  }
}

/**
 * 钉钉输出处理器
 */
export class DingTalkOutputProcessor extends BaseOutputProcessor {
  transform(message) {
    if (message.type === 'raw') {
      // 对于原始类型，直接透传
      return message.content;
    }

    // 转换为钉钉格式
    return {
      msgtype: 'text',
      text: {
        content: message.content
      }
    };
  }

  async send(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return {
        success: response.ok,
        status: response.status,
        url: url,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        url: url,
        error: error.message
      };
    }
  }
}

/**
 * 企业微信输出处理器
 */
export class WeChatWorkOutputProcessor extends BaseOutputProcessor {
  transform(message) {
    if (message.type === 'raw') {
      // 对于原始类型，直接透传
      return message.content;
    }

    // 转换为企业微信格式
    return {
      msgtype: 'text',
      text: {
        content: message.content
      }
    };
  }

  async send(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return {
        success: response.ok,
        status: response.status,
        url: url,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        url: url,
        error: error.message
      };
    }
  }
}

/**
 * 通用 HTTP 输出处理器（直接透传）
 */
export class GenericHttpOutputProcessor extends BaseOutputProcessor {
  transform(message) {
    // 通用处理器总是直接透传
    return message.type === 'raw' ? message.content : {
      message: message.content,
      type: message.type,
      metadata: message.metadata
    };
  }

  async send(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      return {
        success: response.ok,
        status: response.status,
        url: url,
        error: response.ok ? null : `HTTP ${response.status}`
      };
    } catch (error) {
      return {
        success: false,
        status: 0,
        url: url,
        error: error.message
      };
    }
  }
}

/**
 * 输出处理器工厂
 */
export class OutputProcessorFactory {
  static processors = {
    feishu: FeishuOutputProvider,
    dingtalk: DingTalkOutputProvider,
    wechatwork: WeChatWorkOutputProvider,
    generic: GenericHttpOutputProvider,
  };

  /**
   * 创建输出处理器
   * @param {string} type - 处理器类型
   * @returns {BaseOutputProcessor} 处理器实例
   */
  static create(type) {
    const ProcessorClass = this.processors[type];
    if (!ProcessorClass) {
      throw new Error(`Unknown output processor type: ${type}`);
    }
    return new ProcessorClass();
  }

  /**
   * 根据 URL 自动检测输出类型
   * @param {string} url - 目标 URL
   * @returns {string} 检测到的类型
   */
  static detectType(url) {
    if (url.includes('open.feishu.cn') || url.includes('open.larksuite.com')) {
      return 'feishu';
    }
    if (url.includes('oapi.dingtalk.com')) {
      return 'dingtalk';
    }
    if (url.includes('qyapi.weixin.qq.com')) {
      return 'wechatwork';
    }
    return 'generic';
  }

  /**
   * 获取支持的处理器类型
   * @returns {string[]} 支持的类型列表
   */
  static getSupportedTypes() {
    return Object.keys(this.processors);
  }
}
