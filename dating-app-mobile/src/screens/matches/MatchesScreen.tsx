import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import { apiClient } from '../../services/apiClient';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { Match, User } from '../../types';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const MatchesScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const { matches, isLoading } = useAppSelector((s) => s.matches);

  const [tab, setTab] = useState<'matches' | 'liked-me'>('matches');
  const [likedMe, setLikedMe] = useState<User[]>([]);
  const [likedMeLoading, setLikedMeLoading] = useState(false);

  const tier = user?.subscriptionTier || 'free';
  const canSeeLikedMe = tier === 'premium' || tier === 'gold';

  const loadLikedMe = useCallback(async () => {
    if (!canSeeLikedMe) return;
    setLikedMeLoading(true);
    try {
      const data = await apiClient.getLikedMe(20, 0);
      setLikedMe(data.users || []);
    } catch {
      // non-critical
    } finally {
      setLikedMeLoading(false);
    }
  }, [canSeeLikedMe]);

  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMatches());
      if (tab === 'liked-me') loadLikedMe();
    }, [tab, loadLikedMe])
  );

  const getPartner = (match: Match) => {
    if (!user) return null;
    return match.user1Id === user.id ? match.User2 : match.User1;
  };

  const active = matches.filter((m) => m.status !== 'broken');
  const broken = matches.filter((m) => m.status === 'broken');

  const renderMatch = ({ item }: { item: Match }) => {
    const partner = getPartner(item);
    const config = MATCH_STATUS_CONFIG[item.status];
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('MatchDetails', { matchId: item.id })}
        activeOpacity={0.85}
      >
        {partner?.profilePhoto ? (
          <Image source={{ uri: partner.profilePhoto }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={{ fontSize: 28 }}>👤</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={styles.name}>{partner?.firstName} {partner?.lastName}</Text>
          <Text style={[styles.status, { color: config?.color }]}>{config?.label}</Text>
          {item.compatibilityScore != null && (
            <Text style={styles.compat}>⚡ {item.compatibilityScore}% compatible</Text>
          )}
        </View>
        <View style={styles.action}>
          {config?.action ? (
            <Text style={[styles.actionLabel, { color: config.color }]}>{config.action}</Text>
          ) : null}
          <Text style={styles.arrow}>›</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>My Matches 💘</Text>

      {/* Tab switcher */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'matches' && styles.tabActive]}
          onPress={() => setTab('matches')}
        >
          <Text style={[styles.tabText, tab === 'matches' && styles.tabTextActive]}>
            Matches {active.length > 0 ? `(${active.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'liked-me' && styles.tabActive]}
          onPress={() => {
            setTab('liked-me');
            loadLikedMe();
          }}
        >
          <Text style={[styles.tabText, tab === 'liked-me' && styles.tabTextActive]}>
            Liked Me {canSeeLikedMe && likedMe.length > 0 ? `(${likedMe.length})` : ''} {!canSeeLikedMe ? '🔒' : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Matches tab ── */}
      {tab === 'matches' && (
        <FlatList
          data={active}
          keyExtractor={(m) => m.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchMatches())} tintColor={COLORS.primary} />}
          ListEmptyComponent={
            !isLoading ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>💘</Text>
                <Text style={styles.emptyText}>No matches yet!</Text>
                <Text style={styles.emptyHint}>Start swiping in Discover to find matches.</Text>
              </View>
            ) : null
          }
          ListFooterComponent={
            broken.length > 0 ? (
              <>
                <Text style={styles.sectionLabel}>Past Connections</Text>
                {broken.map((m) => (
                  <View key={m.id}>
                    {renderMatch({ item: m })}
                  </View>
                ))}
              </>
            ) : null
          }
        />
      )}

      {/* ── Liked Me tab ── */}
      {tab === 'liked-me' && (
        canSeeLikedMe ? (
          likedMeLoading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <FlatList
              data={likedMe}
              keyExtractor={(u) => u.id}
              contentContainerStyle={styles.list}
              refreshControl={<RefreshControl refreshing={likedMeLoading} onRefresh={loadLikedMe} tintColor={COLORS.primary} />}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>👀</Text>
                  <Text style={styles.emptyText}>Nobody yet!</Text>
                  <Text style={styles.emptyHint}>When someone likes you, they'll show up here.</Text>
                </View>
              }
              renderItem={({ item }) => {
                const age = item.dateOfBirth
                  ? Math.floor((Date.now() - new Date(item.dateOfBirth).getTime()) / 3.156e10)
                  : null;
                return (
                  <View style={styles.card}>
                    {item.profilePhoto ? (
                      <Image source={{ uri: item.profilePhoto }} style={styles.avatar} />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={{ fontSize: 28 }}>👤</Text>
                      </View>
                    )}
                    <View style={styles.info}>
                      <Text style={styles.name}>
                        {item.firstName} {item.lastName}{age ? `, ${age}` : ''}
                      </Text>
                      {item.subscriptionTier === 'gold' && (
                        <Text style={styles.goldBadge}>🥇 Gold</Text>
                      )}
                    </View>
                    <Text style={styles.arrow}>›</Text>
                  </View>
                );
              }}
            />
          )
        ) : (
          /* Upgrade prompt for Free users */
          <View style={styles.upgradeWrap}>
            <Text style={styles.upgradeEmoji}>👀</Text>
            <Text style={styles.upgradeTitle}>See Who Liked You</Text>
            <Text style={styles.upgradeBody}>
              Upgrade to Premium or Gold to see everyone who has liked your profile.
            </Text>
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={styles.upgradeBtnText}>Upgrade to Premium ✨</Text>
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.black, padding: 20, paddingTop: 56, paddingBottom: 0 },
  tabs: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: COLORS.lightGray, marginBottom: 4,
  },
  tab: {
    flex: 1, paddingVertical: 12, alignItems: 'center',
    borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: COLORS.gray },
  tabTextActive: { color: COLORS.primary },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  avatar: { width: 60, height: 60, borderRadius: 30 },
  avatarPlaceholder: {
    backgroundColor: COLORS.lightGray,
    alignItems: 'center', justifyContent: 'center',
  },
  info: { flex: 1, marginLeft: 14 },
  name: { fontSize: 16, fontWeight: '600', color: COLORS.black },
  status: { fontSize: 12, marginTop: 3 },
  compat: { fontSize: 11, color: COLORS.gray, marginTop: 2 },
  goldBadge: { fontSize: 11, color: '#D97706', fontWeight: '700', marginTop: 3 },
  action: { alignItems: 'flex-end' },
  actionLabel: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  arrow: { fontSize: 24, color: COLORS.lightGray },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: COLORS.black },
  emptyHint: { color: COLORS.gray, marginTop: 6, textAlign: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.gray, marginVertical: 12 },
  // Upgrade prompt
  upgradeWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  upgradeEmoji: { fontSize: 64, marginBottom: 16 },
  upgradeTitle: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: 10, textAlign: 'center' },
  upgradeBody: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  upgradeBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
