import { getChannels } from './setting.js';

export async function updateHomeTab(client, user) {
  try {
    console.log('updateHomeTab function called for user:', user);

    // ユーザーの設定済みチャンネルを取得
    const userChannels = getChannels(user);

    // チャンネル名を取得
    let currentChannels = 'なし';
    if (userChannels.length > 0) {
      const channelInfo = await Promise.all(userChannels.map(channelId => 
        client.conversations.info({ channel: channelId })
      ));
      currentChannels = channelInfo
        .map(info => info.channel.name)
        .join('\n');
    }

    const blocks = [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🌐 設定',
          emoji: true,
        }
      },
      {
        type: 'divider'
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*📮 稼働報告*'
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `稼働報告は、以下チャンネルに投稿されます✨\n\n${currentChannels}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: '🐱 投稿するチャンネルを登録する'
            },
            action_id: 'setting'
          }
        ]
      },
    ];

    const result = await client.views.publish({
      user_id: user,
      view: {
        type: 'home',
        blocks: blocks
      }
    });
    console.log('appHomeタブに送信しました:', result);
  } catch (error) {
    console.error('アプリホームタブの表示でエラーが発生しました:', error);
  }
};
