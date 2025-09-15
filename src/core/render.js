/**
 * Render helpers for Canonical v2
 * - Capability-driven presentation selection
 * - Lightweight fallback chain (raw -> markdown -> text)
 */

const PROVIDER_CAPS = {
  feishu: { raw: true, markdown: false, text: true },
  dingtalk: { raw: true, markdown: true, text: true },
  wechatwork: { raw: true, markdown: true, text: true },
  generic: { raw: true, markdown: true, text: true },
};

export function getProviderCaps(name) {
  return PROVIDER_CAPS[name] || { raw: true, markdown: true, text: true };
}

function normalizeCaps(capsOrName) {
  if (!capsOrName) return getProviderCaps('generic');
  if (typeof capsOrName === 'string') return getProviderCaps(capsOrName);
  return capsOrName;
}

/**
 * Select a presentation for a Canonical v2 message
 * Returns one of:
 * - { mode: 'raw', raw }
 * - { mode: 'markdown', text }
 * - { mode: 'text', text }
 */
export function selectPresentation(message, capsOrName) {
  const caps = normalizeCaps(capsOrName);

  // passthrough/raw always wins when supported
  if ((message?.passthrough === true || message?.type === 'raw' || message?.body?.type === 'raw') && caps.raw) {
    return { mode: 'raw', raw: message?.content ?? message?.body?.raw };
  }

  // prefer markdown if supported and available
  if (caps.markdown && message?.body?.type === 'markdown' && typeof message?.body?.text === 'string') {
    return { mode: 'markdown', text: message.body.text };
  }

  // fallback to plain text
  const text = typeof message?.content === 'string' ? message.content : '';
  return { mode: 'text', text };
}

/**
 * Simple utility to coerce a non-empty string
 */
export function asNonEmptyString(v, fallback = '') {
  if (typeof v === 'string' && v.trim().length > 0) return v;
  return fallback;
}

