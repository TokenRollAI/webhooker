/** Feishu Output Provider */
import { selectPresentation } from '../../core/render.js';

export class FeishuOutputProvider {
  transform(message) {
    const pres = selectPresentation(message, 'feishu');
    if (pres.mode === 'raw') return pres.raw;
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

