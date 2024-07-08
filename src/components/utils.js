import { DateTime } from "luxon";

export function getFormattedDate() {
  const now = DateTime.now().setZone('Asia/Tokyo');
  const days = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  const day = days[now.weekday - 1];
  const date = now.day;
  const month = months[now.month - 1];

  return `${month} ${date}日 ${day}`;
}