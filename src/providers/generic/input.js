/** Generic Input Provider */
import { fromRawPayload } from '../../core/canonical.js';

export class GenericInputProvider {
  validate(payload) {
    if (!payload || typeof payload !== 'object') {
      return { valid: false, error: 'Invalid payload format' };
    }
    return { valid: true };
  }

  process(payload) {
    return fromRawPayload(payload, { originalFormat: 'generic', passthrough: true });
  }
}
