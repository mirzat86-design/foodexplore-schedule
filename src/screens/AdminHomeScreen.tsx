import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Modal } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App'; // 路径按你的 App.tsx 所在位置调整

import { exportScheduleCsvForWeek, exportScheduleCsvForMonth, exportScheduleCsvForRange } from '../../utils/exportSchedule';

type Props = StackScreenProps<RootStackParamList, 'AdminHome'>;

const AdminHomeScreen: React.FC<Props> = ({ navigation }) => {
  const [exportOpen, setExportOpen] = useState(false);
  const [startDate, setStartDate] = useState(''); // YYYY-MM-DD
  const [endDate, setEndDate] = useState('');

  const handleExportWeek = async () => {
    try {
      await exportScheduleCsvForWeek();
      setExportOpen(false);
    } catch (e: any) {
      console.error('Export week failed', e?.message || e);
    }
  };

  const handleExportMonth = async () => {
    try {
      await exportScheduleCsvForMonth();
      setExportOpen(false);
    } catch (e: any) {
      console.error('Export month failed', e?.message || e);
    }
  };

  const handleExportRange = async () => {
    try {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        alert('请输入正确的日期格式：YYYY-MM-DD');
        return;
      }
      const s = new Date(startDate + 'T00:00:00');
      const e = new Date(endDate + 'T00:00:00');
      if (s > e) {
        alert('开始日期不能晚于结束日期');
        return;
      }
      await exportScheduleCsvForRange(s, e);
      setExportOpen(false);
    } catch (e: any) {
      console.error('Export range failed', e?.message || e);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>管理员</Text>
      <Text style={styles.sub}>请选择要管理的模块</Text>

      <TouchableOpacity
        style={[styles.card, styles.primary]}
        onPress={() => navigation.navigate('Schedule')}
        activeOpacity={0.9}
      >
        <Text style={styles.cardText}>排班表编辑</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.orange]}
        onPress={() => navigation.navigate('Announcement')}
        activeOpacity={0.9}
      >
        <Text style={styles.cardText}>公告编辑</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.blue]}
        onPress={() => navigation.navigate('EmployeePool')}
        activeOpacity={0.9}
      >
        <Text style={styles.cardText}>员工池（增删员工）</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, styles.green]}
        onPress={() => setExportOpen(true)}
        activeOpacity={0.9}
      >
        <Text style={styles.cardText}>导出排班表</Text>
      </TouchableOpacity>

      <Modal transparent visible={exportOpen} animationType="fade" onRequestClose={() => setExportOpen(false)}>
        <View style={styles.modalMask}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>选择导出范围</Text>

            <TouchableOpacity style={[styles.exportBtn, styles.weekBtn]} onPress={handleExportWeek}>
              <Text style={styles.exportBtnText}>导出本周（岗位×日期）CSV</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.exportBtn, styles.monthBtn]} onPress={handleExportMonth}>
              <Text style={styles.exportBtnText}>导出本月 CSV</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 12 }}>
              <Text style={styles.rangeLabel}>自定义日期范围</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TextInput
                  style={styles.input}
                  placeholder="开始：YYYY-MM-DD"
                  value={startDate}
                  onChangeText={setStartDate}
                  inputMode="numeric"
                  placeholderTextColor="#999"
                />
                <TextInput
                  style={styles.input}
                  placeholder="结束：YYYY-MM-DD"
                  value={endDate}
                  onChangeText={setEndDate}
                  inputMode="numeric"
                  placeholderTextColor="#999"
                />
              </View>
              <TouchableOpacity style={[styles.exportBtn, styles.rangeBtn]} onPress={handleExportRange}>
                <Text style={styles.exportBtnText}>导出该范围 CSV</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.cancel} onPress={() => setExportOpen(false)}>
              <Text style={styles.cancelText}>取消</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 20, paddingTop: 56, backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: '800', color: '#111' },
  sub: { marginTop: 6, color: '#666' },
  card: {
    height: 64, borderRadius: 12, marginTop: 16,
    alignItems: 'center', justifyContent: 'center'
  },
  primary: { backgroundColor: '#173B88' },
  orange: { backgroundColor: '#FF6A00' },
  blue: { backgroundColor: '#2563EB' },
  cardText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  green: { backgroundColor: '#27AE60' },
  modalMask: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  modalBox: { width: '90%', maxWidth: 480, backgroundColor: '#fff', borderRadius: 12, padding: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#111' },
  exportBtn: { height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  weekBtn: { backgroundColor: '#34D399' },
  monthBtn: { backgroundColor: '#10B981' },
  rangeBtn: { backgroundColor: '#059669' },
  exportBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rangeLabel: { color: '#333', fontSize: 14, marginTop: 4 },
  input: { flex: 1, height: 44, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  cancel: { marginTop: 10, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 16 },
  cancelText: { color: '#6b7280', fontSize: 14 },
});

export default AdminHomeScreen;