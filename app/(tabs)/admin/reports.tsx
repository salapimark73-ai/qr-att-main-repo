import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Share, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import { adminStyles as a, Btn, Card } from '@/components/AdminUI';
import { COLORS } from '@/constants/colors';
import { getReport, type Report } from '@/lib/admin';
import { shareCSV } from '@/lib/csv';

export default function ReportsScreen() {
  const [r, setR] = useState<Report | null>(null);
  useFocusEffect(
    useCallback(() => {
      let on = true;
      getReport().then((x) => on && setR(x));
      return () => { on = false; };
    }, [])
  );

  if (!r) return <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />;

  const text = [
    'QR Attendance — System Report',
    `Users: ${r.totalUsers} (students ${r.students}, teachers ${r.teachers}, admins ${r.admins})`,
    `Events: ${r.totalEvents} (open ${r.openEvents})`,
    `Attendance records: ${r.totalAttendance}`,
    '',
    'Per event:',
    ...r.perEvent.map((e) => `- ${e.title} (${e.code}): ${e.count} attended, ${e.rate}% of students`),
  ].join('\n');

  return (
    <ScrollView style={a.screen} contentContainerStyle={a.content}>
      <Card>
        <Text style={a.title}>Users</Text>
        <Text style={a.sub}>Total: {r.totalUsers}</Text>
        <Text style={a.sub}>Students: {r.students} · Teachers: {r.teachers} · Admins: {r.admins}</Text>
      </Card>
      <Card>
        <Text style={a.title}>Events</Text>
        <Text style={a.sub}>Total: {r.totalEvents} · Open: {r.openEvents} · Closed: {r.totalEvents - r.openEvents}</Text>
        <Text style={a.sub}>Attendance records: {r.totalAttendance}</Text>
      </Card>

      <Text style={[a.title, { marginVertical: 8 }]}>Attendance per event</Text>
      {r.perEvent.length === 0 && <Text style={a.sub}>No events yet.</Text>}
      {r.perEvent.map((e) => (
        <Card key={e.id}>
          <View style={a.row}>
            <View style={{ flex: 1 }}>
              <Text style={a.title}>{e.title}</Text>
              <Text style={a.sub}>{e.code}</Text>
            </View>
            <Text style={{ fontWeight: '800', color: COLORS.primary }}>{e.count} · {e.rate}%</Text>
          </View>
          <View style={{ height: 6, backgroundColor: COLORS.surface, borderRadius: 3, marginTop: 10 }}>
            <View style={{ width: `${Math.min(e.rate, 100)}%`, height: 6, backgroundColor: COLORS.primary, borderRadius: 3 }} />
          </View>
        </Card>
      ))}

      <Text style={[a.title, { marginVertical: 8 }]}>Most active students</Text>
      {r.topStudents.length === 0 && <Text style={a.sub}>No attendance yet.</Text>}
      {r.topStudents.map((s, i) => (
        <Card key={s.id}>
          <View style={a.row}>
            <Text style={[a.title, { flex: 1 }]}>{i + 1}. {s.name}</Text>
            <Text style={a.sub}>{s.count} events</Text>
          </View>
        </Card>
      ))}

      <Btn title="Share Report" icon="share-outline" onPress={() => Share.share({ message: text })} />
      <Btn
        title="Export Events (CSV)"
        icon="download-outline"
        kind="secondary"
        onPress={() =>
          shareCSV('Event report', [
            ['Event', 'Code', 'Attended', 'Rate of students (%)'],
            ...r.perEvent.map((e) => [e.title, e.code, e.count, e.rate]),
          ])
        }
      />
    </ScrollView>
  );
}
