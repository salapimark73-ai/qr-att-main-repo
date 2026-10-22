import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, GOLD_EDGE, GOLD_GRADIENT, GOLD_LOCATIONS } from '@/constants/colors';

type Props = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  theme?: 'primary';
  onPress: () => void;
  disabled?: boolean;
};

export default function AppButton({ title, icon, theme, onPress, disabled }: Props) {
  if (theme === 'primary') {
    return (
      <View
        style={[
          styles.buttonOuter,
          { borderWidth: 1, borderColor: GOLD_EDGE, borderRadius: 10 },
          disabled && styles.disabled,
        ]}
      >
        <Pressable
          style={[styles.buttonInner, { overflow: 'hidden' }]}
          onPress={onPress}
          disabled={disabled}
        >
          <LinearGradient
            colors={GOLD_GRADIENT}
            locations={GOLD_LOCATIONS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Ionicons
            name={icon}
            size={22}
            color={COLORS.textOnPrimary}
            style={styles.icon}
          />
          <Text style={[styles.label, styles.labelPrimary, { color: COLORS.textOnPrimary }]}>
            {title}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.buttonOuter, disabled && styles.disabled]}>
      <Pressable
        style={[styles.buttonInner, styles.secondaryFill]}
        onPress={onPress}
        disabled={disabled}
      >
        <Ionicons
          name={icon}
          size={22}
          color={COLORS.textSecondary}
          style={styles.icon}
        />
        <Text style={styles.label}>{title}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  buttonOuter: {
    width: '100%',
    marginBottom: 14,
  },
  buttonInner: {
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryFill: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  disabled: {
    opacity: 0.5,
  },
  icon: { paddingRight: 10 },
  label: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary },
  labelPrimary: { fontWeight: '700' },
});