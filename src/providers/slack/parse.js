/** Slack parse utilities → Canonical v2 (provider-local) */
import { makeCanonicalV2 } from '../../core/canonical.js';

export function fromSlackPayload(payload) {
  const envelope = buildSlackEnvelope(payload);
  const { body, ext } = buildSlackBody(payload);
  const options = buildSlackOptions(payload);
  return makeCanonicalV2({ envelope, body, options, ext, originalFormat: 'slack', passthrough: false });
}

function buildSlackEnvelope(p) {
  const textSources = [];
  if (typeof p?.text === 'string') textSources.push(p.text);
  if (Array.isArray(p?.blocks)) {
    for (const b of p.blocks) {
      if (b?.text?.text) textSources.push(b.text.text);
      if (Array.isArray(b?.fields)) for (const f of b.fields) if (f?.text) textSources.push(f.text);
    }
  }
  const mentions = parseSlackMentions(textSources.join('\n'));
  return {
    provider: 'slack',
    routing: { channel: p?.channel, thread_ts: p?.thread_ts, reply_broadcast: !!p?.reply_broadcast },
    identity: { username: p?.username, icon: p?.icon_emoji ? { emoji: p.icon_emoji } : (p?.icon_url ? { url: p.icon_url } : undefined) },
    mentions,
    timestamp: Date.now(),
  };
}

function buildSlackBody(p) {
  const ext = { slack: {} };
  if (Array.isArray(p?.blocks) && p.blocks.length > 0) {
    ext.slack.blocks = p.blocks;
    return { body: { type: 'blocks', blocks: sanitizeSlackBlocks(p.blocks) }, ext };
  }
  if (Array.isArray(p?.attachments) && p.attachments.length > 0) {
    ext.slack.attachments = p.attachments;
    return { body: { type: 'attachments', attachments: p.attachments }, ext };
  }
  const text = (p?.text || '').trim();
  const isMrkdwn = p?.mrkdwn !== false;
  if (isMrkdwn) return { body: { type: 'markdown', text }, ext };
  return { body: { type: 'text', text }, ext };
}

function buildSlackOptions(p) {
  return { unfurl_links: !!p?.unfurl_links, unfurl_media: !!p?.unfurl_media };
}

function sanitizeSlackBlocks(blocks) {
  try { return blocks.map(b => ({ ...b })); } catch { return []; }
}

function parseSlackMentions(text) {
  const res = { users: [], groups: [], all: false };
  if (!text) return res;
  const userIds = [...text.matchAll(/<@([A-Z0-9]+)>/g)].map(m => m[1]);
  if (text.includes('<!channel>') || text.includes('<!here>') || text.includes('<!everyone>')) res.all = true;
  res.users = Array.from(new Set(userIds));
  res.groups = [];
  return res;
}

