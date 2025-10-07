import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';
import { useSchedule } from '../context/ScheduleContext';

export default function PositionCalendarScreen({ route }: { route: RouteProp<RootStackParamList, 'PositionCalendar'> }) {
  const { positionKey } = route.params;
  const { schedule, setAssignment } = useSchedule();

  const MAX = 5;

  const today = dayjs().format('YYYY-MM-DD');
  const [date, setDate] = useState<string>(today);

  const names = useMemo<string[]>(
    () => schedule[positionKey]?.[date] ?? [],
    [schedule, positionKey, date]
  );
  const [newName, setNewName] = useState('');

  const marked = useMemo(() => ({
    [date]: { selected: true, selectedColor: '#173B88' }
  }), [date]);

  const add = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (names.length >= MAX) return;
    // 去重（大小写不敏感）
    const exists = names.some(n => n.toLowerCase() === trimmed.toLowerCase());
    if (exists) return;
    const next = [...names, trimmed];
    setAssignment(positionKey, date, next.slice(0, MAX));
    setNewName('');
  }, [newName, names, positionKey, date, setAssignment]);

  const remove = useCallback((n: string) => {
    setAssignment(positionKey, date, names.filter(x => x !== n));
  }, [names, positionKey, date, setAssignment]);

  return (
    <View style={{ flex: 1 }}>
      <Calendar onDayPress={(d) => setDate(d.dateString)} markedDates={marked} />

      <View style={styles.box}>
        <Text style={styles.cap}>最多 {MAX} 人，本日已选：{names.length}/{MAX}</Text>
        <View style={styles.chips}>
          {names.map(n => (
            <TouchableOpacity key={n} style={styles.chip} onPress={() => remove(n)}>
              <Text style={styles.chipTxt}>{n} ×</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.row}>
          <TextInput style={styles.input} placeholder="输入员工名并添加" value={newName} onChangeText={setNewName} />
          <TouchableOpacity style={[styles.add, names.length >= MAX && { opacity: 0.5 }]} disabled={names.length >= MAX} onPress={add}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>添加</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { padding: 16 },
  cap: { color: '#666', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#173B88', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, marginRight: 8, marginBottom: 8 },
  chipTxt: { color: '#fff' },
  row: { flexDirection: 'row', marginTop: 12 },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 10 },
  add: { marginLeft: 8, backgroundColor: '#FF6A00', paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});