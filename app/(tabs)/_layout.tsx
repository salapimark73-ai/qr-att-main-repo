<<<<<<< HEAD
import { Redirect, Tabs, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';
import { useRole } from '@/lib/useRole';

export default function TabLayout() {
  const { role, loading } = useRole();
  const segments = useSegments() as string[];

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isAdmin = role === 'admin';
  // Admins land on the Admin tab instead of the student Home screen.
  const adminNeedsRedirect = isAdmin && (segments.length <= 1 || segments[1] === 'index');
  // Student/teacher tabs are hidden for admins; the Admin tab is hidden for everyone else.
  const hideForAdmin = isAdmin ? { href: null } : {};
  // Hide the tabs that would only show a lock screen: Scan for teachers, Teacher for students.
  const hideScan = isAdmin || role === 'teacher' ? { href: null } : {};
  const hideTeacher = role === 'teacher' ? {} : { href: null };

  return (
    <>
    {adminNeedsRedirect && <Redirect href="/(tabs)/admin" />}
=======
import { Tabs } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

import { COLORS } from '@/constants/colors';

export default function TabLayout() {
  return (
>>>>>>> 65bf6a200c5b27c1ecdc112e2c943375defdf48e
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.primary,
        headerStyle: { backgroundColor: COLORS.background },
        headerShadowVisible: false,
        headerTintColor: COLORS.textPrimary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
        },
      }}
    >
      <Tabs.Screen
<<<<<<< HEAD
        name="admin"
        options={{
          title: 'Admin',
          headerShown: false,
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'shield-checkmark' : 'shield-checkmark-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          ...hideForAdmin,
=======
        name="index"
        options={{
>>>>>>> 65bf6a200c5b27c1ecdc112e2c943375defdf48e
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home-sharp' : 'home-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
<<<<<<< HEAD
          ...hideScan,
=======
>>>>>>> 65bf6a200c5b27c1ecdc112e2c943375defdf48e
          title: 'Scan',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'qr-code' : 'qr-code-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
<<<<<<< HEAD
          ...hideForAdmin,
=======
>>>>>>> 65bf6a200c5b27c1ecdc112e2c943375defdf48e
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'time' : 'time-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
      <Tabs.Screen
    name="teacher"
    options={{
<<<<<<< HEAD
    ...hideTeacher,
=======
>>>>>>> 65bf6a200c5b27c1ecdc112e2c943375defdf48e
    title: 'Teacher',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons
        name={focused ? 'clipboard' : 'clipboard-outline'}
        color={color}
        size={24}
      />
    ),
  }}
/>
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              color={color}
              size={24}
            />
          ),
        }}
      />
    </Tabs>
<<<<<<< HEAD
    </>
=======
>>>>>>> 65bf6a200c5b27c1ecdc112e2c943375defdf48e
  );
}
