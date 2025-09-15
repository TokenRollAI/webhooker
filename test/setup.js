// 模拟 Cloudflare Workers 环境中的全局对象

// 模拟 Request 构造函数
global.Request = class Request {
  constructor(url, init = {}) {
    this.url = url;
    this.method = init.method || 'GET';
    this.headers = new Map(Object.entries(init.headers || {}));
    this.body = init.body;
  }

  async json() {
    if (this.body) {
      return JSON.parse(this.body);
    }
    throw new Error('No body');
  }
};

// 模拟 Response 构造函数
global.Response = class Response {
  constructor(body, init = {}) {
    this.body = body;
    this.status = init.status || 200;
    this.headers = new Map(Object.entries(init.headers || {}));
    this.ok = this.status >= 200 && this.status < 300;
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
};

// 模拟 URL 构造函数
global.URL = class URL {
  constructor(url) {
    // 使用 Node.js 内置的 URL 构造函数
    const parsed = new (require('url').URL)(url);
    this.href = parsed.href;
    this.protocol = parsed.protocol;
    this.host = parsed.host;
    this.pathname = parsed.pathname;
    this.search = parsed.search;
    this.searchParams = new URLSearchParams(parsed.search);
  }
};
