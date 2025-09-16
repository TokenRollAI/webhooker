/** Raw Output Provider */
export class RawOutputProvider {
  transform(message) {
    if (message?.body?.type === 'raw') {
      return message.body.raw;
    }
    if (message?.content !== undefined) {
      return message.content;
    }
    return message?.body ?? {};
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
