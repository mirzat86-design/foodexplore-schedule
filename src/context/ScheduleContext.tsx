// src/context/ScheduleContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// -------------------- 类型定义 --------------------
export type AnnouncementLevel = 'red' | 'orange' | 'green' | 'blue';

export type Announcement = {
  id: string;
  text: string;
  level: AnnouncementLevel;
  published: boolean;
  type: 'announcement' | 'info';
  status: 'draft' | 'published';
  created_at?: string | null;
  updated_at?: string | null;
};

export type AddAnnouncementInput = {
  text: string;
  level?: AnnouncementLevel;
  type?: 'announcement' | 'info';
  published?: boolean;
  status?: 'draft' | 'published';
};

export type ScheduleMap = Record<string, Record<string, string[]>>;

type ScheduleContextType = {
  hydrated: boolean;

  // 排班
  schedule: ScheduleMap;
  setAssignment: (positionKey: string, date: string, names: string[]) => Promise<void>;

  // 公告
  announcements: Announcement[];
  addAnnouncement: (input: string | AddAnnouncementInput, level?: AnnouncementLevel) => Promise<void>;
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => Promise<void>;
  toggleAnnouncementPublish: (id: string, next: boolean) => Promise<void>;
  removeAnnouncement: (id: string) => Promise<void>;
  publishAnnouncement: (id: string) => Promise<void>;
  saveAnnouncementDraft: (id: string, patch: Partial<Announcement>) => Promise<void>;

  // 员工池
  employees: { id: string; name: string; enabled: boolean }[];
  addEmployee: (name: string) => Promise<void>;
  toggleEmployeeEnabled: (id: string, next: boolean) => Promise<void>;
  removeEmployee: (id: string) => Promise<void>;

  // 管理员临时权限（通过本地 PIN 解锁）
  isAdmin: boolean;
  setAdminByPin: (pin: string) => Promise<boolean>;
};

const ScheduleContext = createContext<ScheduleContextType | null>(null);

// -------------------- 工具函数 --------------------
function buildScheduleMap(rows: { id: string; position_key: string; work_date: string; employee_name: string }[]): ScheduleMap {
  const map: ScheduleMap = {};
  for (const r of rows) {
    const pos = r.position_key;
    const date = dayjs(r.work_date).format('YYYY-MM-DD');
    if (!map[pos]) map[pos] = {};
    if (!map[pos][date]) map[pos][date] = [];
    if (!map[pos][date].includes(r.employee_name)) {
      map[pos][date].push(r.employee_name);
    }
  }
  return map;
}

// -------------------- Provider --------------------
export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [hydrated, setHydrated] = useState(false);

  const [schedule, setSchedule] = useState<ScheduleMap>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; enabled: boolean }[]>([]);

  // 管理员临时权限状态（通过 PIN 解锁）
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  // 从本地持久化读取 admin 状态（如果之前解锁过则保持）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const v = await AsyncStorage.getItem('fe_is_admin');
        if (mounted && v === '1') setIsAdmin(true);
      } catch (e) {
        // ignore
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // 通过 PIN 设置管理员状态，返回是否成功
  const setAdminByPin = async (pin: string) => {
    const ok = String(pin).trim() === 'FE2026';
    try {
      await AsyncStorage.setItem('fe_is_admin', ok ? '1' : '0');
    } catch (e) {
      // ignore
    }
    setIsAdmin(ok);
    return ok;
  };

  // 首次加载：从 Supabase 拉取三张表
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // 1) schedule_assignments
        const { data: sRows, error: sErr } = await supabase
          .from('schedule_assignments')
          .select('id, position_key, work_date, employee_name')
          .order('work_date', { ascending: true });
        if (sErr) throw sErr;
        const sMap = buildScheduleMap(sRows ?? []);
        if (mounted) setSchedule(sMap);

        // 2) announcements
        const { data: aRows, error: aErr } = await supabase
          .from('announcements')
          .select('*')
          .order('created_at', { ascending: false });
        if (aErr) throw aErr;
        if (mounted) setAnnouncements((aRows ?? []) as Announcement[]);

        // 3) employees
        const { data: eRows, error: eErr } = await supabase
          .from('employees')
          .select('id, name, enabled')
          .order('created_at', { ascending: false });
        if (eErr) throw eErr;
        if (mounted) setEmployees(eRows ?? []);
      } catch (err) {
        console.warn('Initial load failed:', err);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // 仅刷新某天某岗位（用于 UPDATE 时精确同步）
  const reloadSlot = async (positionKey: string, dateISO: string) => {
    const { data, error } = await supabase
      .from('schedule_assignments')
      .select('employee_name')
      .eq('position_key', positionKey)
      .eq('work_date', dateISO);
    if (error) return; // 静默失败不打断 UI
    setSchedule((prev) => ({
      ...prev,
      [positionKey]: {
        ...(prev[positionKey] || {}),
        [dateISO]: (data ?? []).map((r) => r.employee_name),
      },
    }));
  };

  // Realtime 订阅：三张表（插入 / 更新 / 删除）
  useEffect(() => {
    // announcements
    const chanA = supabase
      .channel('realtime:announcements')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, (payload) => {
        setAnnouncements((prev) => {
          if (payload.eventType === 'INSERT') {
            return [payload.new as Announcement, ...prev];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map((a) => (a.id === payload.new.id ? (payload.new as Announcement) : a));
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter((a) => a.id !== (payload.old as any).id);
          }
          return prev;
        });
      })
      .subscribe();

    // employees
    const chanE = supabase
      .channel('realtime:employees')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, (payload) => {
        setEmployees((prev) => {
          if (payload.eventType === 'INSERT') {
            return [payload.new as any, ...prev];
          }
          if (payload.eventType === 'UPDATE') {
            return prev.map((e) => (e.id === payload.new.id ? (payload.new as any) : e));
          }
          if (payload.eventType === 'DELETE') {
            return prev.filter((e) => e.id !== (payload.old as any).id);
          }
          return prev;
        });
      })
      .subscribe();

    // schedule_assignments
    const chanS = supabase
      .channel('realtime:schedule_assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'schedule_assignments' }, (payload) => {
        setSchedule((prev) => {
          const next = { ...prev };
          const rec = (payload.eventType === 'DELETE' ? (payload.old as any) : (payload.new as any)) as {
            position_key: string;
            work_date: string;
            employee_name: string;
          };
          const date = dayjs(rec.work_date).format('YYYY-MM-DD');
          const pk = rec.position_key;

          if (!next[pk]) next[pk] = {};
          if (!next[pk][date]) next[pk][date] = [];

          if (payload.eventType === 'INSERT') {
            if (!next[pk][date].includes(rec.employee_name)) next[pk][date] = [...next[pk][date], rec.employee_name];
          } else if (payload.eventType === 'DELETE') {
            next[pk][date] = next[pk][date].filter((n) => n !== rec.employee_name);
          } else if (payload.eventType === 'UPDATE') {
            const changed = (payload.new as any) as { position_key: string; work_date: string };
            const d = dayjs(changed.work_date).format('YYYY-MM-DD');
            reloadSlot(changed.position_key, d);
          }
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(chanA);
      supabase.removeChannel(chanE);
      supabase.removeChannel(chanS);
    };
  }, []);

  // -------------------- 写操作（管理端） --------------------
  // 说明：当前 RLS 里，如果你暂时保留了 TEMP 策略（anon 可写），这些写操作可直接生效；
  // 之后切到鉴权（authenticated）或服务端 Service Role，再把这里的调用保持不变即可。

  // 排班：把某天某岗位的名单同步到表（新增缺的，删除多的）
  const setAssignment: ScheduleContextType['setAssignment'] = async (positionKey, date, names) => {
    // 先查已有
    const { data: existed, error: exErr } = await supabase
      .from('schedule_assignments')
      .select('id, employee_name')
      .eq('position_key', positionKey)
      .eq('work_date', date);
    if (exErr) throw exErr;

    const exists = new Map<string, string>(); // name -> id
    (existed ?? []).forEach((r) => exists.set(r.employee_name, r.id));

    const toInsert = names.filter((n) => !exists.has(n)).map((n) => ({
      position_key: positionKey,
      work_date: date,
      employee_name: n,
    }));
    const toDeleteIds = (existed ?? [])
      .filter((r) => !names.includes(r.employee_name))
      .map((r) => r.id);

    if (toInsert.length > 0) {
      const { error } = await supabase.from('schedule_assignments').insert(toInsert);
      if (error) throw error;
    }
    if (toDeleteIds.length > 0) {
      const { error } = await supabase.from('schedule_assignments').delete().in('id', toDeleteIds);
      if (error) throw error;
    }
  };

  // 公告
  const addAnnouncement: ScheduleContextType['addAnnouncement'] = async (input, level) => {
    const payload =
      typeof input === 'string'
        ? {
            text: input.trim(),
            level: (level ?? 'green') as AnnouncementLevel,
            type: 'announcement' as const,
            status: 'draft' as const,
            published: false,
          }
        : {
            text: (input.text ?? '').trim(),
            level: (input.level ?? (input.type === 'announcement' ? 'blue' : 'green')) as AnnouncementLevel,
            type: (input.type ?? 'announcement') as 'announcement' | 'info',
            status: (input.status ?? (input.published ? 'published' : 'draft')) as 'draft' | 'published',
            published: !!input.published,
          };

    const { error } = await supabase.from('announcements').insert(payload);
    if (error) throw error;
  };

  const updateAnnouncement: ScheduleContextType['updateAnnouncement'] = async (id, patch) => {
    const { error } = await supabase.from('announcements').update(patch).eq('id', id);
    if (error) throw error;
  };

  const toggleAnnouncementPublish: ScheduleContextType['toggleAnnouncementPublish'] = async (id, next) => {
    const { error } = await supabase.from('announcements').update({ published: next }).eq('id', id);
    if (error) throw error;
  };

  const removeAnnouncement: ScheduleContextType['removeAnnouncement'] = async (id) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
  };

  const publishAnnouncement: ScheduleContextType['publishAnnouncement'] = async (id) => {
    const { error } = await supabase.from('announcements').update({ status: 'published', published: true }).eq('id', id);
    if (error) throw error;
  };

  const saveAnnouncementDraft: ScheduleContextType['saveAnnouncementDraft'] = async (id, patch) => {
    const { error } = await supabase.from('announcements').update({ ...patch, status: 'draft' }).eq('id', id);
    if (error) throw error;
  };

  // 员工池
  const addEmployee: ScheduleContextType['addEmployee'] = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const { error } = await supabase.from('employees').insert({ name: trimmed, enabled: true });
    if (error) throw error;
  };

  const toggleEmployeeEnabled: ScheduleContextType['toggleEmployeeEnabled'] = async (id, next) => {
    const { error } = await supabase.from('employees').update({ enabled: next }).eq('id', id);
    if (error) throw error;
  };

  const removeEmployee: ScheduleContextType['removeEmployee'] = async (id) => {
    const { error } = await supabase.from('employees').delete().eq('id', id);
    if (error) throw error;
  };

  const value = useMemo<ScheduleContextType>(
    () => ({
      hydrated,

      schedule,
      setAssignment,

      announcements,
      addAnnouncement,
      updateAnnouncement,
      toggleAnnouncementPublish,
      removeAnnouncement,
      publishAnnouncement,
      saveAnnouncementDraft,

      employees,
      addEmployee,
      toggleEmployeeEnabled,
      removeEmployee,

      isAdmin,
      setAdminByPin,
    }),
    [hydrated, schedule, announcements, employees, isAdmin]
  );

  if (!hydrated) return null;
  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

// Hook
export const useSchedule = () => {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
};