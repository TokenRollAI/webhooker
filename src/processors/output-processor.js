import { getProvider, listProvidersWithOutput, detectProviderByUrl } from '../providers/registry.js';

/**
 * 输出处理器工厂 - 基于 Provider Registry 构建发送能力
 */
export class OutputProcessorFactory {
  static create(type) {
    const provider = getProvider(type);
    if (!provider || typeof provider.createOutput !== 'function') {
      throw new Error(`Unknown output processor type: ${type}`);
    }
    return provider.createOutput();
  }

  static detectType(url) {
    return detectProviderByUrl(url);
  }

  static getSupportedTypes() {
    return listProvidersWithOutput();
  }
}
