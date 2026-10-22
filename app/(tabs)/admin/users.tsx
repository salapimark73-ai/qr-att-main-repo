import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';

import {
  adminStyles as a, Badge, Btn, Card, Chip, Empty, Input, SearchBar, Sheet,
} from '@/components/AdminUI';
import { COLORS } from '@/constants/colors';
import { createUser, deleteUser, listUsers, updateUser, type AdminUser } from '@/lib/admin';
import { useAuth } from '@/lib/auth';
import type { Role } from '@/lib/profiles';

const ROLES: Role[] = ['student', 'teacher', 'admin'];
const tone = (r: Role) => (r === 'admin' ? 'red' : r === 'teacher' ? 'blue' : 'green');

export default function UsersScreen() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Role | 'all'>('all');

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('student');

  const [creating, setCreating] = useState(false);
  const [nEmail, setNEmail] = useState('');
  const [nPass, setNPass] = useState('');
  const [nName, setNName] = useState('');
  const [nRole, setNRole] = useState<Role>('student');

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => setUsers(await listUsers()), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (users ?? []).filter(
      (u) =>
        (filter === 'all' || u.role === filter) &&
        (!t || u.email.toLowerCase().includes(t) || (u.full_name ?? '').toLowerCase().includes(t))
    );
  }, [users, q, filter]);

  const openEdit = (u: AdminUser) => {
    setErr(null);
    setEditing(u);
    setName(u.full_name ?? '');
    setRole(u.role);
  };

  const save = async () => {
    if (!editing) return;
    setBusy(true);
    setErr(null);
    const { error } = await updateUser(editing.id, { full_name: name.trim(), role });
    setBusy(false);
    if (error) return setErr(error);
    setEditing(null);
    load();
  };

  const remove = () => {
    if (!editing) return;
    Alert.alert(
      'Delete user',
      `Delete ${editing.email}? Their attendance records will be deleted too.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive',
          onPress: async () => {
            setBusy(true);
            const { error } = await deleteUser(editing.id);
            setBusy(false);
            if (error) return setErr(error);
            setEditing(null);
            load();
          },
        },
      ]
    );
  };

  const create = async () => {
    setErr(null);
    if (!nEmail.trim() || !nName.trim() || nPass.length < 6) {
      return setErr('Name, email and a password of at least 6 characters are required.');
    }
    setBusy(true);
    const { error } = await createUser({
      email: nEmail.trim(), password: nPass, full_name: nName.trim(), role: nRole,
    });
    setBusy(false);
    if (error) return setErr(error);
    setCreating(false);
    setNEmail(''); setNPass(''); setNName(''); setNRole('student');
    load();
  };

  const isMe = editing?.id === me?.id;

  return (
    <View style={a.screen}>
      <View style={{ padding: 20, paddingBottom: 0 }}>
        <SearchBar value={q} onChangeText={setQ} placeholder="Search name or email" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', ...ROLES] as const).map((r) => (
            <Chip key={r} label={r === 'all' ? 'All' : r[0].toUpperCase() + r.slice(1)}
              active={filter === r} onPress={() => setFilter(r)} />
          ))}
        </ScrollView>
        <Btn title="Add User" icon="person-add-outline" onPress={() => { setErr(null); setCreating(true); }} />
      </View>

      <ScrollView contentContainerStyle={a.content}>
        {!users ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : shown.length === 0 ? (
          <Empty text="No users found." />
        ) : (
          shown.map((u) => (
            <Card key={u.id} onPress={() => openEdit(u)}>
              <View style={a.row}>
                <View style={{ flex: 1 }}>
                  <Text style={a.title}>{u.full_name || '(no name)'}</Text>
                  <Text style={a.sub}>{u.email}</Text>
                </View>
                <Badge label={u.role.toUpperCase()} tone={tone(u.role)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>

      <Sheet visible={!!editing} title="Edit User" onClose={() => setEditing(null)}>
        <Text style={[a.sub, { marginTop: 6 }]}>{editing?.email}</Text>
        <Input label="Full name" value={name} onChangeText={setName} />
        <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6, color: COLORS.textPrimary }}>Role</Text>
        <View style={a.row}>
          {ROLES.map((r) => (
            <Chip key={r} label={r} active={role === r} onPress={() => !isMe && setRole(r)} />
          ))}
        </View>
        {isMe && <Text style={a.sub}>You can’t change your own role or delete yourself.</Text>}
        {err && <Text style={a.error}>{err}</Text>}
        <Btn title={busy ? 'Saving...' : 'Save Changes'} icon="checkmark" onPress={save} disabled={busy} />
        {!isMe && <Btn title="Delete User" icon="trash-outline" kind="danger" onPress={remove} disabled={busy} />}
      </Sheet>

      <Sheet visible={creating} title="Add User" onClose={() => setCreating(false)}>
        <Input label="Full name" value={nName} onChangeText={setNName} />
        <Input label="Email" value={nEmail} onChangeText={setNEmail} autoCapitalize="none" keyboardType="email-address" />
        <Input label="Password (min 6)" value={nPass} onChangeText={setNPass} secureTextEntry autoCapitalize="none" />
        <Text style={{ fontSize: 13, fontWeight: '600', marginTop: 12, marginBottom: 6, color: COLORS.textPrimary }}>Role</Text>
        <View style={a.row}>
          {ROLES.map((r) => (
            <Chip key={r} label={r} active={nRole === r} onPress={() => setNRole(r)} />
          ))}
        </View>
        {err && <Text style={a.error}>{err}</Text>}
        <Btn title={busy ? 'Creating...' : 'Create User'} icon="person-add" onPress={create} disabled={busy} />
      </Sheet>
    </View>
  );
}
