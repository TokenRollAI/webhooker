/**
 * Canonical Message v2 - 统一中间数据模型（含兼容字段）
 * envelope: 路由/身份/元信息
 * body: text | markdown | blocks | attachments | card | raw
 * options: 渲染与降级控制
 * ext: 保留 Provider 原始字段
 *
 * 同时保留顶层兼容字段：type/content/passthrough，便于旧输出处理器工作。
 */

export function makeCanonicalV2({ envelope = {}, body, options = {}, ext = {}, originalFormat, passthrough = false }) {
  const canonical = {
    schema_version: '2025-01-1',
    envelope,
    body,
    options: { passthrough: !!passthrough, ...options },
    ext,
    originalFormat,
  };
  const { type, text } = flattenBodyToCompat(body);
  canonical.type = type;
  // raw content body.raw
  canonical.content = type === 'raw' ? body?.raw : (text ?? '');
  canonical.passthrough = !!passthrough;
  return canonical;
}

// 兼容：保留旧的 makeCanonical API（text/markdown/raw）
export function makeCanonical({ type, content, originalFormat, metadata = {}, passthrough = false }) {
  const body = type === 'raw' ? { type: 'raw', raw: content } : (type === 'markdown' ? { type: 'markdown', text: String(content ?? '') } : { type: 'text', text: String(content ?? '') });
  return makeCanonicalV2({ envelope: { metadata }, body, options: {}, ext: {}, originalFormat, passthrough });
}

function flattenBodyToCompat(body) {
  if (!body) return { type: 'text', text: '' };
  if (body.type === 'text') return { type: 'text', text: body.text || '' };
  if (body.type === 'markdown') return { type: 'markdown', text: body.text || '' };
  if (body.type === 'raw') return { type: 'raw', text: '' };
  if (body.type === 'blocks') {
    const text = (body.blocks || []).map(b => blockToText(b)).filter(Boolean).join('\n');
    return { type: 'text', text };
  }
  if (body.type === 'attachments') {
    const text = (body.attachments || []).map(a => a.text || a.fallback || '').filter(Boolean).join('\n');
    return { type: 'text', text };
  }
  if (body.type === 'card') {
    const title = body.title || '';
    const summary = body.summary || '';
    return { type: 'text', text: [title, summary].filter(Boolean).join(' - ') };
  }
  return { type: 'text', text: '' };
}

function blockToText(block) {
  if (!block) return '';
  switch (block.type) {
    case 'section':
      if (block.text) return plainOrMrkdwnToText(block.text);
      if (Array.isArray(block.fields)) return block.fields.map(f => plainOrMrkdwnToText(f)).join(' | ');
      return '';
    case 'context':
      return (block.elements || []).map(e => (e.type === 'image' ? `[img:${e.alt || ''}]` : plainOrMrkdwnToText(e))).join(' ');
    case 'image':
      return `[image:${block.alt_text || block.alt || ''}]`;
    case 'divider':
      return '---';
    case 'actions':
      return (block.elements || []).map(e => (e.text?.text || e.text || '')).join(' ');
    default:
      return '';
  }
}

function plainOrMrkdwnToText(obj) {
  if (!obj) return '';
  if (typeof obj === 'string') return obj;
  if (obj.type === 'mrkdwn' || obj.type === 'plain_text') return obj.text || '';
  return '';
}

// 通用构造
export function fromRawPayload(payload, extra = {}) {
  return makeCanonicalV2({ envelope: {}, body: { type: 'raw', raw: payload }, options: {}, ext: {}, originalFormat: 'raw', ...extra });
}

export function fromTextPayload(payload, extra = {}) {
  const text = (payload?.message || '').trim();
  return makeCanonicalV2({ envelope: {}, body: { type: 'text', text }, options: {}, ext: {}, originalFormat: 'text', ...extra });
}

