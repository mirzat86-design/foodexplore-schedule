import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useSchedule } from '../context/ScheduleContext';
import type { Announcement, AnnouncementLevel } from '../context/ScheduleContext';

const levelBg: Record<AnnouncementLevel, string> = {
  red: '#FDE7E9',
  orange: '#FFF4E5',
  green: '#E8F5E9',
  blue: '#E8F0FE',
};
const levelLabel: Record<AnnouncementLevel, string> = {
  red: '重要',
  orange: '提示',
  green: '信息',
  blue: '普通',
};
const levelDotColor: Record<AnnouncementLevel, string> = {
  red: '#E53935',
  orange: '#FB8C00',
  green: '#43A047',
  blue: '#1E88E5',
};

export default function AnnouncementScreen() {
  const { announcements, addAnnouncement, updateAnnouncement, toggleAnnouncementPublish, removeAnnouncement } = useSchedule();

  const [text, setText] = useState('');
  const [level, setLevel] = useState<AnnouncementLevel>('blue');
  const [type, setType] = useState<'info' | 'announcement'>('info');

  const onAdd = () => {
    if (!text.trim()) return;
    addAnnouncement({
      text: text.trim(),
      type,
      level: type === 'announcement' ? level : 'green',
      published: false,
    });
    setText('');
    setLevel('blue');
    setType('info');
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={[styles.card, { backgroundColor: levelBg[item.level] }]}> 
      <Text style={styles.badge}>{levelLabel[item.level]} {item.published ? '' : '（未上架）'}</Text>
      <TextInput
        style={styles.msg}
        value={item.text}
        onChangeText={(v) => updateAnnouncement(item.id, { text: v })}
        multiline
      />
      <View style={styles.row}>
        <View style={styles.levelRow}>
          {(['red','orange','green','blue'] as AnnouncementLevel[]).map((l) => (
            <TouchableOpacity
              key={l}
              style={[
                styles.levelDot,
                {
                  borderColor: item.level === l ? '#173B88' : '#999',
                  backgroundColor: levelDotColor[l],
                  opacity: item.level === l ? 1 : 0.3,
                },
              ]}
              onPress={() => updateAnnouncement(item.id, { level: l })}
            />
          ))}
        </View>

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={[styles.btn, item.published ? styles.gray : styles.primary]} onPress={() => toggleAnnouncementPublish(item.id, !item.published)}>
            <Text style={styles.btnText}>{item.published ? '下架' : '上架'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.danger]} onPress={() => removeAnnouncement(item.id)}>
            <Text style={styles.btnText}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* 新建 */}
      <View style={styles.newBox}>
        <Text style={styles.title}>新增公告或信息</Text>

        {/* 类型选择 */}
        <View style={styles.row}>
          <Text style={styles.label}>类型：</Text>
          {(['info', 'announcement'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeBtn, type === t && styles.typeBtnActive]}
              onPress={() => setType(t)}
            >
              <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                {t === 'info' ? '信息' : '公告'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* 仅当公告类型时显示等级 */}
        {type === 'announcement' && (
          <View style={styles.levelRow}>
            {(['red', 'orange', 'blue'] as AnnouncementLevel[]).map((l) => (
              <TouchableOpacity
                key={l}
                style={[
                  styles.levelDot,
                  {
                    borderColor: level === l ? '#173B88' : '#999',
                    backgroundColor: levelDotColor[l],
                    opacity: level === l ? 1 : 0.3,
                  },
                ]}
                onPress={() => setLevel(l)}
              />
            ))}
          </View>
        )}

        <TextInput
          placeholder={type === 'announcement' ? '输入公告内容' : '输入信息内容'}
          value={text}
          onChangeText={setText}
          style={styles.input}
          multiline
        />

        {/* 操作按钮 */}
        <View style={styles.row}>
          <TouchableOpacity style={[styles.btn, styles.gray]} onPress={onAdd}>
            <Text style={styles.btnText}>保存草稿</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.primary]} onPress={onAdd}>
            <Text style={styles.btnText}>发布</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 列表 */}
      <FlatList<Announcement>
        data={announcements}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 40 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  newBox: { marginBottom: 16, padding: 12, borderRadius: 12, backgroundColor: '#F3F6FF' },
  title: { fontSize: 16, fontWeight: '700', color: '#173B88', marginBottom: 8 },
  input: {
    minHeight: 60,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#fff',
    marginTop: 8,
    fontSize: 18,
    lineHeight: 22,
  },
  btn: { height: 40, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnText: { color: '#fff', fontWeight: '700' },
  primary: { backgroundColor: '#173B88' },
  danger: { backgroundColor: '#E53935' },
  gray: { backgroundColor: '#6B7280' },

  card: { borderRadius: 12, padding: 12, marginBottom: 12 },
  badge: { fontSize: 12, color: '#173B88', fontWeight: '700' },
  msg: {
    marginTop: 6,
    fontSize: 18,
    lineHeight: 22,
    color: '#111',
    padding: 6,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  row: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelDot: { width: 18, height: 18, borderRadius: 9, borderWidth: 2 },

  label: { fontSize: 14, fontWeight: '600', color: '#173B88' },
  typeBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: '#ccc', marginRight: 8 },
  typeBtnActive: { borderColor: '#173B88', backgroundColor: '#E8F0FE' },
  typeText: { color: '#555', fontSize: 14 },
  typeTextActive: { color: '#173B88', fontWeight: '700' },
});