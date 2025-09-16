import { getProvider, listProvidersWithInput } from '../providers/registry.js';

/**
 * 输入处理器工厂 - 基于 Provider Registry 构建解析能力
 */
export class InputProcessorFactory {
  static create(type) {
    const provider = getProvider(type);
    if (!provider || typeof provider.createInput !== 'function') {
      throw new Error(`Unknown input processor type: ${type}`);
    }
    return provider.createInput();
  }

  static getSupportedTypes() {
    return listProvidersWithInput();
  }
}
