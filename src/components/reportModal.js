import { getChannels } from './setting.js';

export async function openForm(client, trigger_id, message) {
  try {
    const result = await client.views.open({
      trigger_id: trigger_id,
      view: {
        type: 'modal',
        callback_id: 'submit_report',
        private_metadata: JSON.stringify({ messageTs: message.ts, channel: message.channel }),
        title: {
          type: 'plain_text',
          text: '稼働報告の入力'
        },
        close: {
          type: 'plain_text',
          text: 'Cancel'
        },
        submit: {
          type: 'plain_text',
          text: 'Submit'
        },
        blocks: [
          {
            type: 'input',
            block_id: 'report_block',
            element: {
              type: 'plain_text_input',
              action_id: 'report_input',
              multiline: true,
              placeholder: {
                type: 'plain_text',
                text: '内容を入力する'
              }
            },
            label: {
              type: 'plain_text',
              text: '稼働報告を入力してください。'
            }
          }
        ]
      }
    });
    console.log('Form opened successfully:', result);
  } catch (error) {
    console.error('Error opening form:', error);
    if (error.data && error.data.error === 'expired_trigger_id') {
      // ユーザーにエラーメッセージを送信する
      try {
        await client.chat.postMessage({
          channel: message.channel,
          text: "申し訳ありません。フォームを開くのに時間がかかりすぎました。もう一度お試しください。"
        });
      } catch (postError) {
        console.error('Error sending error message to user:', postError);
      }
    }
  }
}
