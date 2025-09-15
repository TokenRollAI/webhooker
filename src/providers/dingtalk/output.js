/** DingTalk Output Provider */
import { selectPresentation, asNonEmptyString } from '../../core/render.js';

export class DingTalkOutputProvider {
  transform(message) {
    const pres = selectPresentation(message, 'dingtalk');
    if (pres.mode === 'raw') return pres.raw;
    if (pres.mode === 'markdown') {
      return {
        msgtype: 'markdown',
        markdown: {
          title: asNonEmptyString(message?.envelope?.identity?.username, 'Message'),
          text: pres.text
        }
      };
    }
    return { msgtype: 'text', text: { content: pres.text } };
  }
  async send(url, payload) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { success: response.ok, status: response.status, url, error: response.ok ? null : `HTTP ${response.status}` };
    } catch (error) {
      return { success: false, status: 0, url, error: error.message };
    }
  }
}

