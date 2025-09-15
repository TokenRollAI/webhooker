/** WeChat Work Output Provider */
import { selectPresentation } from '../../core/render.js';

export class WeChatWorkOutputProvider {
  transform(message) {
    const pres = selectPresentation(message, 'wechatwork');
    if (pres.mode === 'raw') return pres.raw;
    if (pres.mode === 'markdown') {
      return { msgtype: 'markdown', markdown: { content: pres.text } };
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

