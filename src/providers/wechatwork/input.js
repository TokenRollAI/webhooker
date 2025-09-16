/** WeChat Work Input Provider */
import { makeCanonicalV2, fromRawPayload } from '../../core/canonical.js';

function normalizeWeComPayload(payload) {
  const envelope = {
    provider: 'wechatwork',
    timestamp: Date.now(),
    identity: { mentioned_mobile_list: payload?.mentioned_mobile_list, mentioned_list: payload?.mentioned_list },
  };
  const ext = { wechatwork: { raw: payload } };

  if (payload?.msgtype === 'text') {
    const text = typeof payload?.text?.content === 'string' ? payload.text.content : '';
    return makeCanonicalV2({ envelope, body: { type: 'text', text }, options: {}, ext, originalFormat: 'wechatwork' });
  }

  if (payload?.msgtype === 'markdown') {
    const text = typeof payload?.markdown?.content === 'string' ? payload.markdown.content : '';
    return makeCanonicalV2({ envelope, body: { type: 'markdown', text }, options: {}, ext, originalFormat: 'wechatwork' });
  }

  return fromRawPayload(payload, { originalFormat: 'wechatwork', passthrough: true });
}

export class WeChatWorkInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }
    if (!payload.msgtype) {
      return { valid: false, error: 'Unsupported WeChat Work payload' };
    }
    return { valid: true };
  }

  process(payload) {
    return normalizeWeComPayload(payload);
  }
}
