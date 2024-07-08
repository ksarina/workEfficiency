import { getChannels } from './setting.js';
import { generalChannelId, getGeneralMessageTs, reportEmitter } from './generalReport.js';
import { getFormattedDate } from './utils.js';

export async function handleReportSubmission(client, { user, view }) {
  try {
    console.log('Received view:', JSON.stringify(view, null, 2));

    const values = view.state.values;
    const report = values.report_block.report_input.value;
    const userId = user.id;
    const userChannels = await getChannels(userId);

    const userInfo = await client.users.info({ user: userId });
    console.log("userInfo:", userInfo);
    const userName = userInfo.user.profile.display_name || userInfo.user.name;

    if (userChannels.length === 0) {
      console.error('No channels set for user:', userId);
      return;
    }

    // 全てのチャンネルに投稿
    const messagePromises = userChannels.map(async (channelId) => {
      const response = await client.chat.postMessage({
        channel: channelId,
        text: `${userName}さんの本日の稼働予定です。\n\n\`\`\`\n${report}\n\`\`\``
      });
      console.log(`チャンネル ${channelId} に送信しました✨`);
      return { channelId, ts: response.ts };
    });

    const messageResults = await Promise.all(messagePromises);

    const postToGeneralReport = async () => {
      const generalMessageTs = getGeneralMessageTs();
      console.log('generalChannelId:', generalChannelId);
      console.log('generalMessageTs:', generalMessageTs);

      if (generalChannelId && generalMessageTs) {
        const links = messageResults.map(result => 
          `<https://${process.env.SLACK_WORKSPACE}.slack.com/archives/${result.channelId}/p${result.ts.replace('.', '')}|View Message>`
        ).join(' / ');

        await client.chat.postMessage({
          channel: generalChannelId,
          thread_ts: generalMessageTs,
          text: `${userName}さんの稼働報告: ${links}`
        });
        console.log('全体報告に送信しました🎉');
      } else {
        console.log('全体報告の送信をスキップしました（generalChannelId または generalMessageTs が未設定）');
      }
    };

    // 全体報告のメッセージスレッドにリンクを追加
    if (getGeneralMessageTs()) {
      await postToGeneralReport();
    } else {
      reportEmitter.once('reportScheduled', async () => {
        await postToGeneralReport();
      });
    }

    const privateMetadata = JSON.parse(view.private_metadata);
    const { messageTs, channel } = privateMetadata;
    console.log('privateMetadata:', privateMetadata);
    console.log('messageTs:', messageTs);
    console.log('channel:', channel);

    const formattedDate = getFormattedDate();
    const messageText = `${formattedDate}の稼働報告をお願いいたします✨\n\n稼働報告を行いました🎉`;

    // ダイレクトメッセージ内のメッセージを更新
    const dmChannel = await client.conversations.open({ users: userId });
    if (!dmChannel.ok) {
      throw new Error(`Failed to open DM channel for user ${userId}`);
    }
    const dmChannelId = dmChannel.channel.id;
    console.log('dmChannel', dmChannel);
    console.log('dmChannelId', dmChannelId);
    
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: messageText,
        },
      },
    ];
    
    const result = await client.chat.update({
      channel: dmChannelId,
      ts: messageTs,
      text: messageText,
      blocks: blocks,
    });

    console.log('DMの書き換えが完了しました🎉:', result);

  } catch (error) {
    console.error('Error in handleReportSubmission:', error);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
  }
}
