import Ionicons from '@expo/vector-icons/Ionicons';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { COLORS, GOLD_EDGE, GOLD_GRADIENT, GOLD_LOCATIONS } from '@/constants/colors';

const Gold = () => (
  <LinearGradient
    colors={GOLD_GRADIENT}
    locations={GOLD_LOCATIONS}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={StyleSheet.absoluteFill}
  />
);

export function Badge({ label, tone }: { label: string; tone: 'green' | 'gray' | 'orange' | 'red' | 'blue' }) {
  const map = {
    green: ['#2B2512', '#E6C65C'],
    gray: ['#2A2A2A', COLORS.textSecondary],
    orange: ['#33260F', COLORS.warning],
    red: ['#3A1B19', '#FF8A80'],
    blue: ['#1F2A38', '#7FB2E5'],
  } as const;
  return (
    <View style={[s.badge, { backgroundColor: map[tone][0] }]}>
      <Text style={[s.badgeText, { color: map[tone][1] }]}>{label}</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && s.chipActive]}>
      {active && <Gold />}
      <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export function Btn({
  title, icon, onPress, kind = 'primary', disabled,
}: {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  kind?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}) {
  const bg = kind === 'primary' ? COLORS.primary : kind === 'danger' ? COLORS.danger : COLORS.card;
  const fg = kind === 'secondary' ? COLORS.textPrimary : kind === 'primary' ? COLORS.textOnPrimary : '#fff';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        s.btn,
        {
          backgroundColor: bg,
          overflow: 'hidden',
          borderColor: kind === 'secondary' ? COLORS.border : kind === 'primary' ? GOLD_EDGE : bg,
        },
        disabled && { opacity: 0.5 },
      ]}
    >
      {kind === 'primary' && <Gold />}
      {icon && <Ionicons name={icon} size={18} color={fg} style={{ marginRight: 6 }} />}
      <Text style={[s.btnText, { color: fg }]}>{title}</Text>
    </Pressable>
  );
}

export function Input({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor={COLORS.textSecondary}
        {...props}
        style={[s.input, props.multiline && { minHeight: 70, textAlignVertical: 'top' }]}
      />
    </View>
  );
}

export function SearchBar(props: TextInputProps) {
  return (
    <View style={s.search}>
      <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} />
      <TextInput
        placeholderTextColor={COLORS.textSecondary}
        autoCapitalize="none"
        {...props}
        style={s.searchInput}
      />
    </View>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={s.empty}>{text}</Text>;
}

export function Card({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={s.card}>
      {children}
    </Pressable>
  );
}

export function Sheet({
  visible, title, onClose, children,
}: { visible: boolean; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.sheetHeader}>
            <Text style={s.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={COLORS.textPrimary} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function fmt(d: Date) {
  return d.toLocaleString('en-US', {
    month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function DateTimeField({
  label, value, onChange,
}: { label: string; value: Date; onChange: (d: Date) => void }) {
  const [open, setOpen] = useState(false);
  const [part, setPart] = useState<'date' | 'time'>('date');
  const android = Platform.OS === 'android';

  const handle = (e: DateTimePickerEvent, selected?: Date) => {
    if (e.type === 'dismissed' || !selected) {
      setOpen(false);
      setPart('date');
      return;
    }
    const next = new Date(value);
    next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
    onChange(next);
    if (android && part === 'date') setPart('time');
    else {
      setOpen(false);
      setPart('date');
    }
  };

  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <Pressable style={s.dateField} onPress={() => { setPart('date'); setOpen(true); }}>
        <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
        <Text style={s.dateText}>{fmt(value)}</Text>
      </Pressable>
      {open && (
        <DateTimePicker
          value={value}
          mode={android ? part : 'datetime'}
          display={android ? 'default' : 'spinner'}
          themeVariant="dark"
          onChange={handle}
        />
      )}
    </View>
  );
}

export const formatDT = (iso: string | null) => (iso ? fmt(new Date(iso)) : '—');

export const adminStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingBottom: 40 },
  row: { flexDirection: 'row', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  error: { color: COLORS.danger, fontSize: 13, marginTop: 10 },
  gap: { height: 12 },
});

const s = StyleSheet.create({
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  chip: {
    backgroundColor: COLORS.surface, borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 7, marginRight: 8,
  },
  chipActive: { backgroundColor: COLORS.primary, overflow: 'hidden' },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.primary },
  chipTextActive: { color: COLORS.textOnPrimary },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, paddingVertical: 13, paddingHorizontal: 16, marginTop: 10,
  },
  btnText: { fontSize: 15, fontWeight: '700' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: COLORS.textPrimary,
  },
  search: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, color: COLORS.textPrimary },
  empty: { textAlign: 'center', color: COLORS.textSecondary, marginTop: 30, fontSize: 14 },
  card: {
    backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '90%',
  },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  dateField: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 12, paddingVertical: 12,
  },
  dateText: { marginLeft: 10, fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
});
