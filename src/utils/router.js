/**
 * 简单的路由器实现
 */
export class Router {
  constructor() {
    this.routes = new Map();
  }

  /**
   * 注册 GET 路由
   */
  get(path, handler) {
    this.addRoute('GET', path, handler);
  }

  /**
   * 注册 POST 路由
   */
  post(path, handler) {
    this.addRoute('POST', path, handler);
  }

  /**
   * 添加路由
   */
  addRoute(method, path, handler) {
    const key = `${method}:${path}`;
    this.routes.set(key, handler);
  }

  /**
   * 处理请求
   */
  async handle(request) {
    try {
      const url = new URL(request.url);
      const key = `${request.method}:${url.pathname}`;
      
      const handler = this.routes.get(key);
      if (handler) {
        return await handler(request);
      }

      // 404 Not Found
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Endpoint not found'
        }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    } catch (error) {
      console.error('Router error:', error);
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Internal server error'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}
