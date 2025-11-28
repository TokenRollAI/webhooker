/**
 * 格式化器测试
 */

import { describe, it, expect } from 'vitest';
import { FeishuFormatter } from '../src/formatters/feishu';
import { DingtalkFormatter } from '../src/formatters/dingtalk';
import { DiscordFormatter } from '../src/formatters/discord';
import { TelegramFormatter } from '../src/formatters/telegram';
import { SlackFormatter } from '../src/formatters/slack';
import { createMessage, createGatewayEvent } from '../src/utils/message';
import type { TargetEndpoint, GatewayEvent } from '../src/core/types';

function createTestEvent(overrides: Partial<ReturnType<typeof createMessage>> = {}): GatewayEvent {
  const message = createMessage({
    body: 'Test message body',
    title: 'Test Title',
    level: 'info',
    ...overrides,
  });
  return createGatewayEvent(message, 'test');
}

describe('FeishuFormatter', () => {
  const formatter = new FeishuFormatter();
  const target: TargetEndpoint = { provider: 'feishu', token: 'test-token' };

  it('should format card message with title', () => {
    const event = createTestEvent();
    const result = formatter.format(event, target);

    expect(result.url).toContain('test-token');
    expect(result.method).toBe('POST');
    expect(result.body).toHaveProperty('msg_type', 'interactive');
    expect(result.body).toHaveProperty('card.header.title.content', 'Test Title');
  });

  it('should include markdown content in elements', () => {
    const event = createTestEvent({ body: '**Bold** text' });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.card.elements).toContainEqual(
      expect.objectContaining({ tag: 'markdown', content: '**Bold** text' })
    );
  });

});

describe('DingtalkFormatter', () => {
  const formatter = new DingtalkFormatter();
  const target: TargetEndpoint = { provider: 'dingtalk', token: 'test-token' };

  it('should format actionCard when title exists', () => {
    const event = createTestEvent();
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.msgtype).toBe('actionCard');
    expect(body.actionCard.title).toBe('Test Title');
  });

  it('should format markdown when no title', () => {
    const event = createTestEvent({ title: undefined });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.msgtype).toBe('markdown');
    expect(body.markdown.text).toContain('Test message body');
  });

  it('should include @mentions in markdown format', () => {
    // 不带 title 以触发 markdown 格式 (actionCard 不支持 @mentions)
    const event = createTestEvent({
      title: undefined,
      mentions: [
        { type: 'all' },
        { type: 'user', userId: 'user123' },
      ],
    });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.msgtype).toBe('markdown');
    expect(body.at.isAtAll).toBe(true);
    expect(body.at.atUserIds).toContain('user123');
  });
});

describe('DiscordFormatter', () => {
  const formatter = new DiscordFormatter();
  const target: TargetEndpoint = { provider: 'discord', token: '123456/abcdef' };

  it('should format embed message', () => {
    const event = createTestEvent({ level: 'error' });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.embeds).toHaveLength(1);
    expect(body.embeds[0].title).toBe('Test Title');
    expect(body.embeds[0].description).toBe('Test message body');
    expect(body.embeds[0].color).toBe(0xed4245); // Error color
  });

  it('should include fields in embed', () => {
    const event = createTestEvent({
      fields: [
        { label: 'Status', value: 'OK', short: true },
        { label: 'Time', value: '10s', short: true },
      ],
    });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.embeds[0].fields).toHaveLength(2);
    expect(body.embeds[0].fields[0].name).toBe('Status');
  });
});

describe('TelegramFormatter', () => {
  const formatter = new TelegramFormatter();
  const target: TargetEndpoint = { provider: 'telegram', token: 'BOT_TOKEN:CHAT_ID' };

  it('should format HTML message', () => {
    const event = createTestEvent();
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.parse_mode).toBe('HTML');
    expect(body.text).toContain('<b>Test Title</b>');
    expect(body.chat_id).toBe('CHAT_ID');
  });

  it('should include inline keyboard for actions', () => {
    const event = createTestEvent({
      actions: [
        { text: 'View', url: 'https://example.com', style: 'primary' },
      ],
    });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.reply_markup.inline_keyboard).toBeDefined();
    expect(body.reply_markup.inline_keyboard[0][0].text).toBe('View');
  });
});

describe('SlackFormatter', () => {
  const formatter = new SlackFormatter();
  const target: TargetEndpoint = { provider: 'slack', token: 'T.../B.../xxx' };

  it('should format blocks message', () => {
    const event = createTestEvent();
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.blocks).toBeDefined();
    expect(body.blocks).toContainEqual(
      expect.objectContaining({ type: 'header' })
    );
  });

  it('should include color attachment', () => {
    const event = createTestEvent({ level: 'warning' });
    const result = formatter.format(event, target);
    const body = result.body as any;

    expect(body.attachments).toBeDefined();
    expect(body.attachments[0].color).toBe('#daa038');
  });
});
