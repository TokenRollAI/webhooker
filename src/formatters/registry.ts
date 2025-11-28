/**
 * 格式化器注册表
 */

import type { OutputFormatter, Provider } from '../core/types';

// 导入各格式化器
import { FeishuFormatter } from './feishu';
import { DingtalkFormatter } from './dingtalk';
import { WechatWorkFormatter } from './wechatwork';
import { DiscordFormatter } from './discord';
import { TelegramFormatter } from './telegram';
import { SlackFormatter } from './slack';
import { GenericFormatter } from './generic';

/**
 * 格式化器映射表
 */
const formatters: Record<Provider, OutputFormatter> = {
  feishu: new FeishuFormatter(),
  dingtalk: new DingtalkFormatter(),
  wechatwork: new WechatWorkFormatter(),
  discord: new DiscordFormatter(),
  telegram: new TelegramFormatter(),
  slack: new SlackFormatter(),
  generic: new GenericFormatter(),
};

/**
 * 获取格式化器
 */
export function getFormatter(provider: Provider): OutputFormatter {
  const formatter = formatters[provider];
  if (!formatter) {
    return formatters.generic;
  }
  return formatter;
}

/**
 * 获取所有支持的输出目标
 */
export function getSupportedProviders(): Provider[] {
  return Object.keys(formatters) as Provider[];
}

/**
 * 注册自定义格式化器
 */
export function registerFormatter(provider: Provider, formatter: OutputFormatter): void {
  formatters[provider] = formatter;
}
