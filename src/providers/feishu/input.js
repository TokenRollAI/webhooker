/** Feishu Input Provider */
import { makeCanonicalV2, fromRawPayload } from '../../core/canonical.js';

function parseFeishuContent(message) {
  if (!message) return { body: { type: 'raw', raw: {} }, ext: { feishu: { message } } };
  const baseExt = { feishu: { message } };

  // 处理 text / markdown
  if (message.msg_type === 'text') {
    let text = '';
    if (typeof message.content === 'string') {
      try {
        const parsed = JSON.parse(message.content);
        text = typeof parsed?.text === 'string' ? parsed.text : '';
      } catch {
        text = message.content;
      }
    } else if (typeof message.content?.text === 'string') {
      text = message.content.text;
    }
    return { body: { type: 'text', text }, ext: baseExt };
  }

  if (message.msg_type === 'markdown') {
    const text = typeof message.content === 'string' ? message.content : String(message.content?.text ?? '');
    return { body: { type: 'markdown', text }, ext: baseExt };
  }

  if (message.msg_type === 'post') {
    const markdown = feishuPostToMarkdown(message.content);
    return { body: { type: 'markdown', text: markdown }, ext: baseExt };
  }

  // interactive / image 等复杂消息走 raw 透传
  return { body: { type: 'raw', raw: message }, ext: baseExt };
}

function feishuPostToMarkdown(content) {
  if (!content) return '';
  try {
    const parsed = typeof content === 'string' ? JSON.parse(content) : content;
    const locales = parsed?.post || parsed;
    const blocks = locales?.zh_cn?.content || locales?.en_us?.content || [];
    return blocks
      .map((row) =>
        row
          .map((element) => {
            switch (element.tag) {
              case 'text':
                return element.text || '';
              case 'a':
                return element.href ? `[${element.text || element.href}](${element.href})` : element.text || '';
              case 'at':
                return element.user_name ? `@${element.user_name}` : '@user';
              case 'img':
                return element.image_key ? `![image](${element.image_key})` : '[image]';
              default:
                return '';
            }
          })
          .filter(Boolean)
          .join(' ')
      )
      .filter(Boolean)
      .join('\n');
  } catch {
    return '';
  }
}

function buildEnvelope(payload, message) {
  const header = payload?.header || {};
  const sender = payload?.event?.sender || payload?.sender || {};
  const routingInfo = {
    chat_id: message?.chat_id || payload?.chat_id,
    chat_type: message?.chat_type,
    message_id: message?.message_id || payload?.message_id,
  };
  const identity = {
    app_id: header.app_id,
    tenant_key: payload?.event?.tenant_key || payload?.tenant_key,
    user_id: sender?.sender_id?.user_id || sender?.user_id,
    open_id: sender?.sender_id?.open_id || sender?.open_id,
  };
  const timestamp = message?.create_time ? Number(message.create_time) * 1000 : Date.now();
  return { provider: 'feishu', routing: routingInfo, identity, timestamp };
}

function normalizeFeishuPayload(payload) {
  if (payload?.event?.message) {
    const message = payload.event.message;
    const { body, ext } = parseFeishuContent({
      msg_type: message.msg_type,
      content: message.content,
    });
    return makeCanonicalV2({
      envelope: buildEnvelope(payload, message),
      body,
      options: {},
      ext,
      originalFormat: 'feishu',
      passthrough: body.type === 'raw',
    });
  }

  if (payload?.msg_type) {
    const { body, ext } = parseFeishuContent(payload);
    return makeCanonicalV2({
      envelope: buildEnvelope(payload, payload),
      body,
      options: {},
      ext,
      originalFormat: 'feishu',
      passthrough: body.type === 'raw',
    });
  }

  return fromRawPayload(payload, { originalFormat: 'feishu', passthrough: true });
}

export class FeishuInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }
    const hasMessage = payload.msg_type || payload?.event?.message;
    if (!hasMessage) {
      return { valid: false, error: 'Unsupported Feishu payload' };
    }
    return { valid: true };
  }

  process(payload) {
    return normalizeFeishuPayload(payload);
  }
}
