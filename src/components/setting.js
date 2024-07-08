import fs from 'fs/promises';
import EventEmitter from 'events';

export const settingsEmitter = new EventEmitter();

const SETTINGS_FILE_PATH = './channel_settings.json';

let settings = { channels: {} };

export async function initializeSettings() {
  settings = await loadSettings();
}

// 設定を永続化する関数
async function saveSettings(settings) {
  try {
    await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
    console.log('Settings saved successfully');
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

// 設定を読み込む関数
async function loadSettings() {
  try {
    const fileExists = await fs.access(SETTINGS_FILE_PATH).then(() => true).catch(() => false);
    if (fileExists) {
      const data = await fs.readFile(SETTINGS_FILE_PATH, 'utf8');
      if (data.trim() === '') {
        return { channels: {} };
      }
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error loading settings:', error);
  }
  return { channels: {} };
}

export async function openSettings(client, trigger_id, user_id) {
  console.log('Received user_id:', user_id);

  try {
    const result = await client.conversations.list({
      types: 'public_channel,private_channel'
    });

    const channelOptions = result.channels.map(channel => ({
      text: {
        type: 'plain_text',
        text: channel.name
      },
      value: channel.id
    }));

    const userChannels = settings.channels[user_id] || [];

    const currentChannels = result.channels
      .filter(channel => userChannels.includes(channel.id))
      .map(channel => channel.name)
      .join('\n');

    const initialOptions = channelOptions.filter(option => userChannels.includes(option.value));

    console.log('currentChannels:', currentChannels);
    console.log('initialOptions:', initialOptions);

    const view = {
      type: 'modal',
      callback_id: 'submit_setting',
      title: {
        type: 'plain_text',
        text: '🐱設定'
      },
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*現在投稿設定されているチャンネル*\n' + (currentChannels || 'なし')
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'input',
          block_id: 'channel_select_block',
          element: {
            type: 'multi_static_select',
            action_id: 'channel_select',
            placeholder: {
              type: 'plain_text',
              text: 'チャンネルを選択'
            },
            options: channelOptions,
            ...(initialOptions.length > 0 ? { initial_options: initialOptions } : {})
          },
          label: {
            type: 'plain_text',
            text: '稼働報告を送信するチャンネルを選択する'
          }
        }
      ],
      close: {
        type: 'plain_text',
        text: 'Cancel'
      },
      submit: {
        type: 'plain_text',
        text: 'Submit'
      }
    };

    await client.views.open({
      trigger_id: trigger_id,
      view: view
    });
  } catch (error) {
    console.error('Error opening settings:', error);
    if (error.data) {
      console.error('Error details:', JSON.stringify(error.data, null, 2));
    }
  }
}

export async function handleSettingSubmission(view, user_id) {
  const selectedChannels = view.state.values.channel_select_block.channel_select.selected_options.map(option => option.value);
  
  settings.channels[user_id] = selectedChannels;
  
  try {
    await saveSettings(settings);
    console.log(`Updated settings for user ${user_id}:`, selectedChannels);

    // 設定完了イベントを発行
    settingsEmitter.emit('settingsUpdated', user_id, selectedChannels);
  } catch (error) {
    console.error(`Failed to save settings for user ${user_id}:`, error);
  }
}

export function getChannels(user_id) {
  return settings.channels[user_id] || [];
}
