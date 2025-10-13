

/**
 * utils/exportSchedule.ts
 *
 * 导出「岗位 × 日期」的周排班 CSV（方案A）。
 * - 行：岗位（Position）
 * - 列：一周内每天（Mon..Sun）
 * - 单元格：当日该岗位的员工姓名，用逗号分隔。
 */

import { supabase } from '../src/lib/supabase';

export type Assignment = {
  id?: string;
  position_key: string; // e.g. 'sushi', 'grill'
  work_date: string; // 'YYYY-MM-DD'
  employee_name: string; // '张三'
};

export type Position = {
  key: string;
  name: string;
};

/** 计算某日期所在周的周一 ~ 周日（ISO 周，周一为一周第一天） */
export function getIsoWeekRange(base = new Date()): { start: Date; end: Date; days: Date[] } {
  const d = new Date(base);
  // 将时间归零（避免时区影响）
  d.setHours(0, 0, 0, 0);
  // JS 的 getDay: 0=Sun,1=Mon,...6=Sat，我们需要 ISO 周（Mon 开始）
  const day = d.getDay();
  const diffToMonday = (day + 6) % 7; // Mon→0, Tue→1, ... Sun→6
  const start = new Date(d);
  start.setDate(d.getDate() - diffToMonday);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const x = new Date(start);
    x.setDate(start.getDate() + i);
    days.push(x);
  }
  const end = new Date(days[6]);
  return { start, end, days };
}

/** 将 Date 转为 'YYYY-MM-DD' */
export function toYMD(dt: Date): string {
  const y = dt.getFullYear();
  const m = `${dt.getMonth() + 1}`.padStart(2, '0');
  const d = `${dt.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 计算某日期所在月的第一天和最后一天（闭区间） */
export function getMonthRange(base = new Date()): { start: Date; end: Date; days: Date[] } {
  const d = new Date(base);
  d.setHours(0, 0, 0, 0);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0); // 当月最后一天
  const days: Date[] = [];
  for (let x = new Date(start); x <= end; x.setDate(x.getDate() + 1)) {
    days.push(new Date(x));
  }
  return { start, end, days };
}
/**
 * 拉取任意日期范围内的 assignments & positions（闭区间）
 */
export async function fetchRangeData(
  startDate: Date,
  endDate: Date
): Promise<{ days: string[]; assignments: Assignment[]; positions: Position[] }> {
  const days: string[] = [];
  const s = new Date(startDate);
  const e = new Date(endDate);
  s.setHours(0, 0, 0, 0);
  e.setHours(0, 0, 0, 0);
  for (let x = new Date(s); x <= e; x.setDate(x.getDate() + 1)) {
    days.push(toYMD(x));
  }
  const from = days[0];
  const to = days[days.length - 1];

  const { data: assigns, error: aErr } = await supabase
    .from('schedule_assignments')
    .select('id, position_key, work_date, employee_name')
    .gte('work_date', from)
    .lte('work_date', to)
    .order('work_date', { ascending: true });
  if (aErr) throw aErr;

  const { data: pos, error: pErr } = await supabase
    .from('positions')
    .select('key,name');

  let positions: Position[] = [];
  if (pErr || !pos) {
    const uniq = Array.from(new Set((assigns ?? []).map((x) => x.position_key)));
    positions = uniq.map((key) => ({ key, name: key }));
  } else {
    positions = pos as Position[];
  }

  return {
    days,
    assignments: (assigns ?? []) as Assignment[],
    positions,
  };
}

/**
 * 拉取一周内的 assignments & positions
 */
export async function fetchWeekData(
  weekStart?: Date
): Promise<{ days: string[]; assignments: Assignment[]; positions: Position[] }> {
  const { start, days } = getIsoWeekRange(weekStart);
  const dayStrings = days.map(toYMD);
  const from = dayStrings[0];
  const to = dayStrings[dayStrings.length - 1];

  // 1) assignments
  const { data: assigns, error: aErr } = await supabase
    .from('schedule_assignments')
    .select('id, position_key, work_date, employee_name')
    .gte('work_date', from)
    .lte('work_date', to)
    .order('work_date', { ascending: true });

  if (aErr) throw aErr;

  // 2) positions（可选：如果没有 positions 表，则从 assignments 推导）
  const { data: pos, error: pErr } = await supabase
    .from('positions')
    .select('key,name');

  let positions: Position[] = [];
  if (pErr || !pos) {
    // 回退：从 assignments 中推导唯一 position_key
    const uniq = Array.from(new Set((assigns ?? []).map((x) => x.position_key)));
    positions = uniq.map((key) => ({ key, name: key }));
  } else {
    positions = pos as Position[];
  }

  return {
    days: dayStrings,
    assignments: (assigns ?? []) as Assignment[],
    positions,
  };
}

/**
 * 构造 CSV 文本（以逗号分隔，包含表头）
 */
export function buildCsv(
  positions: Position[],
  days: string[],
  assignments: Assignment[]
): string {
  // 表头：['岗位', 'YYYY-MM-DD(周X)', ...]
  const weekdayMap = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const header = ['岗位', ...days.map((d) => {
    const dt = new Date(d + 'T00:00:00');
    return `${d}(${weekdayMap[dt.getDay()]})`;
  })];

  const rows: string[][] = [];
  for (const p of positions) {
    const row: string[] = [p.name || p.key];
    for (const day of days) {
      const list = assignments
        .filter((a) => a.position_key === p.key && a.work_date === day)
        .map((a) => a.employee_name)
        .filter(Boolean);
      row.push(list.join('、'));
    }
    rows.push(row);
  }

  // CSV 拼接（简单处理，遇到逗号或引号时加双引号）
  const esc = (s: string) => {
    if (s == null) return '';
    const needQuote = /[",\n]/.test(s);
    const t = s.replace(/"/g, '""');
    return needQuote ? `"${t}"` : t;
  };

  const lines = [header, ...rows].map((cols) => cols.map(esc).join(','));
  return lines.join('\n');
}

/**
 * 在 Web 端触发下载
 */
export function triggerDownload(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  if (typeof window === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * 对外暴露：导出本周（或指定周）岗位×日期 CSV
 */
export async function exportScheduleCsvForWeek(baseDate?: Date) {
  const { days, assignments, positions } = await fetchWeekData(baseDate);
  const csv = buildCsv(positions, days, assignments);
  const start = days[0];
  const end = days[days.length - 1];
  const filename = `排班表_岗位×日期_${start}_to_${end}.csv`;
  triggerDownload(filename, csv);
}

/**
 * 导出自定义日期范围（岗位×日期）CSV
 */
export async function exportScheduleCsvForRange(startDate: Date, endDate: Date) {
  const { days, assignments, positions } = await fetchRangeData(startDate, endDate);
  const csv = buildCsv(positions, days, assignments);
  const filename = `排班表_岗位×日期_${toYMD(startDate)}_to_${toYMD(endDate)}.csv`;
  triggerDownload(filename, csv);
}

/**
 * 导出本月（岗位×日期）CSV
 */
export async function exportScheduleCsvForMonth(baseDate?: Date) {
  const { start, end } = getMonthRange(baseDate);
  return exportScheduleCsvForRange(start, end);
}

export default exportScheduleCsvForWeek;
export { getIsoWeekRange, getMonthRange };