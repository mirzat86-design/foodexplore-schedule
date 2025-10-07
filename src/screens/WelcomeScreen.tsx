import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

export type WelcomeNav = StackNavigationProp<RootStackParamList, 'Welcome'>;

export default function WelcomeScreen({ navigation }: { navigation: WelcomeNav }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.welcomeLine}>欢迎使用</Text>
      <Text style={styles.foodExploreLine}>FoodExplore</Text>
      <Text style={styles.scheduleLine}>排班系统</Text>
      <Text style={styles.sub}>轻松管理厨房员工的日历排班</Text>

      <TouchableOpacity style={[styles.btn, styles.primary]} onPress={() => navigation.navigate('EmployeePin')}>
        <Text style={styles.btnText}>查看排班表（员工）</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.danger]} onPress={() => navigation.navigate('AdminLogin')}>
        <Text style={styles.btnText}>管理员入口</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>
        © 2025 MIKO 版权所有 · Alle rechten voorbehouden · All rights reserved{'\n'}
        Contact: info.miko@gmail.com{'\n'}
        Version 1.0.0
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#173B88', padding: 24, alignItems: 'center', justifyContent: 'center' },
  welcomeLine: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 4, textAlign: 'center' },
  foodExploreLine: { color: '#fff', fontSize: 36, fontWeight: '800', marginBottom: 4, textAlign: 'center' },
  scheduleLine: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  sub: { color: '#E6EDFF', marginBottom: 24 },
  btn: { height: 52, borderRadius: 12, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  primary: { backgroundColor: '#FF6A00' },
  danger: { backgroundColor: '#FF4D67' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  footer: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 48,
    paddingHorizontal: 10,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
  },
});