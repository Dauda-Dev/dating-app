import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logoutUser } from '../../store/slices/authSlice';
import { COLORS } from '../../constants';

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  const SettingRow = ({
    icon, label, onPress, value, isSwitch,
  }: { icon: string; label: string; onPress?: () => void; value?: boolean; isSwitch?: boolean }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} disabled={isSwitch}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <Text style={styles.rowLabel}>{label}</Text>
      {isSwitch ? (
        <Switch value={value} onValueChange={onPress as any} trackColor={{ true: COLORS.primary }} />
      ) : (
        <Text style={styles.rowArrow}>›</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Account</Text>
        <View style={styles.group}>
          <SettingRow icon="📧" label={user?.email || 'Email'} />
          <SettingRow icon="🔒" label="Change Password" onPress={() => Alert.alert('Coming soon')} />
        </View>

        <Text style={styles.section}>Preferences</Text>
        <View style={styles.group}>
          <SettingRow icon="🔔" label="Push Notifications" isSwitch value={true} onPress={() => {}} />
          <SettingRow icon="📍" label="Location Access" isSwitch value={true} onPress={() => {}} />
        </View>

        <Text style={styles.section}>Subscription</Text>
        <View style={styles.group}>
          <SettingRow
            icon={user?.subscriptionTier === 'gold' ? '🥇' : user?.subscriptionTier === 'premium' ? '⭐' : '🆓'}
            label={`Current plan: ${user?.subscriptionTier || 'free'}`}
          />
          <SettingRow icon="💳" label="Upgrade Plan" onPress={() => (navigation as any).navigate('Subscription')} />
        </View>

        <Text style={styles.section}>Support</Text>
        <View style={styles.group}>
          <SettingRow icon="❓" label="Help & FAQ" onPress={() => Alert.alert('Coming soon')} />
          <SettingRow icon="📝" label="Terms of Service" onPress={() => Alert.alert('Coming soon')} />
          <SettingRow icon="🔐" label="Privacy Policy" onPress={() => Alert.alert('Coming soon')} />
        </View>

        {(user as any)?.role === 'admin' || (user as any)?.role === 'moderator' ? (
          <>
            <Text style={styles.section}>Admin</Text>
            <View style={styles.group}>
              <SettingRow
                icon="🛡️"
                label="Admin Panel — Reports"
                onPress={() => (navigation as any).navigate('Admin')}
              />
            </View>
          </>
        ) : null}

        <Text style={styles.section}>Danger Zone</Text>
        <View style={styles.group}>
          <TouchableOpacity style={[styles.row, styles.rowDanger]} onPress={handleLogout}>
            <Text style={styles.rowIcon}>🚪</Text>
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.row, styles.rowDanger]}
            onPress={() => Alert.alert('Delete Account', 'This action is irreversible. Contact support to delete your account.')}
          >
            <Text style={styles.rowIcon}>🗑️</Text>
            <Text style={[styles.rowLabel, styles.rowLabelDanger]}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  content: { padding: 20, paddingBottom: 48 },
  section: { fontSize: 12, fontWeight: '700', color: COLORS.gray, letterSpacing: 1, marginBottom: 8, marginTop: 8, textTransform: 'uppercase' },
  group: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  rowDanger: { borderBottomColor: '#FFE5E5' },
  rowIcon: { fontSize: 20, marginRight: 14 },
  rowLabel: { flex: 1, fontSize: 15, color: COLORS.black },
  rowLabelDanger: { color: COLORS.danger },
  rowArrow: { fontSize: 22, color: COLORS.lightGray },
});
