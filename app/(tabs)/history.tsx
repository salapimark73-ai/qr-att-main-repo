import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Badge, Btn, Chip, SearchBar } from '@/components/AdminUI';
import { COLORS } from '@/constants/colors';
import { setEventStatus } from '@/lib/admin';
import { shareCSV } from '@/lib/csv';
import { useAuth } from '@/lib/auth';
import {
  getAttendanceHistory,
  getTeacherEventAttendance,
  type AttendanceRecord,
  type TeacherEventAttendance,
} from '@/lib/attendance';
import { getProfile, type Role } from '@/lib/profiles';

export default function HistoryScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | null>(null);
  const [studentRecords, setStudentRecords] = useState<AttendanceRecord[]>([]);
  const [teacherEvents, setTeacherEvents] = useState<TeacherEventAttendance[]>([]);
  const [q, setQ] = useState('');
  const [range, setRange] = useState<'all' | 'month'>('all');

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const profile = await getProfile(user.id);
    const currentRole = profile?.role ?? 'student';
    setRole(currentRole);

    if (currentRole === 'teacher') {
      const events = await getTeacherEventAttendance(user.id);
      setTeacherEvents(events);
      setStudentRecords([]);
    } else {
      const records = await getAttendanceHistory(user.id);
      setStudentRecords(records);
      setTeacherEvents([]);
    }

    setLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const term = q.trim().toLowerCase();

  const shownStudent = useMemo(() => {
    const now = new Date();
    return studentRecords.filter((r) => {
      const d = new Date(r.scannedAt);
      const inRange =
        range === 'all' ||
        (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear());
      return inRange && (!term || r.eventTitle.toLowerCase().includes(term) || r.eventId.toLowerCase().includes(term));
    });
  }, [studentRecords, term, range]);

  const shownTeacher = useMemo(
    () =>
      teacherEvents.filter(
        (e) =>
          !term ||
          e.title.toLowerCase().includes(term) ||
          e.eventCode.toLowerCase().includes(term) ||
          e.attendees.some((a) => a.studentName.toLowerCase().includes(term))
      ),
    [teacherEvents, term]
  );

  const totalAttendees = teacherEvents.reduce((n, e) => n + e.attendeeCount, 0);

  const exportEvents = (events: TeacherEventAttendance[], name: string) => {
    const rows: (string | number)[][] = [['Event', 'Code', 'Student', 'Scanned at']];
    events.forEach((e) => {
      if (e.attendees.length === 0) rows.push([e.title, e.eventCode, '', '']);
      e.attendees.forEach((a) =>
        rows.push([e.title, e.eventCode, a.studentName || shortId(a.studentId), formatDate(a.scannedAt)])
      );
    });
    shareCSV(name, rows);
  };

  const toggleStatus = (e: TeacherEventAttendance) => {
    const next = e.status === 'open' ? 'closed' : 'open';
    Alert.alert(
      next === 'closed' ? 'Close event' : 'Reopen event',
      next === 'closed'
        ? `Students will no longer be able to scan into "${e.title}".`
        : `Students will be able to scan into "${e.title}" again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: next === 'closed' ? 'Close' : 'Reopen',
          onPress: async () => {
            const { error } = await setEventStatus(e.eventId, next);
            if (error) return Alert.alert('Error', error);
            setTeacherEvents((prev) =>
              prev.map((x) => (x.eventId === e.eventId ? { ...x, status: next } : x))
            );
          },
        },
      ]
    );
  };

  if (role === 'teacher') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>My Events</Text>

        {loading ? (
          <Text style={styles.subtitle}>Loading events...</Text>
        ) : teacherEvents.length === 0 ? (
          <Text style={styles.subtitle}>
            No events yet. Create one in the Teacher tab.
          </Text>
        ) : (
          <>
          <Text style={styles.summary}>
            {teacherEvents.length} event(s) · {totalAttendees} total attendance
          </Text>
          <SearchBar value={q} onChangeText={setQ} placeholder="Search event or student" />
          <FlatList
            data={shownTeacher}
            ListEmptyComponent={<Text style={styles.subtitle}>No matching events.</Text>}
            ListFooterComponent={
              <Btn
                title="Export all attendance (CSV)"
                icon="share-outline"
                kind="secondary"
                onPress={() => exportEvents(teacherEvents, 'All attendance')}
              />
            }
            keyExtractor={(item) => item.eventId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{item.attendeeCount}</Text>
                  </View>
                </View>
                <Text style={styles.eventMeta}>{item.eventCode}</Text>
                {item.startTime && (
                  <Text style={styles.eventMeta}>{formatDate(item.startTime)}</Text>
                )}
                <View style={{ marginTop: 6 }}>
                  <Badge
                    label={item.status === 'open' ? 'Open' : 'Closed'}
                    tone={item.status === 'open' ? 'green' : 'gray'}
                  />
                </View>
                <View style={styles.actionRow}>
                  <View style={{ flex: 1 }}>
                    <Btn
                      title="Share list"
                      icon="share-outline"
                      kind="secondary"
                      onPress={() => exportEvents([item], item.title)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Btn
                      title={item.status === 'open' ? 'Close' : 'Reopen'}
                      icon={item.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
                      kind="secondary"
                      onPress={() => toggleStatus(item)}
                    />
                  </View>
                </View>

                {item.attendees.length > 0 && (
                  <View style={styles.attendeeList}>
                    {item.attendees.map((a) => (
                      <View
                        key={`${item.eventId}-${a.studentId}-${a.scannedAt}`}
                        style={styles.attendeeRow}
                      >
                        <Text style={styles.attendeeId}>
                          {a.studentName || shortId(a.studentId)}
                        </Text>
                        <Text style={styles.attendeeTime}>{formatDate(a.scannedAt)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          />
          </>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Attendance History</Text>

      {loading ? (
        <Text style={styles.subtitle}>Loading records...</Text>
      ) : studentRecords.length === 0 ? (
        <Text style={styles.subtitle}>
          No records yet. Scan a QR code to register your attendance.
        </Text>
      ) : (
        <>
        <Text style={styles.summary}>
          {studentRecords.length} event(s) attended · {shownStudent.length} shown
        </Text>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search event" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, marginBottom: 12 }}>
          <Chip label="All time" active={range === 'all'} onPress={() => setRange('all')} />
          <Chip label="This month" active={range === 'month'} onPress={() => setRange('month')} />
        </ScrollView>
        <FlatList
          data={shownStudent}
          ListEmptyComponent={<Text style={styles.subtitle}>No matching records.</Text>}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.eventTitle}>{item.eventTitle}</Text>
              <Text style={styles.eventMeta}>{item.eventId}</Text>
              <Text style={styles.eventMeta}>{formatDate(item.scannedAt)}</Text>
            </View>
          )}
        />
        </>
      )}
    </View>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

function shortId(id: string) {
  return id ? `…${id.slice(-8)}` : 'unknown';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 32,
  },
  list: {
    paddingBottom: 24,
  },
  summary: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  countBadge: {
    backgroundColor: COLORS.success,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
    flexShrink: 1,
  },
  eventMeta: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  attendeeList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 8,
  },
  attendeeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  attendeeId: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  attendeeTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
