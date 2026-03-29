/**
 * Slack notification helper for ARIA.
 * Sends completed ARIA results to a Slack channel via incoming webhook.
 * Set SLACK_WEBHOOK_URL in Convex environment variables to enable.
 */

export async function notifySlack({
  userMessage,
  result,
  sources = [],
  screenshots = [],
}: {
  userMessage: string;
  result: string;
  sources?: string[];
  screenshots?: string[];
}): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const blocks: any[] = [
    {
      type: "header",
      text: { type: "plain_text", text: "🌐 ARIA Intelligence Report" },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: `*Query:* ${userMessage}` },
    },
    { type: "divider" },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: result.length > 2900 ? result.substring(0, 2900) + "..." : result,
      },
    },
  ];

  if (sources.length > 0) {
    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: `📎 *Sources:* ${sources.join(" · ")}` },
      ],
    });
  }

  if (screenshots.length > 0) {
    blocks.push({
      type: "image",
      image_url: screenshots[screenshots.length - 1],
      alt_text: "Browser agent screenshot",
    });
  }

  blocks.push({
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `_${new Date().toISOString().replace("T", " ").substring(0, 19)} UTC · Powered by Browser Use Convex Component_`,
      },
    ],
  });

  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `ARIA: ${userMessage}`,
        blocks,
      }),
    });
  } catch (err) {
    console.error("[Slack] Notification failed:", err);
  }
}
