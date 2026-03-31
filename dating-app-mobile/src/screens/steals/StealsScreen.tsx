import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Image, Alert, RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchPendingSteals, fetchSentSteals,
  acceptSteal, rejectSteal, cancelSteal,
} from '../../store/slices/stealSlice';
import { COLORS } from '../../constants';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending',  color: '#B45309', bg: '#FEF3C7' },
  accepted: { label: 'Accepted', color: '#065F46', bg: '#D1FAE5' },
  rejected: { label: 'Declined', color: '#991B1B', bg: '#FEE2E2' },
  expired:  { label: 'Expired',  color: '#6B7280', bg: '#F3F4F6' },
};

export const StealsScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { incomingRequests, sentRequests, isLoading, isSentLoading } = useAppSelector((s) => s.steals);
  const { user } = useAppSelector((s) => s.auth);
  const [tab, setTab] = useState<'received' | 'sent'>('received');

  const isGold = user?.subscriptionTier === 'gold';

  useEffect(() => {
    dispatch(fetchPendingSteals());
    dispatch(fetchSentSteals());
  }, []);

  const refresh = () => {
    if (tab === 'received') dispatch(fetchPendingSteals());
    else dispatch(fetchSentSteals());
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚡ Steal Requests</Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'received' && styles.tabActive]}
          onPress={() => setTab('received')}
        >
          <Text style={[styles.tabText, tab === 'received' && styles.tabTextActive]}>
            Received {incomingRequests.length > 0 ? `(${incomingRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'sent' && styles.tabActive]}
          onPress={() => setTab('sent')}
        >
          <Text style={[styles.tabText, tab === 'sent' && styles.tabTextActive]}>
            Sent {sentRequests.length > 0 ? `(${sentRequests.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Gold upgrade banner for non-gold users */}
      {!isGold && (
        <TouchableOpacity
          style={styles.upgradeBanner}
          onPress={() => navigation.navigate('Subscription')}
          activeOpacity={0.85}
        >
          <Text style={styles.upgradeBannerText}>
            🥇 <Text style={{ fontWeight: '700' }}>Gold Plan required</Text> to send steal requests · Tap to upgrade
          </Text>
        </TouchableOpacity>
      )}

      {/* Received list */}
      {tab === 'received' && (
        <FlatList
          data={incomingRequests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={refresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>⚡</Text>
                <Text style={styles.emptyText}>No pending steal requests</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              {item.requester?.profilePhoto ? (
                <Image source={{ uri: item.requester.profilePhoto }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
              )}
              <View style={styles.info}>
                <Text style={styles.name}>
                  {item.requester?.firstName} {item.requester?.lastName}
                </Text>
                {item.message ? <Text style={styles.message}>"{item.message}"</Text> : null}
                <Text style={styles.expires}>
                  Expires {new Date(item.expiresAt).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.btnGroup}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={() =>
                    Alert.alert(
                      'Accept Steal?',
                      `Let ${item.requester?.firstName} steal you from your current match?`,
                      [
                        { text: 'Not now', style: 'cancel' },
                        {
                          text: 'Accept',
                          onPress: async () => {
                            const result = await dispatch(acceptSteal(item.id));
                            if (acceptSteal.fulfilled.match(result)) {
                              Alert.alert('✅ Done!', 'New match created!');
                            } else {
                              Alert.alert('Error', result.payload as string);
                            }
                          },
                        },
                      ]
                    )
                  }
                >
                  <Text style={styles.acceptText}>✓</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.rejectBtn]}
                  onPress={() =>
                    Alert.alert(
                      'Decline?',
                      'Decline this steal request?',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Decline',
                          style: 'destructive',
                          onPress: async () => {
                            const result = await dispatch(rejectSteal(item.id));
                            if (rejectSteal.rejected.match(result)) {
                              Alert.alert('Error', result.payload as string);
                            }
                          },
                        },
                      ]
                    )
                  }
                >
                  <Text style={styles.rejectText}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Sent list */}
      {tab === 'sent' && (
        <FlatList
          data={sentRequests}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isSentLoading} onRefresh={refresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            !isSentLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>📤</Text>
                <Text style={styles.emptyText}>You haven't sent any steal requests</Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.expired;
            const target = (item as any).Target ?? item.targetUser;
            return (
              <View style={styles.card}>
                {target?.profilePhoto ? (
                  <Image source={{ uri: target.profilePhoto }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={{ fontSize: 24 }}>👤</Text>
                  </View>
                )}
                <View style={styles.info}>
                  <Text style={styles.name}>
                    {target?.firstName ?? '?'} {target?.lastName ?? ''}
                  </Text>
                  {item.message ? <Text style={styles.message}>"{item.message}"</Text> : null}
                  <Text style={styles.expires}>
                    Sent {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                {item.status === 'pending' && (
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.cancelBtn]}
                    onPress={() =>
                      Alert.alert(
                        'Cancel Request?',
                        'Cancel your steal request?',
                        [
                          { text: 'No', style: 'cancel' },
                          {
                            text: 'Cancel Request',
                            style: 'destructive',
                            onPress: () => dispatch(cancelSteal(item.id)),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.rejectText}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          }}
        />
      )}
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
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary },
  upgradeBanner: {
    backgroundColor: '#FFFBEB', borderBottomWidth: 1, borderBottomColor: '#FDE68A',
    paddingHorizontal: 16, paddingVertical: 10,
  },
  upgradeBannerText: { fontSize: 13, color: '#92400E', textAlign: 'center' },
  list: { padding: 16, paddingBottom: 48 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { color: COLORS.gray, fontSize: 15 },
  card: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 6, elevation: 2,
  },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: '600', color: COLORS.black },
  message: { fontSize: 13, color: COLORS.gray, fontStyle: 'italic', marginTop: 2 },
  expires: { fontSize: 11, color: COLORS.gray, marginTop: 3 },
  badge: { alignSelf: 'flex-start', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginTop: 5 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  btnGroup: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: COLORS.success },
  rejectBtn: { backgroundColor: COLORS.danger },
  cancelBtn: { backgroundColor: COLORS.danger },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  rejectText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
