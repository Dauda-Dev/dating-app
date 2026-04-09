import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useDispatch, useSelector } from 'react-redux';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { RootState, AppDispatch } from '../../store/store';
import { fetchAdminReports } from '../../store/slices/adminSlice';
import { Report } from '../../types';
import { COLORS } from '../../constants';

type Props = NativeStackScreenProps<MainStackParamList, 'Admin'>;

const STATUS_TABS = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Actioned', value: 'actioned' },
  { label: 'Dismissed', value: 'dismissed' },
];

const STATUS_COLORS: Record<string, string> = {
  pending: '#FF9800',
  reviewed: '#2196F3',
  actioned: '#4CAF50',
  dismissed: '#9E9E9E',
};

export const AdminScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { reports, isLoading, pagination } = useSelector((s: RootState) => s.admin);
  const [activeStatus, setActiveStatus] = useState('');

  const load = (status = activeStatus) => {
    dispatch(fetchAdminReports({ status: status || undefined }));
  };

  useEffect(() => {
    load();
  }, [activeStatus]);

  const renderReport = ({ item }: { item: Report }) => {
    const reportedName =
      (item.reportedUser as any)?.profile?.firstName ??
      (item.reportedUser as any)?.username ??
      'Unknown';
    const reporterName =
      (item.reporter as any)?.profile?.firstName ??
      (item.reporter as any)?.username ??
      'Unknown';

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('AdminReportDetail', { reportId: item.id })}
        activeOpacity={0.8}
      >
        <View style={styles.cardTop}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[item.status] + '22' }]}>
            <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] }]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.cardDate}>
            {new Date(item.createdAt).toLocaleDateString()}
          </Text>
        </View>

        <Text style={styles.cardTitle}>
          <Text style={styles.bold}>{reporterName}</Text>
          {' reported '}
          <Text style={styles.bold}>{reportedName}</Text>
        </Text>
        <Text style={styles.cardReason}>{item.reason.replace(/_/g, ' ')}</Text>
        {item.details ? (
          <Text style={styles.cardDetails} numberOfLines={2}>{item.details}</Text>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin — Reports</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* Status filter tabs */}
      <FlatList
        horizontal
        data={STATUS_TABS}
        keyExtractor={(t) => t.value}
        contentContainerStyle={styles.tabs}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: tab }) => (
          <TouchableOpacity
            style={[styles.tab, activeStatus === tab.value && styles.tabActive]}
            onPress={() => setActiveStatus(tab.value)}
          >
            <Text style={[styles.tabText, activeStatus === tab.value && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* List */}
      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        renderItem={renderReport}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={() => load()} colors={[COLORS.primary]} />
        }
        ListEmptyComponent={
          isLoading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No reports found 🎉</Text>
            </View>
          )
        }
        ListFooterComponent={
          pagination && pagination.pages > 1 ? (
            <Text style={styles.paginationInfo}>
              Page 1 of {pagination.pages} · {pagination.total} total
            </Text>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
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
  tabs: { paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#555' },
  tabTextActive: { color: '#fff' },
  list: { padding: 14, paddingBottom: 40, gap: 10 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  cardDate: { fontSize: 11, color: '#999' },
  cardTitle: { fontSize: 14, color: '#333', marginBottom: 4 },
  bold: { fontWeight: '700', color: '#1a1a1a' },
  cardReason: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
    textTransform: 'capitalize',
    marginBottom: 4,
  },
  cardDetails: { fontSize: 12, color: '#888', lineHeight: 17 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 16, color: '#999' },
  paginationInfo: { textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 12 },
});
