/**
 * 多平台 Webhook 转发器
 *
 * 核心功能：
 * 1. 支持多种输入源格式（Slack、原始JSON等）
 * 2. 支持多种输出目标（飞书、其他平台）
 * 3. 灵活的消息转换和直接透传
 */

import { InputProcessorFactory } from './processors/input-processor.js';
import { OutputProcessorFactory } from './processors/output-processor.js';
import { Router } from './utils/router.js';
import { fromRawPayload } from './core/canonical.js';

export default {
  async fetch(request, env, ctx) {
    const router = new Router();

    // 注册路由
    router.post('/v1/slack', handleSlackWebhook);
    router.post('/v1/feishu', handleFeishuWebhook);
    router.post('/v1/raw', handleRawWebhook);
    router.get('/v1/health', handleHealthCheck);

    return router.handle(request);
  },
};

/**
 * 处理 Slack Webhook 请求
 */
async function handleSlackWebhook(request) {
  return await handleWebhook(request, 'slack');
}

/**
 * 处理飞书 Webhook 请求
 */
async function handleFeishuWebhook(request) {
  return await handleWebhook(request, 'feishu');
}

/**
 * 处理原始 JSON Webhook 请求
 */
async function handleRawWebhook(request) {
  return await handleWebhook(request, 'raw');
}

/**
 * 健康检查端点
 */
async function handleHealthCheck(request) {
  return new Response(
    JSON.stringify({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      supportedInputs: InputProcessorFactory.getSupportedTypes(),
      supportedOutputs: OutputProcessorFactory.getSupportedTypes()
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * 通用 Webhook 处理函数
 * @param {Request} request - 请求对象
 * @param {string} inputType - 输入类型
 * @returns {Response} - 响应对象
 */
async function handleWebhook(request, inputType) {
  try {
    // 1. 解析 URL 参数
    const url = new URL(request.url);
    const targetsParam = url.searchParams.get('targets');
    const outputType = url.searchParams.get('output') || 'auto'; // 支持指定输出类型
    const passthrough = url.searchParams.get('passthrough') === 'true'; // 是否直接透传

    // 2. 验证必需参数
    if (!targetsParam) {
      return createErrorResponse(400, "Query parameter 'targets' is missing or invalid.");
    }

    // 3. 解析请求体
    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return createErrorResponse(400, 'Invalid JSON payload.');
    }

    // 4. 处理输入
    let processedMessage;
    if (passthrough) {
      // 直接透传模式：构建 Canonical v2（body.raw + passthrough）
      processedMessage = fromRawPayload(payload, { passthrough: true, originalFormat: inputType });
    } else {
      // 标准处理模式：由 Input Provider 解析到 Canonical v2
      const inputProcessor = InputProcessorFactory.create(inputType);
      const validation = inputProcessor.validate(payload);

      if (!validation.valid) {
        return createErrorResponse(400, validation.error);
      }

      processedMessage = inputProcessor.process(payload);
    }

    // 5. 发送到目标
    const results = await sendToTargets(targetsParam, processedMessage, outputType);

    // 6. 返回结果
    const successCount = results.filter(r => r.success).length;
    return new Response(
      JSON.stringify({
        status: 'success',
        message: `Request received and forwarded to ${successCount}/${results.length} target(s).`,
        inputType: inputType,
        passthrough: passthrough,
        details: results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Webhook handling error:', error);
    return createErrorResponse(500, 'Internal server error.');
  }
}

/**
 * 创建错误响应
 * @param {number} status - HTTP 状态码
 * @param {string} message - 错误消息
 * @returns {Response} - 错误响应
 */
function createErrorResponse(status, message) {
  return new Response(
    JSON.stringify({
      status: 'error',
      message: message
    }),
    {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * 发送消息到多个目标
 * @param {string} targetsParam - 编码的目标 URL 列表
 * @param {Object} message - 处理后的消息对象
 * @param {string} outputType - 输出类型
 * @returns {Promise<Array>} - 发送结果数组
 */
async function sendToTargets(targetsParam, message, outputType) {
  const encodedUrls = targetsParam.split(',');

  const sendPromises = encodedUrls.map(async (encodedUrl) => {
    try {
      const targetUrl = decodeURIComponent(encodedUrl.trim());

      // 验证 URL
      if (!isValidUrl(targetUrl)) {
        console.error(`Invalid URL: ${targetUrl}`);
        return {
          success: false,
          url: targetUrl,
          error: 'Invalid URL format'
        };
      }

      // 确定输出处理器类型
      const processorType = outputType === 'auto'
        ? OutputProcessorFactory.detectType(targetUrl)
        : outputType;

      // 创建输出处理器
      const outputProcessor = OutputProcessorFactory.create(processorType);

      // 转换消息格式
      const payload = outputProcessor.transform(message);

      // 发送消息
      const result = await outputProcessor.send(targetUrl, payload);

      return {
        ...result,
        processorType: processorType
      };

    } catch (error) {
      console.error(`Error processing target ${encodedUrl}:`, error);
      return {
        success: false,
        url: encodedUrl,
        error: error.message
      };
    }
  });

  const results = await Promise.allSettled(sendPromises);
  return results.map(result =>
    result.status === 'fulfilled'
      ? result.value
      : { success: false, error: 'Promise rejected' }
  );
}

/**
 * 验证URL格式是否正确
 * @param {string} urlString - 要验证的URL字符串
 * @returns {boolean} - 是否为有效URL
 */
function isValidUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}
