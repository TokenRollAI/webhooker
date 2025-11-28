/**
 * 解析器测试
 */

import { describe, it, expect } from 'vitest';
import { SlackParser } from '../src/parsers/slack';
import { FeishuParser } from '../src/parsers/feishu';
import { DingtalkParser } from '../src/parsers/dingtalk';
import { GenericParser } from '../src/parsers/generic';
import { RawParser } from '../src/parsers/raw';
import { TextParser } from '../src/parsers/text';

describe('SlackParser', () => {
  const parser = new SlackParser();

  it('should parse simple text message', () => {
    const payload = { text: 'Hello World' };
    const event = parser.parse(payload);

    expect(event.message.body).toBe('Hello World');
    expect(event.metadata.source).toBe('slack');
  });

  it('should parse attachments with title and color', () => {
    const payload = {
      attachments: [
        {
          color: 'good',
          title: 'Success',
          text: 'Deployment completed',
        },
      ],
    };
    const event = parser.parse(payload);

    expect(event.message.title).toBe('Success');
    expect(event.message.body).toBe('Deployment completed');
    expect(event.message.level).toBe('success');
  });

  it('should parse blocks with sections and fields', () => {
    const payload = {
      blocks: [
        {
          type: 'section',
          text: { type: 'mrkdwn', text: 'Main content' },
        },
        {
          type: 'section',
          fields: [
            { type: 'mrkdwn', text: 'Status: OK' },
            { type: 'mrkdwn', text: 'Time: 10s' },
          ],
        },
      ],
    };
    const event = parser.parse(payload);

    expect(event.message.body).toContain('Main content');
  });
});

describe('FeishuParser', () => {
  const parser = new FeishuParser();

  it('should parse text message', () => {
    const payload = {
      msg_type: 'text',
      content: { text: 'Hello from Feishu' },
    };
    const event = parser.parse(payload);

    expect(event.message.body).toBe('Hello from Feishu');
    expect(event.metadata.source).toBe('feishu');
  });

  it('should parse card message with header', () => {
    const payload = {
      msg_type: 'interactive',
      card: {
        header: {
          title: { content: 'Alert Title' },
          template: 'red',
        },
        elements: [
          { tag: 'markdown', content: '**Error**: Something went wrong' },
        ],
      },
    };
    const event = parser.parse(payload);

    expect(event.message.title).toBe('Alert Title');
    expect(event.message.level).toBe('error');
    expect(event.message.body).toContain('Error');
  });
});

describe('DingtalkParser', () => {
  const parser = new DingtalkParser();

  it('should parse text message', () => {
    const payload = {
      msgtype: 'text',
      text: { content: 'Hello from Dingtalk' },
    };
    const event = parser.parse(payload);

    expect(event.message.body).toBe('Hello from Dingtalk');
    expect(event.metadata.source).toBe('dingtalk');
  });

  it('should parse markdown message', () => {
    const payload = {
      msgtype: 'markdown',
      markdown: {
        title: 'Alert',
        text: '### Warning\nDisk usage is high',
      },
    };
    const event = parser.parse(payload);

    expect(event.message.title).toBe('Alert');
    expect(event.message.body).toContain('Disk usage');
  });

  it('should parse @mentions', () => {
    const payload = {
      msgtype: 'text',
      text: { content: 'Hello' },
      at: {
        isAtAll: true,
        atUserIds: ['user1', 'user2'],
      },
    };
    const event = parser.parse(payload);

    expect(event.message.mentions).toBeDefined();
    expect(event.message.mentions).toContainEqual({ type: 'all' });
    expect(event.message.mentions).toContainEqual({ type: 'user', userId: 'user1' });
  });
});

describe('GenericParser', () => {
  const parser = new GenericParser();

  it('should parse common message fields', () => {
    const payload = {
      message: 'Generic notification',
      level: 'warning',
      url: 'https://example.com',
    };
    const event = parser.parse(payload);

    expect(event.message.body).toBe('Generic notification');
    expect(event.message.level).toBe('warning');
    expect(event.message.link).toBe('https://example.com');
  });

  it('should extract fields from unknown keys', () => {
    const payload = {
      message: 'Test',
      custom_field: 'value1',
      another_field: 123,
    };
    const event = parser.parse(payload);

    expect(event.message.fields).toBeDefined();
    expect(event.message.fields).toContainEqual(
      expect.objectContaining({ label: 'Custom field', value: 'value1' })
    );
  });
});

describe('RawParser', () => {
  const parser = new RawParser();

  it('should stringify JSON payload as text message', () => {
    const payload = { any: 'data', nested: { value: 123 } };
    const event = parser.parse(payload);

    // RawParser 将 JSON 序列化为字符串，作为文本消息发送
    expect(event.message.body).toContain('"any": "data"');
    expect(event.message.body).toContain('"value": 123');
    expect(event.metadata.source).toBe('raw');
  });

  it('should preserve plain text', () => {
    const event = parser.parse('plain text input');

    expect(event.message.body).toBe('plain text input');
  });
});

describe('TextParser', () => {
  const parser = new TextParser();

  it('should parse plain text string', () => {
    const event = parser.parse('Simple text message');

    expect(event.message.body).toBe('Simple text message');
    expect(event.metadata.source).toBe('text');
  });

  it('should parse text from object', () => {
    const event = parser.parse({ message: 'Text from object' });

    expect(event.message.body).toBe('Text from object');
  });
});
