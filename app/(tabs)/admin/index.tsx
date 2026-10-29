import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { adminStyles as a, Card, formatDT } from '@/components/AdminUI';
import { COLORS } from '@/constants/colors';
import { getReport, type Report } from '@/lib/admin';

const MENU = [
  { title: 'Manage Users', sub: 'Create, edit roles, remove', icon: 'people-outline', href: '/admin/users' },
  { title: 'Manage Events', sub: 'Create, edit, close, view QR', icon: 'calendar-outline', href: '/admin/events' },
  { title: 'Overall Attendance', sub: 'View, add or correct records', icon: 'checkmark-done-outline', href: '/admin/attendance' },
  { title: 'Reports', sub: 'System summary and totals', icon: 'stats-chart-outline', href: '/admin/reports' },
] as const;

export default function AdminHome() {
  const [r, setR] = useState<Report | null>(null);

  useFocusEffect(
    useCallback(() => {
      let on = true;
      getReport().then((x) => on && setR(x));
      return () => { on = false; };
    }, [])
  );

  const stats = r
    ? [
        ['Users', r.totalUsers], ['Events', r.totalEvents],
        ['Open events', r.openEvents], ['Attendance', r.totalAttendance],
      ]
    : [];

  return (
    <ScrollView style={a.screen} contentContainerStyle={a.content}>
      {!r ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 30 }} />
      ) : (
        <View style={s.grid}>
          {stats.map(([label, n]) => (
            <View key={label as string} style={s.stat}>
              <Text style={s.statNum}>{n}</Text>
              <Text style={s.statLabel}>{label}</Text>
            </View>
          ))}
        </View>
      )}
      {MENU.map((m) => (
        <Pressable key={m.title} style={s.menu} onPress={() => router.push(m.href as any)}>
          <View style={s.iconBox}>
            <Ionicons name={m.icon} size={24} color={COLORS.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={a.title}>{m.title}</Text>
            <Text style={a.sub}>{m.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={COLORS.textSecondary} />
        </Pressable>
      ))}

      {r && (
        <>
          <Text style={[a.title, { marginTop: 8, marginBottom: 10 }]}>Attendance, last 7 days</Text>
          <Card>
            <View style={s.chart}>
              {r.last7.map((d, i) => {
                const max = Math.max(1, ...r.last7.map((x) => x.count));
                return (
                  <View key={`${d.label}-${i}`} style={s.barCol}>
                    <Text style={s.barNum}>{d.count}</Text>
                    <View style={[s.bar, { height: Math.max(4, Math.round((d.count / max) * 70)) }]} />
                    <Text style={s.barLabel}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          </Card>

          <Text style={[a.title, { marginTop: 8, marginBottom: 10 }]}>Recent activity</Text>
          {r.recent.length === 0 && <Text style={a.sub}>No attendance yet.</Text>}
          {r.recent.map((x) => (
            <Card key={x.id}>
              <Text style={a.title}>{x.studentName}</Text>
              <Text style={a.sub}>{x.eventTitle}</Text>
              <Text style={a.sub}>{formatDT(x.scannedAt)}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 8 },
  stat: {
    width: '48%', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  statNum: { fontSize: 26, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  menu: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border,
  },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 110 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 16, borderRadius: 4, backgroundColor: COLORS.primary },
  barNum: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 3 },
  barLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4 },
  iconBox: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: COLORS.surface,
    alignItems: 'center', justifyContent: 'center', marginRight: 14,
  },
});
