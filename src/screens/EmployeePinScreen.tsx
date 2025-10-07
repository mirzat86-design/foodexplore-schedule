// src/screens/EmployeePinScreen.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useNavigation } from '@react-navigation/native';
import type { RootStackParamList } from '../../App';

type Nav = StackNavigationProp<RootStackParamList, 'EmployeePin'>;

export default function EmployeePinScreen() {
  const navigation = useNavigation<Nav>();
  const [pin, setPin] = useState('');

  const onSubmit = () => {
    const t = pin.trim();
    if (t !== '2026') {
      Alert.alert('密码错误', '请输入正确的员工密码');
      return;
    }
    // 通过验证 -> 去员工查看自己的排班
    navigation.navigate('EmployeeMySchedule');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>输入员工密码</Text>
      <TextInput
        style={styles.input}
        placeholder="请输入员工密码"
        value={pin}
        onChangeText={setPin}
        secureTextEntry
        keyboardType="number-pad"
        returnKeyType="done"
      />
      <TouchableOpacity style={styles.btn} onPress={onSubmit}>
        <Text style={styles.btnText}>进入</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: '#fff', padding: 20, paddingTop: 100 },
  title: { fontSize: 24, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  input: {
    height: 48, borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
    paddingHorizontal: 12, backgroundColor: '#fff', marginBottom: 16,
  },
  btn: {
    height: 48, backgroundColor: '#173B88', borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});