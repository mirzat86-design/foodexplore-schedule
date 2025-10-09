import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../../App';

export default function AdminLoginScreen({ navigation }: { navigation: StackNavigationProp<RootStackParamList, 'AdminLogin'> }) {
  const [pwd, setPwd] = useState('');

  const submit = () => {
    if (pwd === 'FE2026') {
      navigation.replace('AdminHome'); // 仅进入公告编辑页
    } else {
      Alert.alert('管理员密码错误');
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>输入管理员密码</Text>

      <TextInput
        style={styles.input}
        placeholder="输入管理员密码"
        placeholderTextColor="#999"
        value={pwd}
        onChangeText={setPwd}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        onSubmitEditing={submit}
      />

      <TouchableOpacity style={styles.btn} onPress={submit} activeOpacity={0.8}>
        <Text style={styles.btnText}>进入管理</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: '#fff', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', height: 48, borderRadius: 8, paddingHorizontal: 12, fontSize: 16 },
  btn: { backgroundColor: '#FF6A00', height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
});