/**
 * 解析器注册表
 */

import type { SourceParser, GatewayEvent } from '../core/types';
// SupportedSource type available if needed

// 导入各解析器
import { SlackParser } from './slack';
import { FeishuParser } from './feishu';
import { DingtalkParser } from './dingtalk';
import { WechatWorkParser } from './wechatwork';
import { GenericParser } from './generic';
import { RawParser } from './raw';
import { TextParser } from './text';

/**
 * 解析器映射表
 */
const parsers: Record<string, SourceParser> = {
  slack: new SlackParser(),
  feishu: new FeishuParser(),
  dingtalk: new DingtalkParser(),
  wechatwork: new WechatWorkParser(),
  generic: new GenericParser(),
  raw: new RawParser(),
  text: new TextParser(),
};

/**
 * 获取解析器
 */
export function getParser(source: string): SourceParser {
  const parser = parsers[source.toLowerCase()];
  if (!parser) {
    // 默认使用 generic 解析器
    return parsers.generic;
  }
  return parser;
}

/**
 * 获取所有支持的输入源
 */
export function getSupportedSources(): string[] {
  return Object.keys(parsers);
}

/**
 * 注册自定义解析器
 */
export function registerParser(name: string, parser: SourceParser): void {
  parsers[name.toLowerCase()] = parser;
}

/**
 * 解析请求体
 */
export function parseRequest(
  source: string,
  body: unknown,
  headers?: Headers
): GatewayEvent {
  const parser = getParser(source);
  return parser.parse(body, headers);
}
