/** Generic HTTP Output Provider */
export class GenericHttpOutputProvider {
  transform(message) {
    if (message?.type === 'raw' || message?.passthrough) return message.content;
    // 支持 Canonical v2：直接返回更丰富的上下文，方便通用 HTTP 端消费
    return {
      message: message.content,
      type: message.type,
      originalFormat: message.originalFormat,
      envelope: message.envelope,
      body: message.body,
      options: message.options,
    };
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

