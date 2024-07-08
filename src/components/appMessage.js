import { getFormattedDate } from './utils.js';

export async function postDailyReportMessage(client, user) {
  const formattedDate = getFormattedDate();
  const messageText = `${formattedDate}の稼働報告をお願いいたします✨`;

  try {
    const res = await client.conversations.open({ users: user });
    const channelId = res.channel.id;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: messageText,
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '📮稼働報告',
            },
            action_id: 'report_activity',
          },
        ],
      },
    ];

    const result = await client.chat.postMessage({
      channel: channelId,
      text: messageText,
      blocks: blocks,
    });

    console.log('DMに稼働報告を送信しました🎀:', result.ts);
    return result.ts;
  } catch (error) {
    console.error('Error posting daily report message:', error);
    throw error;
  }
}

export default postDailyReportMessage;
