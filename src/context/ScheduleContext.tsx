export type AnnouncementLevel = 'red' | 'orange' | 'green' | 'blue';

export type Announcement = {
  id: string;
  text: string;
  level: AnnouncementLevel;
  published: boolean;
  type: 'announcement' | 'info';
  status: 'draft' | 'published';
};

export type AddAnnouncementInput = {
  text: string;
  level?: AnnouncementLevel;
  type?: 'announcement' | 'info';
  published?: boolean;
  status?: 'draft' | 'published';
};
// src/context/ScheduleContext.tsx
import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';


// 排班数据结构：schedule[positionKey][date] = string[]
export type ScheduleMap = Record<string, Record<string, string[]>>;

type ScheduleContextType = {
  schedule: ScheduleMap;
  setAssignment: (positionKey: string, date: string, names: string[]) => void;

  announcements: Announcement[];
  addAnnouncement: (input: string | AddAnnouncementInput, level?: AnnouncementLevel) => void;
  updateAnnouncement: (id: string, patch: Partial<Announcement>) => void;
  toggleAnnouncementPublish: (id: string, next: boolean) => void;
  removeAnnouncement: (id: string) => void;
  publishAnnouncement: (id: string) => void;
  saveAnnouncementDraft: (id: string, patch: Partial<Announcement>) => void;

  
  employees: { id: string; name: string; enabled: boolean }[];
  addEmployee: (name: string) => void;
  toggleEmployeeEnabled: (id: string, next: boolean) => void;
  removeEmployee: (id: string) => void;
};

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export const ScheduleProvider = ({ children }: { children: ReactNode }) => {
  const [schedule, setSchedule] = useState<ScheduleMap>({});

  const setAssignment = (positionKey: string, date: string, names: string[]) => {
    setSchedule(prev => {
      const pos = prev[positionKey] ?? {};
      return {
        ...prev,
        [positionKey]: {
          ...pos,
          [date]: names,
        },
      };
    });
  };

  // ——— 公告 & 员工池（简单内存实现，后续接后端可替换） ———
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const addAnnouncement = (input: string | AddAnnouncementInput, level?: AnnouncementLevel) => {
    const id = Math.random().toString(36).slice(2);
    if (typeof input === 'string') {
      const text = input.trim();
      const lvl: AnnouncementLevel = level ?? 'green';
      setAnnouncements(prev => [
        { id, text, level: lvl, type: 'announcement', status: 'draft', published: false },
        ...prev,
      ]);
    } else {
      const text = (input.text ?? '').trim();
      const type: 'announcement' | 'info' = input.type ?? 'announcement';
      const lvl: AnnouncementLevel = input.level ?? (type === 'announcement' ? 'blue' : 'green');
      const published = input.published ?? false;
      const status: 'draft' | 'published' = input.status ?? (published ? 'published' : 'draft');
      setAnnouncements(prev => [
        { id, text, level: lvl, type, status, published },
        ...prev,
      ]);
    }
  };
  const updateAnnouncement = (id: string, patch: Partial<Announcement>) => {
    setAnnouncements(prev => prev.map(a => (a.id === id ? { ...a, ...patch } : a)));
  };
  const toggleAnnouncementPublish = (id: string, next: boolean) => {
    setAnnouncements(prev =>
      prev.map(a => (a.id === id ? { ...a, published: next } : a)),
    );
  };
  const removeAnnouncement = (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
  };
  const publishAnnouncement = (id: string) => {
    setAnnouncements(prev =>
      prev.map(a => (a.id === id ? { ...a, status: 'published', published: true } : a)),
    );
  };

  const saveAnnouncementDraft = (id: string, patch: Partial<Announcement>) => {
    setAnnouncements(prev =>
      prev.map(a => (a.id === id ? { ...a, ...patch, status: 'draft' } : a)),
    );
  };

  const [employees, setEmployees] = useState<{ id: string; name: string; enabled: boolean }[]>([]);
  const addEmployee = (name: string) => {
    const id = Math.random().toString(36).slice(2);
    setEmployees(prev => [{ id, name, enabled: true }, ...prev]);
  };
  const toggleEmployeeEnabled = (id: string, next: boolean) => {
    setEmployees(prev => prev.map(e => (e.id === id ? { ...e, enabled: next } : e)));
  };
  const removeEmployee = (id: string) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  };

  const value = useMemo<ScheduleContextType>(
    () => ({
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
    }),
    [schedule, announcements, employees]
  );

  return <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>;
};

export const useSchedule = () => {
  const ctx = useContext(ScheduleContext);
  if (!ctx) throw new Error('useSchedule must be used within ScheduleProvider');
  return ctx;
};