/**
 * 签名工具 - 用于钉钉等需要签名的平台
 */

/**
 * 生成钉钉签名
 * @see https://open.dingtalk.com/document/robots/customize-robot-security-settings
 */
export async function signDingtalk(secret: string): Promise<{ timestamp: string; sign: string }> {
  const timestamp = Date.now().toString();
  const stringToSign = `${timestamp}\n${secret}`;

  // 使用 Web Crypto API (兼容 CF Workers 和 Node.js)
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(stringToSign)
  );

  // Base64 编码
  const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return { timestamp, sign: encodeURIComponent(sign) };
}

/**
 * 生成飞书签名
 * @see https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot
 */
export async function signFeishu(secret: string): Promise<{ timestamp: string; sign: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const stringToSign = `${timestamp}\n${secret}`;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(stringToSign),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // 飞书签名是对空字符串进行 HMAC
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode('')
  );

  const sign = btoa(String.fromCharCode(...new Uint8Array(signature)));

  return { timestamp, sign };
}

/**
 * 生成企业微信签名 (如果需要)
 * 企业微信 Webhook 通常不需要签名，但保留此函数以备扩展
 */
export function signWechatWork(_secret: string): Record<string, string> {
  // 企业微信 Webhook 机器人不需要签名
  return {};
}
