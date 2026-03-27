import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import { fetchPendingSteals, fetchSentSteals } from '../../store/slices/stealSlice';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { Match } from '../../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const { matches, isLoading } = useAppSelector((s) => s.matches);
  const { incomingRequests, sentRequests } = useAppSelector((s) => s.steals);

  const load = useCallback(() => {
    dispatch(fetchMatches());
    dispatch(fetchPendingSteals());
    dispatch(fetchSentSteals());
  }, [dispatch]);

  useFocusEffect(load);

  const activeMatches = matches.filter((m) => m.status !== 'broken').slice(0, 3);

  const getPartner = (match: Match) => {
    if (!user) return null;
    return match.user1Id === user.id ? match.User2 : match.User1;
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={load} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.firstName} 👋</Text>
          <Text style={styles.subtitle}>Here's what's happening</Text>
        </View>
        {user?.profilePhoto ? (
          <Image source={{ uri: user.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}><Text style={{ fontSize: 24 }}>👤</Text></View>
        )}
      </View>

      {/* Steal notifications */}
      {incomingRequests.length > 0 && (
        <TouchableOpacity style={styles.alertCard} onPress={() => navigation.navigate('Steals')}>
          <Text style={styles.alertText}>
            ⚡ {incomingRequests.length} pending steal request{incomingRequests.length > 1 ? 's' : ''}
          </Text>
          <Text style={styles.alertArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{matches.length}</Text>
          <Text style={styles.statLabel}>Matches</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{matches.filter((m) => m.status === 'video_call_completed').length}</Text>
          <Text style={styles.statLabel}>Video Calls</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNum}>{matches.filter((m) => m.status === 'date_accepted').length}</Text>
          <Text style={styles.statLabel}>Dates</Text>
        </View>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate('Steals' as any)}>
          <Text style={styles.statNum}>{incomingRequests.length + sentRequests.filter((r) => r.status === 'pending').length}</Text>
          <Text style={styles.statLabel}>⚡ Steals</Text>
        </TouchableOpacity>
      </View>

      {/* Recent matches */}
      <Text style={styles.sectionTitle}>Recent Matches</Text>
      {activeMatches.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>💘</Text>
          <Text style={styles.emptyText}>No matches yet — start swiping!</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Tabs' as any)}>
            <Text style={styles.discoverLink}>Go to Discover →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        activeMatches.map((match) => {
          const partner = getPartner(match);
          const config = MATCH_STATUS_CONFIG[match.status];
          return (
            <TouchableOpacity
              key={match.id}
              style={styles.matchCard}
              onPress={() => navigation.navigate('MatchDetails', { matchId: match.id })}
              activeOpacity={0.85}
            >
              {partner?.profilePhoto ? (
                <Image source={{ uri: partner.profilePhoto }} style={styles.matchPhoto} />
              ) : (
                <View style={[styles.matchPhoto, styles.matchPhotoPlaceholder]}>
                  <Text style={{ fontSize: 28 }}>👤</Text>
                </View>
              )}
              <View style={styles.matchInfo}>
                <Text style={styles.matchName}>{partner?.firstName} {partner?.lastName}</Text>
                <Text style={[styles.matchStatus, { color: config?.color }]}>{config?.label}</Text>
              </View>
              <Text style={styles.arrow}>›</Text>
            </TouchableOpacity>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 20, paddingTop: 56 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  greeting: { fontSize: 22, fontWeight: '700', color: COLORS.black },
  subtitle: { fontSize: 14, color: COLORS.gray, marginTop: 2 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  alertCard: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  alertText: { flex: 1, color: COLORS.black, fontWeight: '600' },
  alertArrow: { color: COLORS.warning, fontSize: 18 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14,
    padding: 16, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statNum: { fontSize: 26, fontWeight: '700', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.gray, marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginBottom: 12 },
  emptyCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 32,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: COLORS.gray, fontSize: 15, textAlign: 'center', marginBottom: 12 },
  discoverLink: { color: COLORS.primary, fontWeight: '600', fontSize: 15 },
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  matchPhoto: { width: 56, height: 56, borderRadius: 28 },
  matchPhotoPlaceholder: {
    backgroundColor: COLORS.lightGray,
    alignItems: 'center', justifyContent: 'center',
  },
  matchInfo: { flex: 1, marginLeft: 14 },
  matchName: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  matchStatus: { fontSize: 13, marginTop: 3 },
  arrow: { fontSize: 22, color: COLORS.lightGray },
});
