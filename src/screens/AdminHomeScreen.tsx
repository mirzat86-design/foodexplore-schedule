import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import type { RootStackParamList } from '../../App'; // 路径按你的 App.tsx 所在位置调整

type Props = StackScreenProps<RootStackParamList, 'AdminHome'>;

const AdminHomeScreen: React.FC<Props> = ({ navigation }) => {
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
});

export default AdminHomeScreen;