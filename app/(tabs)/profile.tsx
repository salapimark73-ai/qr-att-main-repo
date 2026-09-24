import { useCallback, useState } from 'react';
import { StyleSheet, Text, TextInput, View, Alert, ActivityIndicator } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';

import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import { getProfile, updateProfile, type Profile } from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    setProfileLoading(true);
    const p = await getProfile(user.id);
    setProfile(p);
    setDraftName(p?.full_name ?? '');
    setProfileLoading(false);
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleSaveName = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await updateProfile(user.id, { full_name: draftName.trim() });
    setSaving(false);
    if (error) {
      Alert.alert('Error', error);
    } else {
      setProfile((prev) => (prev ? { ...prev, full_name: draftName.trim() } : prev));
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await signOut();
      setTimeout(() => {
        router.replace('/login');
      }, 0);
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to sign out.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Profile</Text>

      {user && (
        <View style={styles.infoCard}>
          {profileLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              {profile?.role === 'teacher' ? (
                <View style={styles.roleBadge}>
                  <Text style={styles.roleBadgeText}>Teacher</Text>
                </View>
              ) : (
                <View style={[styles.roleBadge, styles.roleBadgeStudent]}>
                  <Text style={styles.roleBadgeText}>Student</Text>
                </View>
              )}

              <Text style={styles.label}>Name</Text>
              {editing ? (
                <View style={styles.nameEditRow}>
                  <TextInput
                    style={styles.nameInput}
                    value={draftName}
                    onChangeText={setDraftName}
                    placeholder="Your name"
                    placeholderTextColor={COLORS.textSecondary}
                    editable={!saving}
                  />
                  <AppButton
                    title={saving ? 'Saving...' : 'Save'}
                    icon="checkmark-outline"
                    onPress={handleSaveName}
                    disabled={saving}
                  />
                </View>
              ) : (
                <View style={styles.nameRow} onTouchEnd={() => setEditing(true)}>
                  <Text style={styles.value}>
                    {profile?.full_name || 'Tap to add your name'}
                  </Text>
                  <Text style={styles.editHint}>Edit</Text>
                </View>
              )}

              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{user.email}</Text>

              <Text style={styles.label}>User ID</Text>
              <Text style={styles.valueSmall}>{user.id}</Text>
            </>
          )}
        </View>
      )}

      <AppButton
        title="Sign Out"
        icon="log-out-outline"
        onPress={handleSignOut}
        disabled={loading}
      />
    </View>
  );
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
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 8,
  },
  roleBadgeStudent: {
    backgroundColor: COLORS.surface,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textOnPrimary,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editHint: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
  nameEditRow: {
    flexDirection: 'column',
  },
  nameInput: {
    backgroundColor: COLORS.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
});
