import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Image,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { RootState, AppDispatch } from '../../store/store';
import {
  fetchAdminReportDetail,
  reviewAdminReport,
  updateAdminUserStatus,
} from '../../store/slices/adminSlice';
import { AdminUserAction } from '../../types';
import { COLORS } from '../../constants';

type Props = NativeStackScreenProps<MainStackParamList, 'AdminReportDetail'>;

const ACTION_OPTIONS: { label: string; value: AdminUserAction; color: string }[] = [
  { label: 'Suspend 7 days', value: 'suspend_7d', color: '#FF9800' },
  { label: 'Suspend 30 days', value: 'suspend_30d', color: '#F44336' },
  { label: 'Suspend permanently', value: 'suspend_permanent', color: '#B71C1C' },
  { label: 'Deactivate account', value: 'deactivate', color: '#9C27B0' },
  { label: 'Activate account', value: 'activate', color: '#4CAF50' },
];

const REVIEW_STATUSES = [
  { label: '✅ Mark Reviewed', value: 'reviewed', color: '#2196F3' },
  { label: '⚡ Action Taken', value: 'actioned', color: '#4CAF50' },
  { label: '🗑️ Dismiss', value: 'dismissed', color: '#9E9E9E' },
];

export const AdminReportDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { reportId } = route.params;
  const { currentReport, isLoading } = useSelector((s: RootState) => s.admin);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    dispatch(fetchAdminReportDetail(reportId));
  }, [reportId]);

  useEffect(() => {
    if (currentReport?.adminNote) setAdminNote(currentReport.adminNote);
  }, [currentReport?.id]);

  const handleReviewStatus = async (status: string) => {
    setActionLoading(true);
    try {
      await dispatch(reviewAdminReport({ reportId, status, adminNote })).unwrap();
      Alert.alert('Updated', `Report marked as ${status}.`);
    } catch (e: any) {
      Alert.alert('Error', e ?? 'Failed to update report.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUserAction = (userId: string, userName: string) => {
    Alert.alert(
      `Take action on ${userName}`,
      'What would you like to do?',
      [
        ...ACTION_OPTIONS.map((opt) => ({
          text: opt.label,
          style: opt.value === 'activate' ? ('default' as const) : ('destructive' as const),
          onPress: async () => {
            setActionLoading(true);
            try {
              await dispatch(updateAdminUserStatus({ userId, action: opt.value })).unwrap();
              Alert.alert('Done', `${userName}: ${opt.label} applied.`);
            } catch (e: any) {
              Alert.alert('Error', e ?? 'Failed.');
            } finally {
              setActionLoading(false);
            }
          },
        })),
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  if (isLoading || !currentReport) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const reporter = currentReport.reporter as any;
  const reported = currentReport.reportedUser as any;

  const getPhoto = (user: any) =>
    user?.profile?.photos?.[0] ?? null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Detail</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Report meta */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📋 Report Info</Text>
          <Row label="Reason" value={currentReport.reason.replace(/_/g, ' ')} />
          <Row label="Status" value={currentReport.status} />
          <Row label="Filed" value={new Date(currentReport.createdAt).toLocaleString()} />
          {currentReport.details ? <Row label="Details" value={currentReport.details} /> : null}
        </View>

        {/* Reporter */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Reported By</Text>
          <UserCard
            user={reporter}
            onAction={() => handleUserAction(reporter?.id, reporter?.profile?.firstName ?? reporter?.username)}
          />
        </View>

        {/* Reported user */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🚩 Reported User</Text>
          {reported?.isSuspended && (
            <View style={styles.suspendedBanner}>
              <Text style={styles.suspendedText}>⚠️ Account is currently suspended</Text>
            </View>
          )}
          {!reported?.isActive && (
            <View style={[styles.suspendedBanner, { backgroundColor: '#9C27B022' }]}>
              <Text style={[styles.suspendedText, { color: '#9C27B0' }]}>
                ⚠️ Account is deactivated
              </Text>
            </View>
          )}
          <UserCard
            user={reported}
            showActions
            onAction={() =>
              handleUserAction(
                reported?.id,
                reported?.profile?.firstName ?? reported?.username
              )
            }
          />
        </View>

        {/* Admin note */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 Admin Note</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note about this report…"
            placeholderTextColor="#bbb"
            multiline
            value={adminNote}
            onChangeText={setAdminNote}
          />
        </View>

        {/* Review actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚡ Review Actions</Text>
          {REVIEW_STATUSES.map((s) => (
            <TouchableOpacity
              key={s.value}
              style={[styles.actionBtn, { backgroundColor: s.color }]}
              onPress={() => handleReviewStatus(s.value)}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.actionBtnText}>{s.label}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={styles.rowValue}>{value}</Text>
  </View>
);

const UserCard = ({
  user,
  showActions = false,
  onAction,
}: {
  user: any;
  showActions?: boolean;
  onAction: () => void;
}) => {
  const photo = user?.profile?.photos?.[0];
  const name = user?.profile?.firstName ?? user?.username ?? 'Unknown';
  return (
    <View style={styles.userCard}>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.userPhoto} />
      ) : (
        <View style={[styles.userPhoto, styles.userPhotoPlaceholder]}>
          <Text style={{ fontSize: 22 }}>👤</Text>
        </View>
      )}
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={styles.userName}>{name}</Text>
        <Text style={styles.userEmail}>{user?.email ?? ''}</Text>
        {user?.isSuspended && <Text style={styles.badge}>SUSPENDED</Text>}
        {!user?.isActive && <Text style={[styles.badge, { backgroundColor: '#9C27B0' }]}>DEACTIVATED</Text>}
      </View>
      <TouchableOpacity style={styles.actionMiniBtn} onPress={onAction}>
        <Text style={styles.actionMiniText}>⚡ Act</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 22, color: '#555' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  content: { padding: 16, paddingBottom: 60, gap: 16 },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },
  row: { flexDirection: 'row', gap: 8 },
  rowLabel: { fontSize: 12, fontWeight: '700', color: '#999', width: 72 },
  rowValue: { fontSize: 13, color: '#333', flex: 1, textTransform: 'capitalize' },
  suspendedBanner: {
    backgroundColor: '#FF980022',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
  },
  suspendedText: { fontSize: 12, color: '#FF9800', fontWeight: '700' },
  userCard: { flexDirection: 'row', alignItems: 'center' },
  userPhoto: { width: 52, height: 52, borderRadius: 26 },
  userPhotoPlaceholder: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  userEmail: { fontSize: 11, color: '#999', marginTop: 2 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF9800',
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 3,
    overflow: 'hidden',
  },
  actionMiniBtn: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionMiniText: { fontSize: 12, color: COLORS.primary, fontWeight: '700' },
  noteInput: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 6,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
