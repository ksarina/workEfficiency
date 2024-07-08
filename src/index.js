import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import pkg from '@slack/bolt';
import { updateHomeTab } from './components/appHome.js';
import { openForm as reportOpenForm } from './components/reportModal.js';
import { openSettings, handleSettingSubmission, initializeSettings, settingsEmitter } from './components/setting.js';
import { handleReportSubmission } from './components/transmission.js';
import scheduleReport from './components/generalReport.js';
import { postDailyReportMessage } from './components/appMessage.js';
import { exec } from 'child_process';

const { App } = pkg;
dotenv.config();

console.log('SLACK_BOT_TOKEN:', process.env.SLACK_BOT_TOKEN);
console.log('SLACK_APP_TOKEN:', process.env.SLACK_APP_TOKEN);
console.log('SLACK_SIGNING_SECRET:', process.env.SLACK_SIGNING_SECRET);

let app;

function createApp() {
  return new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN, 
    socketMode: true,
    signingSecret: process.env.SLACK_SIGNING_SECRET
  });
}

function setupEventHandlers(app) {
  app.event('app_home_opened', async ({ event, client }) => {
    console.log('app_home_opened event received for user:', event.user);
    await updateHomeTab(client, event.user);
  });

  app.event('reaction_added', async ({ event, client }) => {
    console.log('Reaction added event received:', event);
    if (event.reaction === '出勤') {
      console.log('出勤 reaction detected');
      const messageTs = await postDailyReportMessage(client, event.user);
      console.log('Message timestamp:', messageTs);
    }
  });

  app.action('report_activity', async ({ ack, body, client }) => {
    await ack();
    try {
      await reportOpenForm(client, body.trigger_id, body.message);
    } catch (error) {
      console.error('Error in report_activity action:', error);
    }
  });

  app.action('setting', async ({ ack, body, client }) => {
    await ack();
    await openSettings(client, body.trigger_id, body.user.id);
  });

  app.view('submit_report', async ({ ack, body, view, client }) => {
    await ack();
    await handleReportSubmission(client, { user: body.user, view });
  });

  app.view('submit_setting', async ({ ack, body, view, client }) => {
    await ack();
    await handleSettingSubmission(view, body.user.id);
  });
}

async function updateAllUserHomeTabs(client) {
  try {
    let cursor;
    do {
      const result = await client.users.list({
        cursor: cursor,
        limit: 100
      });

      for (const user of result.members) {
        if (!user.is_bot && !user.deleted && !user.is_app_user) {
          await updateHomeTab(client, user.id);
          console.log(`Updated home tab for user: ${user.name}`);
        }
      }

      cursor = result.response_metadata.next_cursor;
    } while (cursor);

    console.log('Finished updating home tabs for all users');
  } catch (error) {
    console.error('Error updating home tabs:', error);
  }
}

async function startApp() {
  app = createApp();
  setupEventHandlers(app);

  await initializeSettings();  // 設定を初期化
  await app.start();
  console.log('⚡️ Bolt app is running!');

  await updateAllUserHomeTabs(app.client);
  scheduleReport(app);
}

function restartApp() {
  console.log('Restarting the application...');
  if (app) {
    app.stop().then(() => {
      exec('npm start', (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return;
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
      });
    });
  }
}

// 設定更新イベントのリスナー
settingsEmitter.on('settingsUpdated', async (userId, channels) => {
  console.log(`Settings updated for user ${userId}:`, channels);
  await updateHomeTab(app.client, userId);
});

// アプリケーションの初回起動
startApp();

export { app };
