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
    docs: {
      displayName: 'Slack',
      homepage: 'https://api.slack.com/',
      webhook: 'https://api.slack.com/messaging/webhooks',
      messageFormats: [
        { type: 'text', reference: 'https://api.slack.com/messaging/composing' },
        { type: 'blocks', reference: 'https://api.slack.com/reference/block-kit/blocks' },
        { type: 'attachments', reference: 'https://api.slack.com/reference/messaging/attachments' },
      ],
      notes: 'Slack Incoming Webhook 支持 text、blocks、attachments，消息默认支持 Markdown。',
    },
    createInput: () => new SlackInputProvider(),
    createOutput: () => new SlackOutputProvider(),
    matchesOutputUrl: (url) => /hooks\.slack\.com/i.test(url),
  },
  {
    name: 'feishu',
    docs: {
      displayName: '飞书 / Lark',
      homepage: 'https://open.feishu.cn/',
      webhook: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot',
      messageFormats: [
        { type: 'text', reference: 'https://open.feishu.cn/document/server-docs/im-v1/message/send-text' },
        { type: 'markdown', reference: 'https://open.feishu.cn/document/server-docs/im-v1/message/send-markdown' },
        { type: 'interactive', reference: 'https://open.feishu.cn/document/server-docs/im-v1/message/send-interactive' },
      ],
      notes: '飞书群机器人支持 text、post、interactive 等多种消息类型，卡片消息需开启透传。',
    },
    createInput: () => new FeishuInputProvider(),
    createOutput: () => new FeishuOutputProvider(),
    matchesOutputUrl: (url) => /open\.(feishu|larksuite)\.(cn|com)/i.test(url),
  },
  {
    name: 'dingtalk',
    docs: {
      displayName: '钉钉 DingTalk',
      homepage: 'https://open.dingtalk.com/',
      webhook: 'https://open.dingtalk.com/document/group/custom-robot-access',
      messageFormats: [
        { type: 'text', reference: 'https://open.dingtalk.com/document/orgapp/custom-robot-send-message' },
        { type: 'markdown', reference: 'https://open.dingtalk.com/document/orgapp/custom-robot-send-message#title-9nd-6rc-l6u' },
        { type: 'link', reference: 'https://open.dingtalk.com/document/orgapp/custom-robot-send-message#title-5ag-xhj-xrg' },
      ],
      notes: '钉钉自定义机器人支持 text、markdown、link 等类型，@ 功能通过 at 字段控制。',
    },
    createInput: () => new DingTalkInputProvider(),
    createOutput: () => new DingTalkOutputProvider(),
    matchesOutputUrl: (url) => /oapi\.dingtalk\.com/i.test(url),
  },
  {
    name: 'wechatwork',
    docs: {
      displayName: '企业微信 WeCom',
      homepage: 'https://developer.work.weixin.qq.com/',
      webhook: 'https://developer.work.weixin.qq.com/document/path/91770',
      messageFormats: [
        { type: 'text', reference: 'https://developer.work.weixin.qq.com/document/path/91770#%E6%96%87%E6%9C%AC%E7%B1%BB%E5%AE%A2%E6%88%B7%E7%AB%AF%E6%B6%88%E6%81%AF' },
        { type: 'markdown', reference: 'https://developer.work.weixin.qq.com/document/path/91770#%E9%BB%98%E8%AE%A4%E6%A0%BC%E5%BC%8F' },
      ],
      notes: '企业微信机器人消息与钉钉类似，支持 text/markdown 类型。',
    },
    createInput: () => new WeChatWorkInputProvider(),
    createOutput: () => new WeChatWorkOutputProvider(),
    matchesOutputUrl: (url) => /qyapi\.weixin\.qq\.com/i.test(url),
  },
  {
    name: 'raw',
    docs: {
      displayName: 'Raw JSON',
      homepage: 'https://developer.mozilla.org/docs/Web/HTTP',
      webhook: null,
      messageFormats: [{ type: 'raw', reference: null }],
      notes: '原始 JSON 透传，用于与外部系统直接交换结构化数据。',
    },
    createInput: () => new RawJsonInputProvider(),
    createOutput: () => new RawOutputProvider(),
  },
  {
    name: 'text',
    docs: {
      displayName: 'Plain Text',
      homepage: 'https://en.wikipedia.org/wiki/Plain_text',
      webhook: null,
      messageFormats: [{ type: 'text', reference: null }],
      notes: '通用文本输入，适配简单的监控/告警系统。',
    },
    createInput: () => new TextInputProvider(),
    createOutput: () => new TextOutputProvider(),
  },
  {
    name: 'generic',
    docs: {
      displayName: 'Generic HTTP',
      homepage: 'https://developer.mozilla.org/docs/Web/HTTP',
      webhook: null,
      messageFormats: [{ type: 'raw', reference: null }],
      notes: '通用 HTTP 输出，直接接收 Canonical v2 数据。',
    },
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

export function getProviderDocs(name) {
  const provider = getProvider(name);
  return provider?.docs || null;
}

export function listProviderDocs() {
  return PROVIDERS.map((provider) => ({ name: provider.name, docs: provider.docs }));
}
