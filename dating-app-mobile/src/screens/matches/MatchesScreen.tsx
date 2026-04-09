import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, ScrollView,
  TouchableOpacity, RefreshControl, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import { loadUnreadCounts } from '../../store/slices/chatSlice';
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
  const { unreadCounts } = useAppSelector((s) => s.chat);

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
      dispatch(loadUnreadCounts());
      if (tab === 'liked-me') loadLikedMe();
    }, [tab, loadLikedMe])
  );

  const getPartner = (match: Match) => {
    if (!user) return null;
    return match.user1Id === user.id ? match.User2 : match.User1;
  };

  const active = matches.filter((m: Match) => m.status !== 'broken');
  const broken = matches.filter((m: Match) => m.status === 'broken');
  const newMatches = active.filter((m: Match) => m.status === 'matched_locked').slice(0, 12);
  const conversationMatches = active.filter((m: Match) => m.status !== 'matched_locked');

  const renderLikedMeItem = ({ item }: { item: User & { isSuperLike?: boolean; likedAt?: string } }) => {
    const age = item.dateOfBirth
      ? Math.floor((Date.now() - new Date(item.dateOfBirth).getTime()) / 3.156e10)
      : null;
    return (
      <View style={styles.msgRow}>
        <View style={styles.avatarWrap}>
          {item.profilePhoto
            ? <Image source={{ uri: item.profilePhoto }} style={styles.msgAvatar} />
            : <View style={[styles.msgAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 24 }}>👤</Text></View>}
          {item.isSuperLike && (
            <View style={styles.superLikeBadge}>
              <Text style={{ fontSize: 11 }}>⭐</Text>
            </View>
          )}
        </View>
        <View style={styles.msgBody}>
          <Text style={styles.msgName}>{item.firstName} {item.lastName}{age ? `, ${age}` : ''}</Text>
          {item.isSuperLike
            ? <Text style={styles.superLikeBadgeText}>⭐ Super Liked you</Text>
            : <Text style={styles.likedYouText}>💚 Liked you</Text>}
          {item.subscriptionTier === 'gold' && <Text style={styles.goldBadge}>🥇 Gold</Text>}
        </View>
        <Text style={styles.msgArrow}>›</Text>
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Tinder-style gradient header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>💘 Matches</Text>

        {/* Tinder-style tab pills */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabPill, tab === 'matches' && styles.tabPillActive]}
            onPress={() => setTab('matches')}
          >
            <Text style={[styles.tabPillText, tab === 'matches' && styles.tabPillTextActive]}>
              Matches{active.length > 0 ? ` (${active.length})` : ''}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabPill, tab === 'liked-me' && styles.tabPillActive]}
            onPress={() => { setTab('liked-me'); loadLikedMe(); }}
          >
            <Text style={[styles.tabPillText, tab === 'liked-me' && styles.tabPillTextActive]}>
              Liked Me {!canSeeLikedMe ? '🔒' : likedMe.length > 0 ? `(${likedMe.length})` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── MATCHES TAB ── */}
      {tab === 'matches' && (
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isLoading} onRefresh={() => dispatch(fetchMatches())} tintColor={COLORS.primary} />
          }
        >
          {/* New Matches — horizontal avatar circles */}
          {newMatches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>New Matches</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.newMatchRow}>
                {newMatches.map((match) => {
                  const partner = getPartner(match);
                  return (
                    <TouchableOpacity
                      key={match.id}
                      style={styles.newMatchItem}
                      onPress={() => navigation.navigate('MatchDetails', { matchId: match.id })}
                      activeOpacity={0.8}
                    >
                      <View style={styles.newMatchAvatarWrap}>
                        {partner?.profilePhoto
                          ? <Image source={{ uri: partner.profilePhoto }} style={styles.newMatchAvatar} />
                          : <View style={[styles.newMatchAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 28 }}>👤</Text></View>}
                        <View style={styles.onlineDot} />
                      </View>
                      <Text style={styles.newMatchName} numberOfLines={1}>{partner?.firstName}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Conversations / active matches */}
          {conversationMatches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Messages</Text>
              {conversationMatches.map((item) => {
                const partner = getPartner(item);
                const config = MATCH_STATUS_CONFIG[item.status];
                const unread = unreadCounts[item.id] || 0;
                const canChat = ['video_call_completed', 'date_accepted', 'post_date_open'].includes(item.status);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.msgRow}
                    onPress={() => canChat
                      ? navigation.navigate('Chat', { matchId: item.id })
                      : navigation.navigate('MatchDetails', { matchId: item.id })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.avatarWrap}>
                      {partner?.profilePhoto
                        ? <Image source={{ uri: partner.profilePhoto }} style={styles.msgAvatar} />
                        : <View style={[styles.msgAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 24 }}>👤</Text></View>}
                      {unread > 0 && (
                        <View style={styles.unreadBadge}>
                          <Text style={styles.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.msgBody}>
                      <Text style={styles.msgName}>{partner?.firstName} {partner?.lastName}</Text>
                      <Text style={[styles.msgStatus, { color: config?.color }]}>
                        {canChat ? (unread > 0 ? `${unread} new message${unread > 1 ? 's' : ''}` : config?.label) : config?.label}
                      </Text>
                      {item.compatibilityScore != null && (
                        <Text style={styles.msgCompat}>⚡ {item.compatibilityScore}% match</Text>
                      )}
                    </View>
                    <Text style={styles.msgArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* All-matched locked list */}
          {newMatches.length > 0 && conversationMatches.length === 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>All Matches</Text>
              {newMatches.map((item) => {
                const partner = getPartner(item);
                const config = MATCH_STATUS_CONFIG[item.status];
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.msgRow}
                    onPress={() => navigation.navigate('MatchDetails', { matchId: item.id })}
                    activeOpacity={0.85}
                  >
                    <View style={styles.avatarWrap}>
                      {partner?.profilePhoto
                        ? <Image source={{ uri: partner.profilePhoto }} style={styles.msgAvatar} />
                        : <View style={[styles.msgAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 24 }}>👤</Text></View>}
                    </View>
                    <View style={styles.msgBody}>
                      <Text style={styles.msgName}>{partner?.firstName} {partner?.lastName}</Text>
                      <Text style={[styles.msgStatus, { color: config?.color }]}>{config?.label}</Text>
                    </View>
                    <Text style={styles.msgArrow}>›</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {active.length === 0 && !isLoading && (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>💘</Text>
              <Text style={styles.emptyText}>No matches yet!</Text>
              <Text style={styles.emptyHint}>Start swiping in Discover to find matches.</Text>
            </View>
          )}

          {/* Past connections */}
          {broken.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: COLORS.gray }]}>Past Connections</Text>
              {broken.map((item) => {
                const partner = getPartner(item);
                return (
                  <View key={item.id} style={[styles.msgRow, styles.msgRowDim]}>
                    <View style={styles.avatarWrap}>
                      {partner?.profilePhoto
                        ? <Image source={{ uri: partner.profilePhoto }} style={[styles.msgAvatar, { opacity: 0.5 }]} />
                        : <View style={[styles.msgAvatar, styles.avatarPlaceholder]}><Text style={{ fontSize: 24 }}>👤</Text></View>}
                    </View>
                    <View style={styles.msgBody}>
                      <Text style={[styles.msgName, { color: COLORS.gray }]}>{partner?.firstName} {partner?.lastName}</Text>
                      <Text style={styles.msgStatus}>💔 Broken</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* ── LIKED ME TAB ── */}
      {tab === 'liked-me' && (
        canSeeLikedMe ? (
          likedMeLoading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>
          ) : (
            <FlatList
              data={likedMe}
              keyExtractor={(u) => u.id}
              contentContainerStyle={styles.listContent}
              refreshControl={<RefreshControl refreshing={likedMeLoading} onRefresh={loadLikedMe} tintColor={COLORS.primary} />}
              renderItem={renderLikedMeItem}
              ListEmptyComponent={
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>👀</Text>
                  <Text style={styles.emptyText}>Nobody yet!</Text>
                  <Text style={styles.emptyHint}>When someone likes you, they'll show up here.</Text>
                </View>
              }
            />
          )
        ) : (
          <View style={styles.upgradeWrap}>
            <Text style={styles.upgradeEmoji}>👀</Text>
            <Text style={styles.upgradeTitle}>See Who Liked You</Text>
            <Text style={styles.upgradeBody}>
              Upgrade to Premium or Gold to see everyone who has liked your profile.
            </Text>
            <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Subscription')}>
              <LinearGradient
                colors={[COLORS.gradientStart, COLORS.gradientEnd]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={styles.upgradeBtnGradient}
              >
                <Text style={styles.upgradeBtnText}>Upgrade to Premium ✨</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },

  // ── Header ──
  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#fff', marginBottom: 12 },

  // Tab pills inside gradient header
  tabRow: { flexDirection: 'row', gap: 10 },
  tabPill: {
    paddingHorizontal: 18, paddingVertical: 7,
    borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabPillActive: { backgroundColor: '#fff' },
  tabPillText: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  tabPillTextActive: { color: COLORS.primary },

  // ── Sections ──
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.gray, letterSpacing: 0.5, marginBottom: 12, textTransform: 'uppercase' },

  // New matches horizontal strip
  newMatchRow: { paddingRight: 16, gap: 14 },
  newMatchItem: { alignItems: 'center', width: 72 },
  newMatchAvatarWrap: { position: 'relative', marginBottom: 6 },
  newMatchAvatar: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, borderColor: COLORS.primary },
  onlineDot: {
    position: 'absolute', bottom: 2, right: 2,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#fff',
  },
  newMatchName: { fontSize: 12, color: COLORS.black, fontWeight: '600', textAlign: 'center', maxWidth: 68 },

  // Message-style rows
  msgRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: '#F3F4F6',
    backgroundColor: '#fff',
  },
  msgRowDim: { opacity: 0.5 },
  avatarWrap: { position: 'relative', marginRight: 14 },
  msgAvatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  unreadBadge: {
    position: 'absolute', top: -2, right: -2,
    minWidth: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2, borderColor: '#fff',
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  msgBody: { flex: 1 },
  msgName: { fontSize: 16, fontWeight: '700', color: COLORS.black },
  msgStatus: { fontSize: 12, color: COLORS.gray, marginTop: 3 },
  msgCompat: { fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' },
  msgArrow: { fontSize: 26, color: COLORS.lightGray },
  goldBadge: { fontSize: 11, color: '#D97706', fontWeight: '700', marginTop: 3 },
  superLikeBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  superLikeBadgeText: { fontSize: 11, color: '#7C3AED', fontWeight: '700', marginTop: 2 },
  likedYouText: { fontSize: 11, color: '#059669', fontWeight: '600', marginTop: 2 },

  // List content padding
  listContent: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },

  // Empty state
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '800', color: COLORS.black, textAlign: 'center' },
  emptyHint: { color: COLORS.gray, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  // Upgrade prompt
  upgradeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 36 },
  upgradeEmoji: { fontSize: 72, marginBottom: 20 },
  upgradeTitle: { fontSize: 24, fontWeight: '800', color: COLORS.black, marginBottom: 12, textAlign: 'center' },
  upgradeBody: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  upgradeBtn: { borderRadius: 28, overflow: 'hidden' },
  upgradeBtnGradient: { paddingVertical: 16, paddingHorizontal: 40 },
  upgradeBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});

