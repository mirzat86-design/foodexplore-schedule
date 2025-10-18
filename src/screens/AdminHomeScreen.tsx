/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { View, Text, Pressable, FlatList, StyleSheet } from 'react-native';

// Web-side admin API (Vercel) — will be used only on web
async function webDeleteEmployee(id: string): Promise<void> {
  const res = await fetch('/api/employee/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Delete failed (${res.status})`);
  }
}
async function webToggleEmployee(id: string, enabled: boolean): Promise<void> {
  const res = await fetch('/api/employee/toggle', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ id, enabled }),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j?.error || `Toggle failed (${res.status})`);
  }
}

export default function EmployeePoolScreen({ employees, deleteEmployeeNative, toggleEmployeeNative }: any) {
  async function handleDelete(emp: any) {
    try {
      if (typeof window !== 'undefined') {
        await webDeleteEmployee(emp.id);
      } else {
        // native path: keep your current Supabase/local deletion here
        // await supabase.from('employees').delete().eq('id', emp.id);
        if (typeof deleteEmployeeNative === 'function') {
          await deleteEmployeeNative(emp.id);
        }
      }
      alert('已删除');
    } catch (err: any) {
      console.error('删除失败:', err?.message || err);
      alert('删除失败：' + (err?.message || err));
    }
  }

  async function handleToggle(emp: any) {
    try {
      if (typeof window !== 'undefined') {
        await webToggleEmployee(emp.id, !emp.enabled);
      } else {
        if (typeof toggleEmployeeNative === 'function') {
          await toggleEmployeeNative(emp.id, !emp.enabled);
        }
      }
      alert('已更新');
    } catch (err: any) {
      console.error('状态更新失败:', err?.message || err);
      alert('状态更新失败：' + (err?.message || err));
    }
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={employees}
        keyExtractor={(item) => item.id}
        renderItem={({ item: emp }) => (
          <View style={styles.employeeRow}>
            <Text style={styles.employeeName}>{emp.name}</Text>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                try { await handleToggle(emp); } catch (e) { console.error(e); alert(String((e as any)?.message || e)); }
              }}
              style={({ pressed }) => [styles.toggleBtn, pressed && styles.pressed]}
            >
              <Text style={styles.toggleBtnText}>{emp.enabled ? '停用' : '启用'}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={async () => {
                try { await handleDelete(emp); } catch (e) { console.error(e); alert(String((e as any)?.message || e)); }
              }}
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.pressed]}
            >
              <Text style={styles.deleteBtnText}>删除</Text>
            </Pressable>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  employeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeName: {
    flex: 1,
    fontSize: 16,
  },
  toggleBtn: {
    backgroundColor: '#4ade80',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  toggleBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  deleteBtn: {
    backgroundColor: '#f87171',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  deleteBtnText: {
    color: 'white',
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});