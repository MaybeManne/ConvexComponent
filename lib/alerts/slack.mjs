// Slack Alerter — Webhook-based alerts for MERIDIAN
// Simple: just needs a SLACK_WEBHOOK_URL. No bot token, no OAuth.

export class SlackAlerter {
  constructor({ webhookUrl }) {
    this.webhookUrl = webhookUrl;
  }

  get isConfigured() {
    return !!this.webhookUrl;
  }

  /**
   * Send a message to Slack via incoming webhook.
   * @param {string} text - plain text fallback
   * @param {Array} blocks - Slack Block Kit blocks (optional)
   */
  async sendMessage(text, blocks = []) {
    if (!this.isConfigured) return false;
    try {
      const body = { text };
      if (blocks.length > 0) body.blocks = blocks;

      const res = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });

      if (!res.ok) {
        const err = await res.text().catch(() => '');
        console.error(`[Slack] Webhook failed (${res.status}): ${err.substring(0, 200)}`);
        return false;
      }
      return true;
    } catch (err) {
      console.error('[Slack] Send error:', err.message);
      return false;
    }
  }

  /**
   * Send an ARIA result to Slack — called when a browser agent task completes.
   * @param {string} userMessage - what the user asked
   * @param {string} result - the synthesized answer
   * @param {string[]} sources - list of sources consulted
   * @param {string[]} screenshots - screenshot URLs
   */
  async sendAriaResult({ userMessage, result, sources = [], screenshots = [] }) {
    if (!this.isConfigured) return false;

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🌐 ARIA Intelligence Report' },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Query:* ${userMessage}` },
      },
      { type: 'divider' },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: result.length > 2900 ? result.substring(0, 2900) + '...' : result,
        },
      },
    ];

    if (sources.length > 0) {
      blocks.push({
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `📎 *Sources:* ${sources.join(' · ')}` },
        ],
      });
    }

    if (screenshots.length > 0) {
      blocks.push({
        type: 'image',
        image_url: screenshots[screenshots.length - 1],
        alt_text: 'Browser agent screenshot',
      });
    }

    blocks.push({
      type: 'context',
      elements: [
        { type: 'mrkdwn', text: `_${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC · Powered by Browser Use Convex Component_` },
      ],
    });

    return this.sendMessage(`ARIA: ${userMessage}`, blocks);
  }

  /**
   * Send a MERIDIAN sweep alert to Slack.
   * Compatible with the evaluateAndAlert pattern used by Telegram/Discord.
   */
  async evaluateAndAlert(llmProvider, delta, memory) {
    if (!this.isConfigured) return false;
    if (!delta?.summary?.totalChanges) return false;
    if (delta.summary.criticalChanges === 0 && delta.summary.totalChanges < 3) return false;

    const direction = delta.summary.direction?.toUpperCase() || 'NEUTRAL';
    const emoji = { ESCALATION: '🔴', 'DE-ESCALATION': '🟢', NEUTRAL: '⚪' }[direction] || '⚪';

    const signals = [
      ...(delta.signals?.new || []).slice(0, 3),
      ...(delta.signals?.escalated || []).slice(0, 3),
    ];

    const signalText = signals.length > 0
      ? signals.map(s => `• ${s.label || s.key || s.reason || 'Signal change'}`).join('\n')
      : 'No individual signals above threshold';

    const blocks = [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${emoji} MERIDIAN Sweep Alert` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Direction:*\n${direction}` },
          { type: 'mrkdwn', text: `*Changes:*\n${delta.summary.totalChanges} total, ${delta.summary.criticalChanges} critical` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Signals:*\n${signalText}` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `_${new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC_` },
        ],
      },
    ];

    return this.sendMessage(`MERIDIAN ${direction}: ${delta.summary.totalChanges} changes, ${delta.summary.criticalChanges} critical`, blocks);
  }
}
