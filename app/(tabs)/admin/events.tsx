import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';

import {
  adminStyles as a, Badge, Btn, Card, Chip, DateTimeField, Empty, formatDT, Input, SearchBar, Sheet,
} from '@/components/AdminUI';
import { COLORS } from '@/constants/colors';
import {
  deleteEvent, listAllAttendance, listAllEvents, saveEvent, setEventStatus,
  type AdminAttendance, type AdminEvent,
} from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import { buildQRPayload } from '@/lib/qr';

function toLocalISO(d: Date) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export default function EventsScreen() {
  const { user } = useAuth();
  const [events, setEvents] = useState<AdminEvent[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const [selected, setSelected] = useState<AdminEvent | null>(null);
  const [attendees, setAttendees] = useState<AdminAttendance[]>([]);
  const [showQR, setShowQR] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<string | undefined>();
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [venue, setVenue] = useState('');
  const [desc, setDesc] = useState('');
  const [status, setStatus] = useState<'open' | 'closed'>('open');
  const [start, setStart] = useState(new Date());
  const [end, setEnd] = useState(new Date(Date.now() + 3600_000));
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => setEvents(await listAllEvents()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (events ?? []).filter(
      (e) =>
        (filter === 'all' || e.status === filter) &&
        (!t || e.title.toLowerCase().includes(t) || e.event_code.toLowerCase().includes(t))
    );
  }, [events, q, filter]);

  const openDetail = async (e: AdminEvent) => {
    setSelected(e);
    setShowQR(false);
    const all = await listAllAttendance();
    setAttendees(all.filter((x) => x.event_id === e.id));
  };

  const openForm = (e?: AdminEvent) => {
    setErr(null);
    setEditId(e?.id);
    setTitle(e?.title ?? '');
    setCode(e?.event_code ?? '');
    setVenue(e?.venue ?? '');
    setDesc(e?.description ?? '');
    setStatus(e?.status ?? 'open');
    setStart(e?.start_time ? new Date(e.start_time) : new Date());
    setEnd(e?.end_time ? new Date(e.end_time) : new Date(Date.now() + 3600_000));
    setSelected(null);
    setFormOpen(true);
  };

  const submit = async () => {
    setErr(null);
    if (!title.trim() || !code.trim()) return setErr('Event name and code are required.');
    if (end.getTime() <= start.getTime()) return setErr('End time must be after start time.');
    if (!user) return;
    setBusy(true);
    const { error } = await saveEvent(
      {
        event_code: code.trim(), title: title.trim(), venue: venue.trim(), description: desc.trim(),
        status, start_time: start.toISOString(), end_time: end.toISOString(),
      },
      user.id, editId
    );
    setBusy(false);
    if (error) return setErr(error);
    setFormOpen(false);
    load();
  };

  const toggleStatus = async () => {
    if (!selected) return;
    const next = selected.status === 'open' ? 'closed' : 'open';
    const { error } = await setEventStatus(selected.id, next);
    if (error) return Alert.alert('Error', error);
    setSelected({ ...selected, status: next });
    load();
  };

  const remove = () => {
    if (!selected) return;
    Alert.alert('Delete event', 'This also deletes all attendance records for it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const { error } = await deleteEvent(selected.id);
          if (error) return Alert.alert('Error', error);
          setSelected(null);
          load();
        },
      },
    ]);
  };

  return (
    <View style={a.screen}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search event name or code" />
        <View style={a.row}>
          {(['all', 'open', 'closed'] as const).map((f) => (
            <Chip key={f} label={f[0].toUpperCase() + f.slice(1)} active={filter === f} onPress={() => setFilter(f)} />
          ))}
        </View>
        <Btn title="Create Event" icon="add-circle-outline" onPress={() => openForm()} />
      </View>

      <ScrollView contentContainerStyle={a.content}>
        {!events ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : shown.length === 0 ? (
          <Empty text="No events found." />
        ) : (
          shown.map((e) => (
            <Card key={e.id} onPress={() => openDetail(e)}>
              <View style={a.row}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={a.title}>{e.title}</Text>
                  <Text style={a.sub}>{e.event_code}{e.venue ? ` · ${e.venue}` : ''}</Text>
                  <Text style={a.sub}>{formatDT(e.start_time)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Badge label={e.status.toUpperCase()} tone={e.status === 'open' ? 'green' : 'gray'} />
                  <Text style={[a.sub, { marginTop: 6 }]}>{e.attendeeCount} attended</Text>
                </View>
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Sheet visible={!!selected} title="Event Details" onClose={() => setSelected(null)}>
        {selected && (
          <>
            <Text style={[a.title, { marginTop: 8, fontSize: 18 }]}>{selected.title}</Text>
            <Text style={a.sub}>Code: {selected.event_code}</Text>
            <Text style={a.sub}>Venue: {selected.venue || '—'}</Text>
            <Text style={a.sub}>Starts: {formatDT(selected.start_time)}</Text>
            <Text style={a.sub}>Ends: {formatDT(selected.end_time)}</Text>
            <Text style={a.sub}>Description: {selected.description || '—'}</Text>
            <View style={{ marginTop: 8 }}>
              <Badge label={selected.status.toUpperCase()} tone={selected.status === 'open' ? 'green' : 'gray'} />
            </View>

            <Btn title="Edit Event" icon="create-outline" kind="secondary" onPress={() => openForm(selected)} />
            <Btn
              title={selected.status === 'open' ? 'Close Event' : 'Reopen Event'}
              icon={selected.status === 'open' ? 'lock-closed-outline' : 'lock-open-outline'}
              kind="secondary" onPress={toggleStatus}
            />
            <Btn title={showQR ? 'Hide QR' : 'Show QR Code'} icon="qr-code-outline" kind="secondary" onPress={() => setShowQR(!showQR)} />
            {showQR && (
              <View style={{ alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginTop: 12 }}>
                <QRCode
                  size={200}
                  value={buildQRPayload({
                    eventId: selected.event_code,
                    title: selected.title,
                    start: selected.start_time ? toLocalISO(new Date(selected.start_time)) : undefined,
                    end: selected.end_time ? toLocalISO(new Date(selected.end_time)) : undefined,
                  })}
                />
              </View>
            )}

            <Text style={[a.title, { marginTop: 18 }]}>Attendees ({attendees.length})</Text>
            {attendees.length === 0 ? (
              <Text style={a.sub}>No one has attended yet.</Text>
            ) : (
              attendees.map((x) => (
                <Text key={x.id} style={[a.sub, { marginTop: 4 }]}>
                  • {x.studentName} — {formatDT(x.scanned_at)}
                </Text>
              ))
            )}
            <Btn title="Delete Event" icon="trash-outline" kind="danger" onPress={remove} />
          </>
        )}
      </Sheet>

      <Sheet visible={formOpen} title={editId ? 'Edit Event' : 'Create Event'} onClose={() => setFormOpen(false)}>
        <Input label="Event name" value={title} onChangeText={setTitle} placeholder="e.g. Founders Day Assembly" />
        <Input label="Event code" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="e.g. EVT-2026-0010" />
        <Input label="Venue" value={venue} onChangeText={setVenue} placeholder="e.g. School Gymnasium" />
        <Input label="Description" value={desc} onChangeText={setDesc} multiline />
        <DateTimeField label="Starts" value={start} onChange={setStart} />
        <DateTimeField label="Ends" value={end} onChange={setEnd} />
        <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6, color: COLORS.textPrimary }}>Status</Text>
        <View style={a.row}>
          <Chip label="Open" active={status === 'open'} onPress={() => setStatus('open')} />
          <Chip label="Closed" active={status === 'closed'} onPress={() => setStatus('closed')} />
        </View>
        {err && <Text style={a.error}>{err}</Text>}
        <Btn title={busy ? 'Saving...' : 'Save Event'} icon="checkmark" onPress={submit} disabled={busy} />
      </Sheet>
    </View>
  );
}
