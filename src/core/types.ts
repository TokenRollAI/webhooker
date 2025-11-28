/**
 * Webhooker - 核心类型定义
 *
 * 设计目标：创建一个能够表达主流 IM 消息特性的统一数据结构
 * 支持平台：飞书、钉钉、企业微信、Discord、Telegram、Slack
 */

// ============================================================================
// 核心消息结构 - IMMessage
// ============================================================================

/**
 * IM 消息的核心抽象
 * 这是所有输入源解析后、所有输出格式化前的统一中间态
 */
export interface IMMessage {
  /** 消息标题 (可选，用于卡片类消息) */
  title?: string;

  /** 消息正文 - 支持纯文本或 Markdown */
  body: string;

  /** 消息级别 - 用于映射颜色和图标 */
  level: MessageLevel;

  /** 主要链接 - 点击卡片/标题时跳转 */
  link?: string;

  /** 结构化字段 - 用于展示 key-value 信息 */
  fields?: MessageField[];

  /** @提及的用户 */
  mentions?: Mention[];

  /** 图片列表 */
  images?: ImageAttachment[];

  /** 操作按钮 */
  actions?: ActionButton[];

  /** 页脚文本 */
  footer?: string;

  /** 时间戳 (Unix 秒) */
  timestamp?: number;
}

/** 消息级别 - 映射到各平台的颜色 */
export type MessageLevel = 'info' | 'success' | 'warning' | 'error';

/** 结构化字段 */
export interface MessageField {
  label: string;
  value: string;
  /** 是否短字段 (允许并排显示) */
  short?: boolean;
}

/** @提及 */
export interface Mention {
  /** 提及类型 */
  type: 'user' | 'all';
  /** 用户 ID (平台相关) */
  userId?: string;
  /** 用户名/显示名 (用于占位或展示) */
  name?: string;
}

/** 图片附件 */
export interface ImageAttachment {
  url: string;
  alt?: string;
  /** 图片用途 */
  type?: 'cover' | 'inline' | 'thumbnail';
}

/** 操作按钮 */
export interface ActionButton {
  text: string;
  url: string;
  /** 按钮样式 */
  style?: 'primary' | 'default' | 'danger';
}

// ============================================================================
// Gateway 事件 - 包含路由和原始数据
// ============================================================================

/**
 * 网关事件 - 包装 IMMessage 并添加路由信息
 */
export interface GatewayEvent {
  /** 统一消息内容 */
  message: IMMessage;

  /** 元数据 */
  metadata: EventMetadata;

  /** 原始载荷 (用于 raw 模式透传) */
  rawPayload?: unknown;
}

/** 事件元数据 */
export interface EventMetadata {
  /** 来源标识 */
  source: string;

  /** 追踪 ID */
  traceId?: string;

  /** 原始请求时间 */
  receivedAt: number;

  /** 扩展字段 - 存放特定平台需要的额外信息 */
  extras?: Record<string, unknown>;
}

// ============================================================================
// 路由配置
// ============================================================================

/**
 * 目标端点配置
 */
export interface TargetEndpoint {
  /** 平台提供商 */
  provider: Provider;

  /** Webhook Token/Key */
  token: string;

  /** 签名密钥 (钉钉等需要) */
  secret?: string;

  /** 完整 URL (用于 generic 类型) */
  fullUrl?: string;
}

/** 支持的平台 */
export type Provider =
  | 'feishu'      // 飞书
  | 'dingtalk'    // 钉钉
  | 'wechatwork'  // 企业微信
  | 'discord'     // Discord
  | 'telegram'    // Telegram
  | 'slack'       // Slack Incoming Webhook
  | 'generic';    // 通用 HTTP

/** 分发配置 */
export interface DispatchConfig {
  /** 目标列表 */
  targets: TargetEndpoint[];

  /** 选项 */
  options: DispatchOptions;
}

/** 分发选项 */
export interface DispatchOptions {
  /** 强制覆盖标题 */
  forceTitle?: string;

  /** 强制覆盖级别 */
  forceLevel?: MessageLevel;
}

// ============================================================================
// 解析器和格式化器接口
// ============================================================================

/**
 * 输入源解析器接口
 * 负责将原始请求解析为 GatewayEvent
 */
export interface SourceParser {
  /** 解析器名称 */
  readonly name: string;

  /** 解析请求体 */
  parse(body: unknown, headers?: Headers): GatewayEvent;

  /** 验证请求体格式 */
  validate?(body: unknown): ValidationResult;
}

/**
 * 输出格式化器接口
 * 负责将 GatewayEvent 转化为目标平台的请求
 */
export interface OutputFormatter {
  /** 格式化器名称 */
  readonly name: string;

  /** 平台标识 */
  readonly provider: Provider;

  /** 转换消息 */
  format(event: GatewayEvent, target: TargetEndpoint): FormattedRequest;
}

/** 验证结果 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/** 格式化后的请求 */
export interface FormattedRequest {
  url: string;
  method: 'POST' | 'GET';
  headers: Record<string, string>;
  body: unknown;
}

// ============================================================================
// 分发结果
// ============================================================================

/** 单个目标的发送结果 */
export interface SendResult {
  target: TargetEndpoint;
  success: boolean;
  statusCode?: number;
  error?: string;
  responseBody?: unknown;
}

/** 总体分发结果 */
export interface DispatchResult {
  totalTargets: number;
  successCount: number;
  results: SendResult[];
}

// ============================================================================
// 环境变量类型
// ============================================================================

/** Cloudflare Worker 环境变量 */
export interface Env {
  /** 认证密钥 (可选) */
  AUTH_SECRET?: string;
}

// ============================================================================
// 工具类型
// ============================================================================

/** 深度可选 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/** IMMessage 构建器输入 (所有字段可选) */
export type IMMessageInput = Partial<IMMessage> & { body: string };
