/** Slack Output Provider */
import { selectPresentation } from '../../core/render.js';

export class SlackOutputProvider {
  transform(message) {
    // 优先复用 Canonical v2 中 body 的结构
    if (message?.passthrough === true && message?.type === 'raw') {
      return message.content;
    }

    if (message?.body?.type === 'blocks' && Array.isArray(message.body.blocks)) {
      const payload = { blocks: message.body.blocks };
      if (typeof message?.content === 'string' && message.content.trim().length > 0) {
        payload.text = message.content;
      }
      return payload;
    }

    if (message?.body?.type === 'attachments' && Array.isArray(message.body.attachments)) {
      return {
        text: typeof message?.content === 'string' ? message.content : '',
        attachments: message.body.attachments,
      };
    }

    const pres = selectPresentation(message, 'slack');
    if (pres.mode === 'raw') {
      return pres.raw;
    }

    // Slack Webhook 默认支持 markdown，因此保留 text 即可
    return {
      text: pres.text,
      mrkdwn: pres.mode === 'markdown',
    };
  }

  async send(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return { success: response.ok, status: response.status, url, error: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, status: 0, url, error: error.message };
    }
  }
}
