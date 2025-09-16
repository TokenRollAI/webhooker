/** Text Output Provider */
import { selectPresentation } from '../../core/render.js';

export class TextOutputProvider {
  transform(message) {
    const pres = selectPresentation(message, 'generic');
    if (pres.mode === 'raw') return pres.raw;
    return { message: pres.text, originalFormat: message?.originalFormat };
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
