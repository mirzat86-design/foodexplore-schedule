/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Export schedule (方案B：行=日期, 列=岗位) 为 CSV。
 * - 行：日期（YYYY-MM-DD）
 * - 列：各岗位（同一天同岗位多名员工用 " / " 连接）
 * - 支持导出：本周 / 本月 / 自定义日期范围
 *
 * 依赖：
 *   - Supabase 表：public.schedule_assignments（字段名尽量做了兼容）
 *     期望字段（任选其一，做了别名兼容）：
 *       - 日期：date | work_date | shift_date
 *       - 岗位：role | position | role_name
 *       - 员工：employee_name | name
 */

import { supabase } from '../lib/supabase';

// ---------- 公共导出方法（供 AdminHomeScreen 调用） ----------
export async function exportScheduleCsvForWeek(): Promise<void> {
  const today = new Date();
  const monday = startOfWeek(today);     // 周一
  const sunday = endOfWeek(today);       // 周日
  await exportScheduleCsvForRange(monday, sunday);
}

export async function exportScheduleCsvForMonth(): Promise<void> {
  const today = new Date();
  const first = startOfMonth(today);
  const last = endOfMonth(today);
  await exportScheduleCsvForRange(first, last);
}

export async function exportScheduleCsvForRange(start: Date, end: Date): Promise<void> {
  // 拉取数据
  const assignments = await fetchAssignments(dateToISO(start), dateToISO(end));

  // 透视成：行=日期，列=岗位
  const { rows, allRoles } = pivotByDateAndRole(assignments);

  // 生成 CSV
  const csv = buildCsv(rows, allRoles);

  // 触发下载
  const filename = `排班表_岗位x日期_${dateToISO(start)}_to_${dateToISO(end)}.csv`;
  triggerDownload(csv, filename);
}

// ---------- 数据获取 ----------
type RawAssignment = Record<string, any>;

function normalizeRecord(r: RawAssignment) {
  const dateStr: string =
    r.date || r.work_date || r.shift_date || r.workDate || r.shiftDate || r.workday || r.work_day;

  const role: string =
    r.role || r.position || r.role_name || r.position_name || r.shift_role;

  const empName: string =
    r.employee_name || r.name || r.employee || r.staff_name;

  return {
    date: (dateStr ? dateStr.slice(0, 10) : ''), // 统一 YYYY-MM-DD
    role: (role ?? '').toString(),
    employee: (empName ?? '').toString(),
  };
}

async function fetchAssignments(startISO: string, endISO: string): Promise<Array<{ date: string; role: string; employee: string }>> {
  // 最宽松的 select，尽量拿全字段；排序按日期
  const { data, error } = await supabase
    .from('schedule_assignments')
    .select('*')
    .gte('date', startISO) // 如果你的真实字段是 work_date/shift_date，下面 normalizeRecord 会兜底
    .lte('date', endISO)
    .order('date', { ascending: true });

  if (error) {
    console.error('[exportSchedule] supabase error:', error.message);
    throw new Error(error.message);
  }

  return (data ?? []).map(normalizeRecord).filter(r => r.date && r.role);
}

// ---------- 透视逻辑（日期 x 岗位） ----------
function pivotByDateAndRole(assignments: Array<{ date: string; role: string; employee: string }>) {
  // 收集所有岗位（列）
  const roleSet = new Set<string>();
  // 日期 -> 岗位 -> 员工数组
  const dateMap = new Map<string, Map<string, string[]>>();

  for (const a of assignments) {
    const d = a.date;
    const role = a.role?.trim();
    if (!d || !role) continue;

    roleSet.add(role);

    if (!dateMap.has(d)) dateMap.set(d, new Map());
    const byRole = dateMap.get(d)!;
    if (!byRole.has(role)) byRole.set(role, []);

    const emp = (a.employee ?? '').trim();
    if (emp) byRole.get(role)!.push(emp);
  }

  const allRoles = Array.from(roleSet).sort(localeCompareCN);

  // 生成每一行：{ 日期, 岗位1, 岗位2, ... }
  const rows: Array<Record<string, string>> = [];
  const allDates = Array.from(dateMap.keys()).sort();

  for (const d of allDates) {
    const obj: Record<string, string> = { 日期: d };
    const byRole = dateMap.get(d)!;
    for (const role of allRoles) {
      const emps = byRole.get(role) ?? [];
      obj[role] = emps.join(' / ');
    }
    rows.push(obj);
  }

  return { rows, allRoles };
}

// ---------- CSV ----------
function buildCsv(rows: Array<Record<string, string>>, roles: string[]): string {
  const headers = ['日期', ...roles];
  const lines: string[] = [];

  lines.push(toCsvLine(headers));
  for (const row of rows) {
    const arr = headers.map(h => row[h] ?? '');
    lines.push(toCsvLine(arr));
  }
  return lines.join('\r\n');
}

function toCsvLine(arr: string[]): string {
  return arr.map(escapeCsvCell).join(',');
}

function escapeCsvCell(v: string): string {
  if (v == null) return '';
  const str = String(v);
  // 若包含逗号/引号/换行，需用双引号包裹，并转义引号为两个引号
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

// ---------- 日期工具 ----------
function dateToISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfWeek(d: Date): Date {
  const tmp = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const day = (tmp.getDay() + 6) % 7; // 周一=0
  tmp.setDate(tmp.getDate() - day);
  return tmp;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(e.getDate() + 6);
  return e;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

// 中文优先的排序（岗位名更自然）
function localeCompareCN(a: string, b: string) {
  return a.localeCompare(b, 'zh-Hans-CN');
}