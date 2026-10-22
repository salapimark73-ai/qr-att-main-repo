import Ionicons from '@expo/vector-icons/Ionicons';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  adminStyles as a, Btn, Card, Chip, Empty, formatDT, SearchBar, Sheet,
} from '@/components/AdminUI';
import { COLORS } from '@/constants/colors';
import { shareCSV } from '@/lib/csv';
import {
  addAttendance, deleteAttendance, listAllAttendance, listAllEvents, listUsers,
  type AdminAttendance, type AdminEvent, type AdminUser,
} from '@/lib/admin';

export default function AttendanceScreen() {
  const [rows, setRows] = useState<AdminAttendance[] | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [eventFilter, setEventFilter] = useState<string>('all');
  const [q, setQ] = useState('');

  const [adding, setAdding] = useState(false);
  const [pickEvent, setPickEvent] = useState<string | null>(null);
  const [pickStudent, setPickStudent] = useState<string | null>(null);
  const [sq, setSq] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [r, e, u] = await Promise.all([listAllAttendance(), listAllEvents(), listUsers()]);
    setRows(r); setEvents(e); setUsers(u);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (rows ?? []).filter(
      (r) =>
        (eventFilter === 'all' || r.event_id === eventFilter) &&
        (!t || r.studentName.toLowerCase().includes(t) || r.studentEmail.toLowerCase().includes(t))
    );
  }, [rows, eventFilter, q]);

  const students = useMemo(() => {
    const t = sq.trim().toLowerCase();
    return users
      .filter((u) => u.role === 'student')
      .filter((u) => !t || u.email.toLowerCase().includes(t) || (u.full_name ?? '').toLowerCase().includes(t))
      .slice(0, 6);
  }, [users, sq]);

  const remove = (r: AdminAttendance) =>
    Alert.alert('Delete record', `Remove ${r.studentName} from "${r.eventTitle}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await deleteAttendance(r.id);
          if (error) return Alert.alert('Error', error);
          load();
        },
      },
    ]);

  const add = async () => {
    setErr(null);
    if (!pickEvent || !pickStudent) return setErr('Choose an event and a student.');
    setBusy(true);
    const { error } = await addAttendance(pickStudent, pickEvent);
    setBusy(false);
    if (error) return setErr(error);
    setAdding(false);
    setPickEvent(null); setPickStudent(null); setSq('');
    load();
  };

  return (
    <View style={a.screen}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search student" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip label="All events" active={eventFilter === 'all'} onPress={() => setEventFilter('all')} />
          {events.map((e) => (
            <Chip key={e.id} label={e.title} active={eventFilter === e.id} onPress={() => setEventFilter(e.id)} />
          ))}
        </ScrollView>
        <Btn title="Add Record Manually" icon="add-circle-outline" onPress={() => { setErr(null); setAdding(true); }} />
        <Btn
          title="Export shown records (CSV)"
          icon="share-outline"
          kind="secondary"
          onPress={() =>
            shareCSV('Attendance records', [
              ['Student', 'Email', 'Event', 'Code', 'Scanned at'],
              ...shown.map((r) => [r.studentName, r.studentEmail, r.eventTitle, r.eventCode, formatDT(r.scanned_at)]),
            ])
          }
        />
        <Text style={[a.sub, { marginTop: 10 }]}>{shown.length} record(s)</Text>
      </View>

      <ScrollView contentContainerStyle={a.content}>
        {!rows ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : shown.length === 0 ? (
          <Empty text="No attendance records." />
        ) : (
          shown.map((r) => (
            <Card key={r.id}>
              <View style={a.row}>
                <View style={{ flex: 1 }}>
                  <Text style={a.title}>{r.studentName}</Text>
                  <Text style={a.sub}>{r.eventTitle}</Text>
                  <Text style={a.sub}>{formatDT(r.scanned_at)}</Text>
                </View>
                <Pressable onPress={() => remove(r)} hitSlop={10}>
                  <Ionicons name="trash-outline" size={22} color={COLORS.danger} />
                </Pressable>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Sheet visible={adding} title="Add Attendance Record" onClose={() => setAdding(false)}>
        <Text style={[a.title, { marginTop: 12, marginBottom: 8 }]}>1. Event</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {events.map((e) => (
            <Chip key={e.id} label={e.title} active={pickEvent === e.id} onPress={() => setPickEvent(e.id)} />
          ))}
        </ScrollView>
        <Text style={[a.title, { marginTop: 16, marginBottom: 8 }]}>2. Student</Text>
        <SearchBar value={sq} onChangeText={setSq} placeholder="Search student" />
        {students.length === 0 && <Text style={a.sub}>No matching students.</Text>}
        {students.map((u) => (
          <Pressable
            key={u.id}
            onPress={() => setPickStudent(u.id)}
            style={{
              padding: 12, borderRadius: 10, marginBottom: 6, borderWidth: 1,
              borderColor: pickStudent === u.id ? COLORS.primary : COLORS.border,
              backgroundColor: pickStudent === u.id ? COLORS.surface : COLORS.card,
            }}
          >
            <Text style={a.title}>{u.full_name || '(no name)'}</Text>
            <Text style={a.sub}>{u.email}</Text>
          </Pressable>
        ))}
        {err && <Text style={a.error}>{err}</Text>}
        <Btn title={busy ? 'Saving...' : 'Save Record'} icon="checkmark" onPress={add} disabled={busy} />
      </Sheet>
    </View>
  );
}
