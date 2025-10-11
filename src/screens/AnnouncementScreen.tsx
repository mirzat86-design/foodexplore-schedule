import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, FlatList, StyleSheet, ViewStyle } from 'react-native';
import { supabase } from '../lib/supabase';

type Announcement = {
  id: string;
  text: string | null;
  level: string | null;    // 'red' | 'orange' | 'green' | 'blue'
  type: string | null;     // 'announcement' | 'info'
  published: boolean;
  created_at: string;
  updated_at: string;
};

export default function AnnouncementScreen() {
  const [text, setText] = useState('');
  const [level, setLevel] = useState<'red' | 'orange' | 'green' | 'blue'>('green');
  const [type, setType] = useState<'announcement' | 'info'>('announcement');
  const [list, setList] = useState<Announcement[]>([]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) Alert.alert('读取失败', error.message);
    else setList((data ?? []) as Announcement[]);
  }, []);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('announcements-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

// helper for active dot style (cannot put functions inside StyleSheet.create)
const dotActiveStyle = (lv: 'red' | 'orange' | 'green' | 'blue'): ViewStyle => ({
  backgroundColor: lv === 'red' ? '#ef4444' : lv === 'orange' ? '#f59e0b' : lv === 'green' ? '#10b981' : '#3b82f6',
  borderColor: 'transparent',
});

  const insert = async (pub: boolean) => {
    if (!text.trim()) {
      Alert.alert('提示', '请填写内容');
      return;
    }
    setSaving(true);
    const payload = {
      text: text.trim(),
      level,
      type,
      published: pub,
    };
    const { error } = await supabase.from('announcements').insert(payload);
    setSaving(false);
    if (error) Alert.alert('提交失败', error.message);
    else setText('');
  };

  const confirmDelete = (id: string) => {
    Alert.alert('确认删除', '删除后将无法恢复，确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('announcements').delete().eq('id', id);
          if (error) {
            Alert.alert('删除失败', error.message);
          } else {
            // 立即更新本地列表以获得更快的反馈
            setList((prev) => prev.filter((it) => it.id !== id));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Announcement }) => (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <Text style={styles.cardTitle}>
          {item.type === 'info' ? '信息' : '公告'} · {item.level ?? 'green'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.badge, item.published ? styles.published : styles.draft]}>
            {item.published ? '已发布' : '草稿'}
          </Text>
          <TouchableOpacity
            onPress={() => confirmDelete(item.id)}
            style={styles.deleteBtn}
            accessibilityRole="button"
            accessibilityLabel="删除公告"
          >
            <Text style={styles.deleteText}>删除</Text>
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.cardText}>{item.text}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>新增公告或信息</Text>

      <View style={styles.row}>
        <TouchableOpacity style={[styles.tag, type === 'info' && styles.tagActive]} onPress={() => setType('info')}>
          <Text style={[styles.tagText, type === 'info' && styles.tagTextActive]}>信息</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tag, type === 'announcement' && styles.tagActive]} onPress={() => setType('announcement')}>
          <Text style={[styles.tagText, type === 'announcement' && styles.tagTextActive]}>公告</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        {(['red','orange','green','blue'] as const).map((lv) => (
          <TouchableOpacity key={lv} style={[styles.dot, level === lv && dotActiveStyle(lv)]} onPress={() => setLevel(lv)} />
        ))}
      </View>

      <TextInput
        multiline
        value={text}
        onChangeText={setText}
        placeholder="输入公告内容"
        style={styles.input}
        placeholderTextColor="#999"
        nativeID="announcement-text"
        autoComplete="off"
      />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity onPress={() => insert(false)} style={[styles.btn, styles.gray]} disabled={saving}>
          <Text style={styles.btnText}>{saving ? '保存中…' : '保存草稿'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => insert(true)} style={[styles.btn, styles.primary]} disabled={saving}>
          <Text style={styles.btnText}>{saving ? '发布中…' : '发布'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={list}
        keyExtractor={(it) => it.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 40 }}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#173B88' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  tag: { borderRadius: 999, borderWidth: 1, borderColor: '#d6d9e4', paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#fff' },
  tagActive: { backgroundColor: '#173B88', borderColor: '#173B88' },
  tagText: { color: '#173B88', fontWeight: '600' },
  tagTextActive: { color: '#fff' },
  dot: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#e5e7eb', borderWidth: 2, borderColor: '#d1d5db' },
  input: {
    minHeight: 90,
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16, // iOS Safari 防缩放
    lineHeight: 22,
    borderWidth: 1,
    borderColor: '#e6e8ef',
    marginBottom: 12,
  },
  btn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 12 },
  primary: { backgroundColor: '#173B88' },
  gray: { backgroundColor: '#6b7280' },
  btnText: { color: '#fff', fontWeight: '700' },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#eef0f5' },
  cardTitle: { fontSize: 14, color: '#374151', fontWeight: '600' },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, color: '#fff', fontSize: 12, overflow: 'hidden' },
  published: { backgroundColor: '#059669' },
  draft: { backgroundColor: '#9ca3af' },
  cardText: { marginTop: 6, color: '#1f2937', fontSize: 16, lineHeight: 22 },
  deleteBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ef4444', backgroundColor: '#fff' },
  deleteText: { color: '#ef4444', fontWeight: '700', fontSize: 12 },
});