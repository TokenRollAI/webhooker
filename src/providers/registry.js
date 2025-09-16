import { SlackInputProvider } from './slack/input.js';
import { SlackOutputProvider } from './slack/output.js';
import { FeishuInputProvider } from './feishu/input.js';
import { FeishuOutputProvider } from './feishu/output.js';
import { DingTalkInputProvider } from './dingtalk/input.js';
import { DingTalkOutputProvider } from './dingtalk/output.js';
import { RawJsonInputProvider } from './raw/input.js';
import { RawOutputProvider } from './raw/output.js';
import { TextInputProvider } from './text/input.js';
import { TextOutputProvider } from './text/output.js';
import { WeChatWorkInputProvider } from './wechatwork/input.js';
import { WeChatWorkOutputProvider } from './wechatwork/output.js';
import { GenericInputProvider } from './generic/input.js';
import { GenericHttpOutputProvider } from './generic/output.js';

const PROVIDERS = [
  {
    name: 'slack',
    createInput: () => new SlackInputProvider(),
    createOutput: () => new SlackOutputProvider(),
    matchesOutputUrl: (url) => /hooks\.slack\.com/i.test(url),
  },
  {
    name: 'feishu',
    createInput: () => new FeishuInputProvider(),
    createOutput: () => new FeishuOutputProvider(),
    matchesOutputUrl: (url) => /open\.(feishu|larksuite)\.(cn|com)/i.test(url),
  },
  {
    name: 'dingtalk',
    createInput: () => new DingTalkInputProvider(),
    createOutput: () => new DingTalkOutputProvider(),
    matchesOutputUrl: (url) => /oapi\.dingtalk\.com/i.test(url),
  },
  {
    name: 'wechatwork',
    createInput: () => new WeChatWorkInputProvider(),
    createOutput: () => new WeChatWorkOutputProvider(),
    matchesOutputUrl: (url) => /qyapi\.weixin\.qq\.com/i.test(url),
  },
  {
    name: 'raw',
    createInput: () => new RawJsonInputProvider(),
    createOutput: () => new RawOutputProvider(),
  },
  {
    name: 'text',
    createInput: () => new TextInputProvider(),
    createOutput: () => new TextOutputProvider(),
  },
  {
    name: 'generic',
    createInput: () => new GenericInputProvider(),
    createOutput: () => new GenericHttpOutputProvider(),
  },
];

const PROVIDER_MAP = new Map(PROVIDERS.map((p) => [p.name, p]));

export function getProvider(name) {
  return PROVIDER_MAP.get(name);
}

export function listProvidersWithInput() {
  return PROVIDERS.filter((p) => typeof p.createInput === 'function').map((p) => p.name);
}

export function listProvidersWithOutput() {
  return PROVIDERS.filter((p) => typeof p.createOutput === 'function').map((p) => p.name);
}

export function detectProviderByUrl(url) {
  if (!url) return 'generic';
  for (const provider of PROVIDERS) {
    if (typeof provider.matchesOutputUrl === 'function' && provider.matchesOutputUrl(url)) {
      return provider.name;
    }
  }
  return 'generic';
}
