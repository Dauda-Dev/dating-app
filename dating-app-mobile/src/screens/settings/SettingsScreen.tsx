import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { useTheme } from '../../constants';
import { notificationService } from '../../services/notificationService';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const themeMode = useAppSelector((s) => s.theme.mode);
  const C = useTheme();

  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    notificationService.hasPermission().then(setPushEnabled);
  }, []);

  const handleTogglePush = async () => {
    const hasPerm = await notificationService.hasPermission();
    if (hasPerm) {
      // Already granted — can't revoke programmatically; open settings
      Alert.alert(
        'Disable Notifications',
        'To turn off notifications, go to your device Settings > Apps > Ovally > Notifications.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      const granted = await notificationService.register();
      setPushEnabled(granted);
      if (!granted) {
        Alert.alert(
          'Permission Denied',
          'Allow notifications in device Settings > Apps > Ovally > Notifications.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  const SettingRow = ({
    icon, label, onPress, value, isSwitch,
  }: { icon: string; label: string; onPress?: () => void; value?: boolean; isSwitch?: boolean }) => (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: C.border }]}
      onPress={onPress}
      disabled={isSwitch}
    >
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={[styles.rowLabel, { color: C.black }]}>{label}</Text>
      {isSwitch ? (
        <Switch value={value} onValueChange={onPress as any} trackColor={{ true: C.primary }} thumbColor={C.white} />
      ) : (
        <Text style={[styles.rowArrow, { color: C.lightGray }]}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <View style={[styles.headerBar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.back, { color: C.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.headerText }]}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.section, { color: C.gray }]}>Account</Text>
        <View style={[styles.group, { backgroundColor: C.card }]}>
          <SettingRow icon="📧" label={user?.email || 'Email'} />
          <SettingRow icon="🔒" label="Change Password" onPress={() => Alert.alert('Coming soon')} />
        </View>

        <Text style={[styles.section, { color: C.gray }]}>Appearance</Text>
        <View style={[styles.group, { backgroundColor: C.card }]}>
          <SettingRow
            icon={themeMode === 'dark' ? '🌙' : '☀️'}
            label={themeMode === 'dark' ? 'Dark Mode' : 'Light Mode'}
            isSwitch
            value={themeMode === 'dark'}
            onPress={() => dispatch(toggleTheme(themeMode))}
          />
        </View>

        <Text style={[styles.section, { color: C.gray }]}>Preferences</Text>
        <View style={[styles.group, { backgroundColor: C.card }]}>
          <SettingRow icon="🔔" label="Push Notifications" isSwitch value={pushEnabled} onPress={handleTogglePush} />
          <SettingRow icon="📍" label="Location Access" isSwitch value={true} onPress={() => {}} />
        </View>

        <Text style={[styles.section, { color: C.gray }]}>Subscription</Text>
        <View style={[styles.group, { backgroundColor: C.card }]}>
          <SettingRow
            icon={user?.subscriptionTier === 'gold' ? '🥇' : user?.subscriptionTier === 'premium' ? '⭐' : '🆓'}
            label={`Current plan: ${user?.subscriptionTier || 'free'}`}
          />
          <SettingRow icon="💳" label="Upgrade Plan" onPress={() => (navigation as any).navigate('Subscription')} />
        </View>

        <Text style={[styles.section, { color: C.gray }]}>Support</Text>
        <View style={[styles.group, { backgroundColor: C.card }]}>
          <SettingRow icon="❓" label="Help & FAQ" onPress={() => Alert.alert('Coming soon')} />
          <SettingRow icon="📝" label="Terms of Service" onPress={() => Alert.alert('Coming soon')} />
          <SettingRow icon="🔐" label="Privacy Policy" onPress={() => Alert.alert('Coming soon')} />
        </View>

        {(user as any)?.role === 'admin' || (user as any)?.role === 'moderator' ? (
          <>
            <Text style={[styles.section, { color: C.gray }]}>Admin</Text>
            <View style={[styles.group, { backgroundColor: C.card }]}>
              <SettingRow
                icon="🛡️"
                label="Admin Panel — Reports"
                onPress={() => (navigation as any).navigate('Admin')}
              />
            </View>
          </>
        ) : null}

        <Text style={[styles.section, { color: C.gray }]}>Danger Zone</Text>
        <View style={[styles.group, { backgroundColor: C.card }]}>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.isDark ? '#3A1A1A' : '#FFE5E5' }]}
            onPress={handleLogout}
          >
            <Text style={styles.rowIcon}>🚪</Text>
            <Text style={[styles.rowLabel, { color: C.danger }]}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, { borderBottomColor: C.isDark ? '#3A1A1A' : '#FFE5E5' }]}
            onPress={() => Alert.alert('Delete Account', 'This action is irreversible. Contact support to delete your account.')}
          >
            <Text style={styles.rowIcon}>🗑️</Text>
            <Text style={[styles.rowLabel, { color: C.danger }]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    borderBottomWidth: 1,
  },
  back: { fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '700' },
  content: { padding: 20, paddingBottom: 48 },
  section: {
    fontSize: 12, fontWeight: '700', letterSpacing: 1,
    marginBottom: 8, marginTop: 8, textTransform: 'uppercase',
  },
  group: {
    borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1,
  },
  rowIcon: { fontSize: 20, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 15 },
  rowArrow: { fontSize: 22 },
});
