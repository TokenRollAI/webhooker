/** Raw JSON Input Provider */
import { fromRawPayload } from '../../core/canonical.js';

export class RawJsonInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') return { valid: false, error: 'Invalid payload format' };
    if (Object.keys(payload).length === 0) return { valid: false, error: 'Empty payload' };
    return { valid: true };
  }
  process(payload) {
    return fromRawPayload(payload);
  }
}

