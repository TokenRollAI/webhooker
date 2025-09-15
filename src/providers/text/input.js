/** Text Input Provider */
import { fromTextPayload } from '../../core/canonical.js';

export class TextInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload format' };
    if (!payload.message || typeof payload.message !== 'string' || !payload.message.trim()) return { valid: false, error: 'Message is empty or missing' };
    return { valid: true };
  }
  process(payload) {
    return fromTextPayload(payload);
  }
}

