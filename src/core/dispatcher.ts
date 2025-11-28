/**
 * 分发器 - 负责将消息发送到多个目标
 */

import type {
  GatewayEvent,
  TargetEndpoint,
  DispatchConfig,
  DispatchResult,
  SendResult,
} from './types';
import { getFormatter } from '../formatters/registry';

/**
 * 分发消息到所有目标
 */
export async function dispatch(
  event: GatewayEvent,
  config: DispatchConfig
): Promise<DispatchResult> {
  const { targets, options } = config;

  // 应用选项
  if (options.forceTitle) {
    event.message.title = options.forceTitle;
  }
  if (options.forceLevel) {
    event.message.level = options.forceLevel;
  }

  // 并发发送到所有目标
  const promises = targets.map((target) => sendToTarget(event, target));

  const results = await Promise.allSettled(promises);

  // 处理结果
  const sendResults: SendResult[] = results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        target: targets[index],
        success: false,
        error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
      };
    }
  });

  const successCount = sendResults.filter((r) => r.success).length;

  return {
    totalTargets: targets.length,
    successCount,
    results: sendResults,
  };
}

/**
 * 发送到单个目标
 */
async function sendToTarget(
  event: GatewayEvent,
  target: TargetEndpoint
): Promise<SendResult> {
  try {
    // 获取格式化器
    const formatter = getFormatter(target.provider);

    // 格式化请求
    const request = formatter.format(event, target);

    // 发送请求
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: JSON.stringify(request.body),
    });

    // 读取响应
    let responseBody: unknown;
    try {
      responseBody = await response.json();
    } catch {
      responseBody = await response.text();
    }

    return {
      target,
      success: response.ok,
      statusCode: response.status,
      responseBody,
      error: response.ok ? undefined : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      target,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * 创建分发配置
 */
export function createDispatchConfig(
  targets: TargetEndpoint[],
  options: Partial<DispatchConfig['options']> = {}
): DispatchConfig {
  return {
    targets,
    options: {
      forceTitle: options.forceTitle,
      forceLevel: options.forceLevel,
    },
  };
}
