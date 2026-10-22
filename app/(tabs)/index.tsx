import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card } from '@/components/AdminUI';
import AppButton from '@/components/AppButton';
import Header from '@/components/Header';
import { COLORS } from '@/constants/colors';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getOpenEvents, type CloudEvent } from '@/lib/events';
import { getProfile, type Profile } from '@/lib/profiles';

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function relativeDay(iso: string) {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmt(iso: string | null) {
  return iso
    ? new Date(iso).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '';
}

export default function Index() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [openEvents, setOpenEvents] = useState<CloudEvent[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    const p = await getProfile(user.id);
    setProfile(p);
    if (p?.role === 'teacher') {
      setTeacherEvents(await getTeacherEventAttendance(user.id));
    } else {
      const [recs, evs] = await Promise.all([getAttendanceHistory(user.id), getOpenEvents()]);
      setRecords(recs);
      setOpenEvents(evs);
    }
    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const isTeacher = profile?.role === 'teacher';
  const firstName = (profile?.full_name ?? '').trim().split(' ')[0] || 'there';

  // ---- student numbers
  const thisMonth = useMemo(() => {
    const now = new Date();
    return records.filter((r) => {
      const d = new Date(r.scannedAt);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [records]);

  const toAttend = useMemo(() => {
    const done = new Set(records.map((r) => r.eventId));
    return openEvents.filter((e) => !done.has(e.event_code)).slice(0, 5);
  }, [records, openEvents]);

  // ---- teacher numbers
  const totalAttendees = teacherEvents.reduce((n, e) => n + e.attendeeCount, 0);
  const openCount = teacherEvents.filter((e) => e.status === 'open').length;

  const stats: [string, string | number][] = isTeacher
    ? [['My events', teacherEvents.length], ['Total attendees', totalAttendees], ['Open', openCount]]
    : [
        ['Attended', records.length],
        ['This month', thisMonth],
        ['Last scan', records[0] ? relativeDay(records[0].scannedAt) : '—'],
      ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        <Header title="QR Attendance" />
        <Text style={styles.greeting}>Hello, {firstName}</Text>
        <Text style={styles.subtitle}>
          {isTeacher
            ? 'Create events, share QR codes and track who attended.'
            : 'Scan QR codes to record attendance during school activities.'}
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          <>
            <View style={styles.statRow}>
              {stats.map(([label, value]) => (
                <View key={label} style={styles.stat}>
                  <Text style={styles.statNum} numberOfLines={1} adjustsFontSizeToFit>
                    {value}
                  </Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <View style={styles.buttons}>
              {isTeacher ? (
                <>
                  <AppButton
                    theme="primary"
                    title="Create Event QR"
                    icon="add-circle-outline"
                    onPress={() => router.push('/teacher')}
                  />
                  <AppButton
                    title="My Events and Attendance"
                    icon="list-outline"
                    onPress={() => router.push('/history')}
                  />
                </>
              ) : (
                <>
                  <AppButton
                    theme="primary"
                    title="Scan QR Code"
                    icon="qr-code-outline"
                    onPress={() => router.push('/scan')}
                  />
                  <AppButton
                    title="Attendance History"
                    icon="time-outline"
                    onPress={() => router.push('/history')}
                  />
                </>
              )}
              <AppButton
                title="Profile"
                icon="person-outline"
                onPress={() => router.push('/profile')}
              />
            </View>

            {isTeacher ? (
              <>
                <Text style={styles.section}>Recent events</Text>
                {teacherEvents.length === 0 && (
                  <Text style={styles.empty}>No events yet. Create your first one above.</Text>
                )}
                {teacherEvents.slice(0, 3).map((e) => (
                  <Card key={e.eventId}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.cardTitle}>{e.title}</Text>
                        <Text style={styles.cardSub}>{e.eventCode}</Text>
                      </View>
                      <Badge label={e.status === 'open' ? 'Open' : 'Closed'} tone={e.status === 'open' ? 'green' : 'gray'} />
                    </View>
                    <Text style={[styles.cardSub, { marginTop: 6 }]}>
                      {e.attendeeCount} attended{e.startTime ? ` · ${fmt(e.startTime)}` : ''}
                    </Text>
                  </Card>
                ))}
              </>
            ) : (
              <>
                <Text style={styles.section}>Events you can check in to</Text>
                {toAttend.length === 0 && (
                  <Text style={styles.empty}>
                    No open events right now. Pull down to refresh.
                  </Text>
                )}
                {toAttend.map((e) => {
                  const live = !e.start_time || new Date(e.start_time).getTime() <= Date.now();
                  return (
                    <Card key={e.id}>
                      <View style={styles.rowBetween}>
                        <View style={{ flex: 1, paddingRight: 8 }}>
                          <Text style={styles.cardTitle}>{e.title}</Text>
                          <Text style={styles.cardSub}>
                            {e.venue ? `${e.venue} · ` : ''}
                            {fmt(e.start_time) || e.event_code}
                          </Text>
                        </View>
                        <Badge label={live ? 'Open now' : 'Upcoming'} tone={live ? 'green' : 'blue'} />
                      </View>
                    </Card>
                  );
                })}

                {records.length > 0 && (
                  <>
                    <Text style={styles.section}>Recent check-ins</Text>
                    {records.slice(0, 3).map((r) => (
                      <Card key={r.id}>
                        <Text style={styles.cardTitle}>{r.eventTitle}</Text>
                        <Text style={styles.cardSub}>{fmt(r.scannedAt)}</Text>
                      </Card>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingHorizontal: 24, paddingBottom: 32 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 15, color: COLORS.textSecondary, marginBottom: 18 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  stat: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 12, padding: 12, marginHorizontal: 4,
    borderWidth: 1, borderColor: COLORS.border, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center' },
  buttons: { width: '100%', marginBottom: 6 },
  section: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginTop: 12, marginBottom: 10 },
  empty: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  cardSub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
});
