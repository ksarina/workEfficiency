import schedule from 'node-schedule';
import { getFormattedDate } from './utils.js';
import { EventEmitter } from 'events';

const generalChannelId = 'C04GLB9K6HH';
let generalMessageTs;

const reportEmitter = new EventEmitter();

function scheduleReport(app) {
  const rule = new schedule.RecurrenceRule();
  rule.tz = 'Asia/Tokyo';
  rule.hour = 15;
  rule.minute = 56;

  schedule.scheduleJob(rule, async function() {
    const formattedDate = getFormattedDate();
    const messageText = `おはようございます🌞\n${formattedDate}の全体報告スレッドです📝\n今日も一日よろしくお願いします✨`;

    try {
      const result = await app.client.chat.postMessage({
        channel: generalChannelId,
        text: messageText
      });
      generalMessageTs = result.ts;
      console.log('全体報告を開始しました✨:', result.ts);
      reportEmitter.emit('reportScheduled', generalMessageTs);
    } catch (error) {
      console.error('Error message:', error);
    }
  });
};

function getGeneralMessageTs() {
  return generalMessageTs;
}

export default scheduleReport;
export { generalChannelId, getGeneralMessageTs, reportEmitter };
