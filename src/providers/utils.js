/**
 * Provider 层通用工具
 */
export function stringifyPayload(payload) {
  if (payload === undefined || payload === null) {
    return '';
  }
  if (typeof payload === 'string') {
    return payload;
  }
  try {
    return JSON.stringify(payload);
  } catch (error) {
    return String(payload);
  }
}

export function extractPassthroughText(message) {
  if (!message) return null;
  const isPassthrough = message.passthrough === true || message?.options?.passthrough === true;
  if (!isPassthrough) {
    return null;
  }

  const raw = message?.body?.raw ?? message?.content;
  return stringifyPayload(raw);
}
