import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import dayjs from 'dayjs';
import { useSchedule } from '../context/ScheduleContext';
import { positions } from '../constants/positions'; // 用来把 positionKey 显示为中文岗位名

// 小工具：不区分大小写比较名字
const sameName = (a: string, b: string) =>
  a.trim().toLowerCase() === b.trim().toLowerCase();

// 公告/信息颜色映射（保持与 AnnouncementScreen 保存时的 level 一致）
const levelColors: Record<'red' | 'orange' | 'blue' | 'green', { bg: string; text: string; border: string }> = {
  red:    { bg: '#FDE7E9', text: '#B71C1C', border: '#F8B4B7' },   // critical
  orange: { bg: '#FFF4E5', text: '#8C3A00', border: '#FFD8B2' },   // warning
  blue:   { bg: '#E8F0FE', text: '#0D47A1', border: '#C5D7FF' },   // normal (公告-蓝)
  green:  { bg: '#E8F5E9', text: '#1B5E20', border: '#BDE5C6' },   // info (信息-绿)
};

export default function EmployeeMyScheduleScreen() {
  const { schedule, announcements } = useSchedule();

  // —— 顶部“语言占位”仅视觉，不改变任何文案（全局 header 仍然保留）
  const [lang, setLang] = useState<'nl' | 'zh'>('nl');

  const [name, setName] = useState('');
  const [date, setDate] = useState<string>(dayjs().format('YYYY-MM-DD'));

  // 计算：这个员工在哪些日期上过班（聚合所有岗位）
  const myMarked = useMemo(() => {
    if (!name.trim()) return {};
    const marked: Record<
      string,
      { marked?: boolean; dotColor?: string; selected?: boolean; selectedColor?: string }
    > = {};
    Object.entries(schedule).forEach(([posKey, days]) => {
      if (!days) return;
      Object.entries(days).forEach(([d, names]) => {
        if (Array.isArray(names) && names.some(n => sameName(n, name))) {
          // 用蓝色小点标记有班的日子
          marked[d] = { ...(marked[d] || {}), marked: true, dotColor: '#0EA5E9' };
        }
      });
    });
    return marked;
  }, [schedule, name]);

  // 当前选中日期，用绿色选中
  const markedDates = useMemo(() => {
    const base = (myMarked as any)[date] || {};
    return {
      ...myMarked,
      [date]: { ...base, selected: true, selectedColor: '#16A34A' },
    };
  }, [myMarked, date]);

  // 选中的日期，这个员工在哪些岗位上班、同事是谁
  const coworks = useMemo(() => {
    if (!name.trim()) return [];
    const list: { positionKey: string; positionName: string; mates: string[] }[] = [];
    Object.entries(schedule).forEach(([posKey, days]) => {
      const allNames: string[] = (days && (days as any)[date]) || [];
      if (!Array.isArray(allNames)) return;
      if (allNames.some(n => sameName(n, name))) {
        const mates = allNames.filter(n => !sameName(n, name));
        const pos = positions.find((p: { key: string; name: string }) => p.key === posKey);
        list.push({
          positionKey: posKey,
          positionName: pos ? pos.name : posKey,
          mates,
        });
      }
    });
    // 没有上班也给个空提示
    if (list.length === 0) {
      return [{ positionKey: '-', positionName: '（今天无排班）', mates: [] }];
    }
    return list;
  }, [schedule, name, date]);

  const onDayPress = (d: DateData) => setDate(d.dateString);

  // —— 员工端公告/信息：只显示已发布（published=true）
  //    你第二步里已加了 type/status 字段；这里主要用 level & published
  const visibleNotices = useMemo(() => {
    // 只取 published
    const pubs = (announcements || []).filter(a => a?.published);
    // 排序：红 > 橙 > 蓝 > 绿，然后按更新时间新到旧
    const priority = (lv?: string) => ({ red: 4, orange: 3, blue: 2, green: 1 } as any)[lv || 'green'] || 0;
    return pubs.sort((a: any, b: any) => {
      const p = priority(b.level) - priority(a.level);
      if (p !== 0) return p;
      const ta = (a.updatedAt ?? 0);
      const tb = (b.updatedAt ?? 0);
      return tb - ta;
    });
  }, [announcements]);

  return (
    <View style={styles.wrap}>
      {/* 顶部：标题 + 语言占位切换 */}
      <View style={styles.topBar}>
        <Text style={styles.title}>我的排班</Text>
        <View style={styles.langBox}>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'nl' && styles.langBtnActive]}
            onPress={() => setLang('nl')}
          >
            <Text style={[styles.langTxt, lang === 'nl' && styles.langTxtActive]}>NL</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, lang === 'zh' && styles.langBtnActive]}
            onPress={() => setLang('zh')}
          >
            <Text style={[styles.langTxt, lang === 'zh' && styles.langTxtActive]}>中文</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TextInput
        style={styles.input}
        placeholder="输入员工名（与管理员录入一致）"
        value={name}
        onChangeText={setName}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />

      <Calendar
        onDayPress={onDayPress}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#ef4444',
          arrowColor: '#173B88',
        }}
        style={styles.calendar}
      />

      {/* 同岗同事 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {dayjs(date).format('YYYY-MM-DD')} 同岗同事
        </Text>
        <FlatList
          data={coworks}
          keyExtractor={(item) => item.positionKey + item.positionName}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.posName}>{item.positionName}</Text>
              <Text style={styles.mates}>
                {item.mates.length > 0 ? item.mates.join('、') : '（仅你一人）'}
              </Text>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      </View>

      {/* 公告 & 信息（只显示已发布） */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>公告 & 信息</Text>
        <FlatList
          data={visibleNotices}
          keyExtractor={(it: any) => String(it.id)}
          renderItem={({ item }: any) => {
            const lv = (item.level ?? 'green') as 'red' | 'orange' | 'blue' | 'green';
            const palette = levelColors[lv] ?? levelColors.green;
            const badge =
              item.type === 'announcement'
                ? (lv === 'red' ? '公告·紧急' : lv === 'orange' ? '公告·提示' : '公告·普通')
                : '信息';

            return (
              <View style={[styles.noticeCard, { backgroundColor: palette.bg, borderColor: palette.border }]}>
                <View style={styles.noticeHeader}>
                  <Text style={[styles.noticeBadge, { color: palette.text }]}>{badge}</Text>
                  <Text style={styles.noticeTime}>
                    {item.updatedAt ? dayjs(item.updatedAt).format('YYYY-MM-DD HH:mm') : ''}
                  </Text>
                </View>
                {!!item.title && <Text style={styles.noticeTitle}>{item.title}</Text>}
                <Text style={styles.noticeText}>{item.text}</Text>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={{ color: '#6B7280' }}>（暂无公告或信息）</Text>}
          contentContainerStyle={{ paddingBottom: 24, gap: 10 }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff' },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 16 },
  title: { fontSize: 20, fontWeight: '800' },

  langBox: { flexDirection: 'row', gap: 8 },
  langBtn: { borderWidth: 1, borderColor: '#E5E7EB', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  langBtnActive: { backgroundColor: '#E8F0FE', borderColor: '#173B88' },
  langTxt: { fontSize: 12, color: '#4B5563' },
  langTxtActive: { color: '#173B88', fontWeight: '700' },

  input: {
    height: 44,
    marginHorizontal: 16,
    marginTop: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    fontSize: 18,
    lineHeight: 22,
  },
  calendar: { marginTop: 12 },

  section: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { fontWeight: '700', marginBottom: 8 },

  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 },
  posName: { fontWeight: '600', color: '#111827' },
  mates: { color: '#374151' },
  sep: { height: 1, backgroundColor: '#f3f4f6' },

  // 公告卡片
  noticeCard: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  noticeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  noticeBadge: { fontWeight: '800' },
  noticeTime: { color: '#6B7280', fontSize: 12 },
  noticeTitle: { fontWeight: '700', marginBottom: 4, color: '#111827' },
  noticeText: { color: '#111827' },
});