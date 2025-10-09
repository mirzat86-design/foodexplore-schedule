import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Switch,
  Alert,
  Keyboard,
} from 'react-native';
import { useSchedule } from '../context/ScheduleContext';

type Row = {
  id: string;
  name: string;
  enabled: boolean;
};

export default function EmployeePoolScreen() {
  const { employees, addEmployee, toggleEmployeeEnabled, removeEmployee } = useSchedule();

  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');

  const filtered: Row[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter(e => e.name.toLowerCase().includes(q));
  }, [employees, query]);

  const active = filtered.filter(e => e.enabled);
  const inactive = filtered.filter(e => !e.enabled);

  const onAdd = () => {
    const nm = newName.trim().replace(/\s+/g, ' ');
    if (!nm) return;
    addEmployee(nm);
    setNewName('');
    Keyboard.dismiss();
  };

  const onToggle = (id: string, next: boolean) => {
    toggleEmployeeEnabled(id, next);
  };

  const onDelete = (id: string, name: string) => {
    Alert.alert('删除员工', `确定删除 ${name} 吗？`, [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: () => removeEmployee(id) },
    ]);
  };

  const renderRow = ({ item }: { item: Row }) => (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, !item.enabled && { color: '#9CA3AF', textDecorationLine: 'line-through' }]}>
          {item.name}
        </Text>
        <Text style={[styles.badge, item.enabled ? styles.badgeOn : styles.badgeOff]}>
          {item.enabled ? '启用' : '停用'}
        </Text>
      </View>

      <View style={styles.rowRight}>
        <Switch
          value={item.enabled}
          onValueChange={(v) => onToggle(item.id, v)}
        />
        <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(item.id, item.name)}>
          <Text style={styles.delTxt}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>员工池</Text>

      {/* 新增 */}
      <View style={styles.addBox}>
        <TextInput
          placeholder="输入姓名后添加（自动去重，停用重启亦可）"
          value={newName}
          onChangeText={setNewName}
          style={styles.input}
          autoCapitalize="words"
          returnKeyType="done"
          onSubmitEditing={onAdd}
        />
        <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
          <Text style={styles.addTxt}>添加</Text>
        </TouchableOpacity>
      </View>

      {/* 搜索 */}
      <TextInput
        placeholder="搜索员工（按姓名）"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
        autoCapitalize="none"
        returnKeyType="search"
      />

      {/* 启用区 */}
      <Text style={styles.sectionTitle}>启用（{active.length}）</Text>
      <FlatList
        data={active}
        keyExtractor={(it) => it.id}
        renderItem={renderRow}
        ListEmptyComponent={<Text style={styles.empty}>（无）</Text>}
      />

      {/* 停用区 */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>停用（{inactive.length}）</Text>
      <FlatList
        data={inactive}
        keyExtractor={(it) => it.id}
        renderItem={renderRow}
        ListEmptyComponent={<Text style={styles.empty}>（无）</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 16, paddingTop: 56 },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8 },

  addBox: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    fontSize: 18,
    lineHeight: 22,
  },
  addBtn: {
    height: 44, paddingHorizontal: 16, backgroundColor: '#173B88',
    borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  addTxt: { color: '#fff', fontWeight: '700' },

  search: {
    height: 44,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    marginBottom: 10,
    fontSize: 18,
    lineHeight: 22,
  },

  sectionTitle: { fontWeight: '700', color: '#111827', marginBottom: 6 },

  row: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  name: { fontSize: 16, color: '#111827' },
  badge: { marginTop: 2, fontSize: 12, fontWeight: '700', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeOn: { backgroundColor: '#E8F5E9', color: '#166534' },
  badgeOff: { backgroundColor: '#FEE2E2', color: '#991B1B' },

  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  delBtn: { backgroundColor: '#EF4444', paddingHorizontal: 10, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  delTxt: { color: '#fff', fontWeight: '700' },

  empty: { color: '#6B7280', paddingVertical: 8 },
});