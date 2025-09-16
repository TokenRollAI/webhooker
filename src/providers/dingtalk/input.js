/** DingTalk Input Provider */
import { makeCanonicalV2, fromRawPayload } from '../../core/canonical.js';

function buildEnvelope(payload) {
  const at = payload?.at || {};
  return {
    provider: 'dingtalk',
    identity: {
      atMobiles: Array.isArray(at.atMobiles) ? at.atMobiles : [],
      atUserIds: Array.isArray(at.atUserIds) ? at.atUserIds : [],
      isAtAll: !!at.isAtAll,
    },
    timestamp: Date.now(),
  };
}

function normalizeDingTalkPayload(payload) {
  const envelope = buildEnvelope(payload);
  const ext = { dingtalk: { raw: payload } };

  if (payload?.msgtype === 'text') {
    const text = typeof payload?.text?.content === 'string' ? payload.text.content : '';
    return makeCanonicalV2({
      envelope,
      body: { type: 'text', text },
      options: {},
      ext,
      originalFormat: 'dingtalk',
    });
  }

  if (payload?.msgtype === 'markdown') {
    const text = typeof payload?.markdown?.text === 'string' ? payload.markdown.text : '';
    return makeCanonicalV2({
      envelope,
      body: { type: 'markdown', text },
      options: {},
      ext,
      originalFormat: 'dingtalk',
    });
  }

  if (payload?.msgtype === 'link') {
    const link = payload.link || {};
    const text = [link.title, link.text].filter(Boolean).join(' - ');
    const attachments = [{
      title: link.title,
      text: link.text,
      messageURL: link.messageUrl,
      picURL: link.picUrl,
    }];
    return makeCanonicalV2({
      envelope,
      body: { type: 'attachments', attachments },
      options: {},
      ext,
      originalFormat: 'dingtalk',
    });
  }

  return fromRawPayload(payload, { originalFormat: 'dingtalk', passthrough: true });
}

export class DingTalkInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }
    if (!payload.msgtype) {
      return { valid: false, error: 'Unsupported DingTalk payload' };
    }
    return { valid: true };
  }

  process(payload) {
    return normalizeDingTalkPayload(payload);
  }
}
