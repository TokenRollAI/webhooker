/**
 * Webhooker - 常量定义
 */

import type { Provider, MessageLevel } from './types';

// ============================================================================
// 平台 Webhook Base URL
// ============================================================================

/**
 * 各平台 Webhook 的 Base URL
 * 使用时只需传递 Token，代码内部拼接完整 URL
 */
export const PROVIDER_BASE_URLS: Record<Provider, string> = {
  feishu: 'https://open.feishu.cn/open-apis/bot/v2/hook/',
  dingtalk: 'https://oapi.dingtalk.com/robot/send?access_token=',
  wechatwork: 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=',
  discord: 'https://discord.com/api/webhooks/',
  telegram: 'https://api.telegram.org/bot',
  slack: 'https://hooks.slack.com/services/',
  generic: '', // generic 需要传完整 URL
};

/**
 * Telegram 发送消息的方法名
 */
export const TELEGRAM_METHOD = '/sendMessage';

// ============================================================================
// 消息级别颜色映射
// ============================================================================

/**
 * 各平台的颜色映射
 */
export const LEVEL_COLORS: Record<Provider, Record<MessageLevel, string | number>> = {
  feishu: {
    info: 'blue',
    success: 'green',
    warning: 'orange',
    error: 'red',
  },
  dingtalk: {
    info: '#1890FF',
    success: '#52C41A',
    warning: '#FAAD14',
    error: '#F5222D',
  },
  wechatwork: {
    info: 'info',
    success: 'info', // 企业微信颜色有限
    warning: 'warning',
    error: 'warning',
  },
  discord: {
    info: 0x5865f2,    // Discord Blurple
    success: 0x57f287, // Green
    warning: 0xfee75c, // Yellow
    error: 0xed4245,   // Red
  },
  telegram: {
    info: '',      // Telegram 不支持颜色
    success: '✅',
    warning: '⚠️',
    error: '🚨',
  },
  slack: {
    info: '#36a64f',
    success: '#2eb886',
    warning: '#daa038',
    error: '#a30200',
  },
  generic: {
    info: 'info',
    success: 'success',
    warning: 'warning',
    error: 'error',
  },
};

// ============================================================================
// 默认值
// ============================================================================

export const DEFAULTS = {
  /** 默认消息级别 */
  level: 'info' as MessageLevel,

  /** 默认超时 (毫秒) */
  timeout: 10000,

  /** 最大并发请求数 */
  maxConcurrency: 10,
} as const;

// ============================================================================
// 路由路径
// ============================================================================

export const ROUTES = {
  /** API 版本前缀 */
  API_PREFIX: '/api/v1',

  /** 转发路由 */
  FORWARD: '/forward/:source',

  /** 健康检查 */
  HEALTH: '/health',

  /** 首页 */
  HOME: '/',
} as const;

// ============================================================================
// HTTP Headers
// ============================================================================

export const HEADERS = {
  CONTENT_TYPE: 'Content-Type',
  CONTENT_TYPE_JSON: 'application/json',
  USER_AGENT: 'User-Agent',
  USER_AGENT_VALUE: 'Webhooker/2.0',
} as const;

// ============================================================================
// 支持的输入源
// ============================================================================

export const SUPPORTED_SOURCES = [
  'slack',
  'feishu',
  'dingtalk',
  'wechatwork',
  'github',
  'prometheus',
  'generic',
  'raw',
  'text',
] as const;

export type SupportedSource = (typeof SUPPORTED_SOURCES)[number];

// ============================================================================
// Provider 别名映射
// ============================================================================

/**
 * URL 参数别名到标准 Provider 的映射
 * 支持多种写法
 */
export const PROVIDER_ALIASES: Record<string, Provider> = {
  // 飞书
  feishu: 'feishu',
  fs: 'feishu',
  lark: 'feishu',

  // 钉钉
  dingtalk: 'dingtalk',
  dd: 'dingtalk',
  ding: 'dingtalk',

  // 企业微信
  wechatwork: 'wechatwork',
  wechat: 'wechatwork',
  wecom: 'wechatwork',
  wxwork: 'wechatwork',

  // Discord
  discord: 'discord',
  dc: 'discord',

  // Telegram
  telegram: 'telegram',
  tg: 'telegram',

  // Slack
  slack: 'slack',

  // 通用
  generic: 'generic',
  http: 'generic',
  webhook: 'generic',
};
