/** Feishu Output Provider */
import { selectPresentation } from '../../core/render.js';
import { extractPassthroughText, stringifyPayload } from '../utils.js';

export class FeishuOutputProvider {
  transform(message) {
    const passthroughText = extractPassthroughText(message);
    if (passthroughText !== null) {
      return { msg_type: 'text', content: { text: passthroughText } };
    }

    const pres = selectPresentation(message, 'feishu');
    if (pres.mode === 'raw') {
      const raw = stringifyPayload(pres.raw);
      return { msg_type: 'text', content: { text: raw } };
    }
    // Feishu text message (markdown 也退化为文本)
    return { msg_type: 'text', content: { text: pres.text } };
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

