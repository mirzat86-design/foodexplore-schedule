// utils/exportSchedule.ts
// CSV export utilities for FoodExplore
// NOTE: This module intentionally contains only **utility functions** (no React components)

// --- Types (adjust as needed to match your data model) ---
export type ShiftRecord = {
  id: string;
  date: string;      // ISO date, e.g. "2025-10-14"
  employee: string;  // display name
  role?: string;     // optional role
  start: string;     // e.g. "09:00"
  end: string;       // e.g. "17:00"
  location?: string; // optional
  notes?: string;    // optional
};

// --- CSV helpers ---
function toCsvValue(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // escape double quotes and wrap if needed
  const needsWrap = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsWrap ? `"${escaped}"` : escaped;
}

function recordsToCsv(rows: ShiftRecord[]): string {
  const header = [
    'Date',
    'Employee',
    'Role',
    'Start',
    'End',
    'Location',
    'Notes',
  ];
  const lines = [header.map(toCsvValue).join(',')];
  for (const r of rows) {
    lines.push([
      r.date,
      r.employee,
      r.role ?? '',
      r.start,
      r.end,
      r.location ?? '',
      r.notes ?? '',
    ].map(toCsvValue).join(','));
  }
  return lines.join('\n');
}

function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekNumber(d: Date): { year: number; week: number } {
  // ISO week (Mon-Sun)
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7; // Mon=0
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3); // Thursday of this week
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((tmp.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return { year: tmp.getUTCFullYear(), week };
}

// --- File saving (Web-first; native shows a friendly message) ---
function saveCsvFile(filename: string, csv: string): void {
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // In a pure native RN environment without a sharing library available
    // we avoid crashing and surface a clear message via console.
    // Integrate with Expo Sharing or react-native-fs in your native layer.
    // eslint-disable-next-line no-console
    console.warn('[exportSchedule] Native download not implemented. Integrate Expo Sharing or RNFS.');
  }
}

// --- Data hooks ---
// These hooks are intentionally simple. Your app can replace the `fetch*`
// functions with real implementations (e.g., Supabase queries) while keeping
// the export surface stable.

// Placeholders: return empty arrays so the button still downloads a valid CSV.
async function fetchScheduleForRange(_start: Date, _end: Date): Promise<ShiftRecord[]> {
  // TODO: Replace with real data fetch (e.g., Supabase) and map into ShiftRecord
  return [];
}

// --- Public API ---
export async function exportScheduleCsvForWeek(anyDateInWeek: Date): Promise<void> {
  const { year, week } = getWeekNumber(anyDateInWeek);
  // Compute Monday and Sunday of this ISO week
  const day = new Date(anyDateInWeek);
  const dayNum = (day.getDay() + 6) % 7; // Mon=0
  const monday = new Date(day);
  monday.setDate(day.getDate() - dayNum);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const rows = await fetchScheduleForRange(monday, sunday);
  const csv = recordsToCsv(rows);
  const filename = `schedule-week-${year}-W${String(week).padStart(2, '0')}.csv`;
  saveCsvFile(filename, csv);
}

export async function exportScheduleCsvForMonth(anyDateInMonth: Date): Promise<void> {
  const y = anyDateInMonth.getFullYear();
  const m = anyDateInMonth.getMonth();
  const start = new Date(y, m, 1);
  const end = new Date(y, m + 1, 0);
  const rows = await fetchScheduleForRange(start, end);
  const csv = recordsToCsv(rows);
  const filename = `schedule-month-${y}-${String(m + 1).padStart(2, '0')}.csv`;
  saveCsvFile(filename, csv);
}

export async function exportScheduleCsvForRange(start: Date, end: Date): Promise<void> {
  const rows = await fetchScheduleForRange(start, end);
  const csv = recordsToCsv(rows);
  const filename = `schedule-${formatYmd(start)}_to_${formatYmd(end)}.csv`;
  saveCsvFile(filename, csv);
}