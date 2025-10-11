import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';

type Employee = {
  id: string;
  name: string;
  enabled: boolean;
  created_at: string;
};

export default function EmployeePoolScreen() {
  const [list, setList] = useState<Employee[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })
      .returns<Employee[]>();
    if (error) {
      Alert.alert('读取失败', error.message);
    } else {
      setList(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchEmployees();

    // Realtime 订阅
    const channel = supabase
      .channel('employees-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'employees' },
        () => fetchEmployees()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchEmployees]);

  const onAdd = async () => {
    const value = name.trim();
    if (!value) return;
    setSaving(true);
    const { error } = await supabase.from('employees').insert({ name: value, enabled: true });
    setSaving(false);
    if (error) {
      Alert.alert('新增失败', error.message);
    } else {
      setName('');
    }
  };

  const confirmDelete = (emp: Employee) => {
    Alert.alert('确认删除', `确定删除员工「${emp.name}」吗？此操作不可恢复。`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.from('employees').delete().eq('id', emp.id);
          if (error) {
            Alert.alert('删除失败', error.message);
          } else {
            // 立即从本地列表移除，提升响应速度（Realtime 也会同步回来）
            setList((prev) => prev.filter((it) => it.id !== emp.id));
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Employee }) => (
    <View style={styles.row}>
      <Text style={[styles.name, !item.enabled && styles.dim]}>{item.name}</Text>
      <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        <TouchableOpacity
          style={[styles.smallBtn, item.enabled ? styles.gray : styles.primary]}
          onPress={() => toggleEnabled(item)}
        >
          <Text style={styles.smallBtnText}>{item.enabled ? '停用' : '启用'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => confirmDelete(item)}
          style={styles.deleteBtn}
          accessibilityRole="button"
          accessibilityLabel={`删除 ${item.name}`}
        >
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>员工池（可删除版）</Text>

      <View style={styles.inputRow}>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="输入员工姓名"
          style={styles.input}
          placeholderTextColor="#999"
          // 防 iOS Safari 放大
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={[styles.btn, saving && { opacity: 0.6 }]} onPress={onAdd} disabled={saving}>
          <Text style={styles.btnText}>{saving ? '保存中…' : '添加'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          contentContainerStyle={{ paddingTop: 12 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FB', padding: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#173B88' },
  inputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16, // iOS Safari 防缩放
    borderWidth: 1,
    borderColor: '#e6e8ef',
  },
  btn: {
    backgroundColor: '#173B88',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  btnText: { color: '#fff', fontWeight: '600' },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef0f5',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, color: '#1f2937' },
  dim: { color: '#999' },
  smallBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  primary: { backgroundColor: '#173B88' },
  gray: { backgroundColor: '#6b7280' },
  deleteBtn: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    backgroundColor: '#fff',
  },
  deleteText: { color: '#ef4444', fontWeight: '700' },
});