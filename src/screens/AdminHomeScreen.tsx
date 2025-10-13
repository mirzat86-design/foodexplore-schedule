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
import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';

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

async function fetchAssignments(
  startISO: string,
  endISO: string
): Promise<Array<{ date: string; role: string; employee: string }>> {
  // 统一把可能用到的列都选出来（不存在的列不会报错，只是返回 null）
  const selectCols = [
    'date', 'work_date', 'shift_date', 'workDate', 'shiftDate', 'work_day', 'workday',
    'role', 'position', 'role_name', 'position_name', 'shift_role',
    'employee_name', 'name', 'employee', 'staff_name'
  ].join(',');

  // 仅使用实际存在的 work_date 字段做范围过滤，避免因不存在的 date 列报错
  const { data, error } = await supabase
    .from('schedule_assignments')
    .select(selectCols)
    .gte('work_date', startISO)
    .lte('work_date', endISO);

  if (error) {
    console.error('[exportSchedule] supabase error:', error.message);
    throw new Error(error.message);
  }

  // 归一化并按日期排序（在客户端排，不在数据库按可能不存在的列排）
  return (data ?? [])
    .map(normalizeRecord)
    .filter(r => r.date && r.role)
    .sort((a, b) => a.date.localeCompare(b.date));
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
  try {
    if (typeof window === 'undefined') return;

    // 优先使用 Blob + a[download]
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    // 某些浏览器需要延时再 revoke
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  } catch (err) {
    // 若 CSP 阻止 blob:，尝试 data: URI 作为回退
    try {
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
      window.open(dataUrl, '_blank');
    } catch (e) {
      console.error('download fallback failed', e);
      alert('下载被浏览器策略阻止，请在桌面浏览器尝试或联系管理员配置 CSP。');
    }
  }
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
// ---------------- UI: Admin Home ----------------
export default function AdminHomeScreen() {
  // navigation is optional — if navigator not mounted, we won't crash
  const navigation: any = (() => {
    try { return useNavigation(); } catch { return null; }
  })();

  const [busy, setBusy] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  async function handle(action: () => Promise<void>) {
    try {
      setBusy(true);
      await action();
    } catch (e: any) {
      console.error('操作失败', e?.message || e);
      alert('导出失败：' + (e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>管理员</Text>
      <Text style={styles.subtitle}>请选择要管理的模块 / 导出排班表</Text>

      {/* 四个主入口按钮（经典布局）：排班表 / 公告 / 员工池 / 导出 */}
      <View style={styles.group}>
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation?.navigate?.('Schedule')}
          style={({ pressed }) => [styles.btn, styles.blueOutline, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>排班表编辑</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation?.navigate?.('Announcement')}
          style={({ pressed }) => [styles.btn, styles.orangeOutline, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>公告编辑</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => navigation?.navigate?.('EmployeePool')}
          style={({ pressed }) => [styles.btn, styles.blueOutline, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>员工池（增删员工）</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => setExportOpen(true)}
          style={({ pressed }) => [styles.btn, styles.green, pressed && styles.pressed]}
        >
          <Text style={styles.btnText}>排班导出</Text>
        </Pressable>
      </View>

      {/* 导出选项 Modal */}
      <Modal
        transparent
        visible={exportOpen}
        animationType="fade"
        onRequestClose={() => setExportOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <Text style={styles.modalTitle}>选择导出范围</Text>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={async () => { setExportOpen(false); await handle(exportScheduleCsvForWeek); }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionText}>按本周导出（CSV）</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={async () => { setExportOpen(false); await handle(exportScheduleCsvForMonth); }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionText}>按本月导出（CSV）</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              disabled={busy}
              onPress={() => { setExportOpen(false); alert('自定义日期范围导出将很快提供'); }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionText}>自定义日期范围（即将可用）</Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setExportOpen(false)}
              style={({ pressed }) => [styles.optionCancel, pressed && styles.pressed]}
            >
              <Text style={styles.optionCancelText}>取消</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f7f9fc',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#667085',
    marginBottom: 16,
  },
  group: {
    gap: 12,
    marginBottom: 20,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  blue: { backgroundColor: '#1e40af' },
  orange: { backgroundColor: '#ea580c' },
  green: { backgroundColor: '#16a34a' },
  blueOutline: { backgroundColor: '#3b82f6' },
  orangeOutline: { backgroundColor: '#fb923c' },
  pressed: { opacity: 0.85 }
  ,
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSheet: {
    width: '86%',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
    color: '#111827',
  },
  option: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#1e40af',
    alignItems: 'center',
    marginTop: 8,
  },
  optionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
  },
  optionCancel: {
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    marginTop: 12,
  },
  optionCancelText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
  }
});