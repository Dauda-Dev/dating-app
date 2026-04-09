import React, { useCallback, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image,
  TouchableOpacity, RefreshControl, FlatList,
  Dimensions, StatusBar, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import { fetchPendingSteals, fetchSentSteals } from '../../store/slices/stealSlice';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { Match } from '../../types';
import { TutorialOverlay } from '../../components/common/TutorialOverlay';
import { HelpButton } from '../../components/common/HelpButton';
import { HelpModal } from '../../components/common/HelpModal';
import { startTutorial } from '../../store/slices/tutorialSlice';

// ─── Tier config ─────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  free: {
    colors: ['#FF6B9D', '#C44569'] as [string, string],
    emoji: '✨',
    title: 'Upgrade to Premium',
    body: 'Unlock Liked Me, more likes & priority visibility',
    btnText: 'See Plans',
  },
  premium: {
    colors: ['#7C3AED', '#4F46E5'] as [string, string],
    emoji: '🥇',
    title: 'Go Gold — top of the stack',
    body: 'Send steal requests & skip the queue',
    btnText: 'Upgrade to Gold',
  },
  gold: null,
};

type Nav = NativeStackNavigationProp<MainStackParamList>;

// ─── Match avatar ring (Instagram-story style) ────────────────────────────────
const MatchRing: React.FC<{
  match: Match;
  partner: any;
  onPress: () => void;
  isNew?: boolean;
}> = ({ partner, onPress, isNew }) => (
  <TouchableOpacity style={styles.ringWrap} onPress={onPress} activeOpacity={0.8}>
    <LinearGradient
      colors={isNew ? ['#FF6B9D', '#C44569'] : ['#E0E0E0', '#BDBDBD']}
      style={styles.ringGradient}
    >
      {partner?.profilePhoto ? (
        <Image source={{ uri: partner.profilePhoto }} style={styles.ringPhoto} />
      ) : (
        <View style={[styles.ringPhoto, styles.ringPlaceholder]}>
          <Text style={{ fontSize: 20 }}>{'👤'}</Text>
        </View>
      )}
    </LinearGradient>
    {isNew && <View style={styles.newDot} />}
    <Text style={styles.ringName} numberOfLines={1}>
      {partner?.firstName || 'Match'}
    </Text>
  </TouchableOpacity>
);

// ─── Activity feed card ───────────────────────────────────────────────────────
const ActivityItem: React.FC<{
  match: Match;
  partner: any;
  onPress: () => void;
}> = ({ match, partner, onPress }) => {
  const config = MATCH_STATUS_CONFIG[match.status];
  return (
    <TouchableOpacity style={styles.activityCard} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.activityPhotoWrap}>
        {partner?.profilePhoto ? (
          <Image source={{ uri: partner.profilePhoto }} style={styles.activityPhoto} />
        ) : (
          <View style={[styles.activityPhoto, styles.activityPlaceholder]}>
            <Text style={{ fontSize: 24 }}>{'👤'}</Text>
          </View>
        )}
        <View style={[styles.activityStatusDot, { backgroundColor: config?.color || COLORS.gray }]} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={styles.activityName}>
          {partner?.firstName} {partner?.lastName}
        </Text>
        <Text style={[styles.activityStatus, { color: config?.color || COLORS.gray }]}>
          {config?.label || 'Matched'}
        </Text>
      </View>
      <LinearGradient
        colors={['#FF6B9D', '#C44569']}
        style={styles.activityBtn}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <Text style={styles.activityBtnText}>{config?.action || 'View'}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────
export const HomeScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const { matches, isLoading } = useAppSelector((s) => s.matches);
  const { incomingRequests, sentRequests } = useAppSelector((s) => s.steals);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [showHelp, setShowHelp] = useState(false);

  const load = useCallback(() => {
    dispatch(fetchMatches());
    dispatch(fetchPendingSteals());
    dispatch(fetchSentSteals());
  }, [dispatch]);

  useFocusEffect(load);

  const tier = (user?.subscriptionTier || 'free') as 'free' | 'premium' | 'gold';
  const tierBannerConfig = TIER_CONFIG[tier];
  const activeMatches = matches.filter((m) => m.status !== 'broken');
  const recentMatches = activeMatches.slice(0, 8);
  const pendingStealCount = incomingRequests.length;

  const getPartner = (match: Match) => {
    if (!user) return null;
    return match.user1Id === user.id ? match.User2 : match.User1;
  };

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [160, 100],
    extrapolate: 'clamp',
  });
  const eyebrowOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const statsData = [
    { num: matches.length, label: 'Matches', emoji: '💞', color: '#FF6B9D' },
    {
      num: matches.filter((m) => m.status === 'video_call_completed').length,
      label: 'Video Calls', emoji: '📹', color: '#4ECDC4',
    },
    {
      num: matches.filter((m) => m.status === 'date_accepted').length,
      label: 'Dates', emoji: '📅', color: '#FFD93D',
    },
    {
      num: pendingStealCount + sentRequests.filter((r) => r.status === 'pending').length,
      label: 'Steals', emoji: '⚡', color: '#FF9500',
      onPress: () => navigation.navigate('Steals' as any),
    },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <TutorialOverlay />
      <HelpButton onPress={() => setShowHelp(true)} />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} currentScreen="Home" />

      {/* ── Animated shrinking gradient header ── */}
      <Animated.View style={[styles.headerWrap, { height: headerHeight }]}>
        <LinearGradient
          colors={['#FF6B9D', '#C44569']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Animated.Text style={[styles.headerEyebrow, { opacity: eyebrowOpacity }]}>
              Welcome back
            </Animated.Text>
            <Text style={styles.headerName}>{user?.firstName || 'You'} {'👋'}</Text>
          </View>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={() => navigation.navigate('Profile' as any)}
            activeOpacity={0.85}
          >
            {user?.profilePhoto ? (
              <Image source={{ uri: user.profilePhoto }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={{ fontSize: 26 }}>{'👤'}</Text>
              </View>
            )}
            <View style={styles.onlineDot} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── Scrollable body ── */}
      <Animated.ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={load}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* ── Steal alert banner ── */}
        {pendingStealCount > 0 && (
          <TouchableOpacity
            style={styles.stealAlert}
            onPress={() => navigation.navigate('Steals' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF9500', '#FF6B00']}
              style={styles.stealAlertGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.stealAlertEmoji}>{'⚡'}</Text>
              <Text style={styles.stealAlertText}>
                {pendingStealCount} steal request{pendingStealCount > 1 ? 's' : ''} waiting
              </Text>
              <Text style={styles.stealAlertArrow}>{'›'}</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* ── 4-up stats row ── */}
        <View style={styles.statsRow}>
          {statsData.map((s, i) => (
            <TouchableOpacity
              key={i}
              style={styles.statCard}
              activeOpacity={s.onPress ? 0.75 : 1}
              onPress={s.onPress}
            >
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={[styles.statNum, { color: s.color }]}>{s.num}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Tier / upgrade banner ── */}
        {tier === 'gold' ? (
          <LinearGradient
            colors={['#F59E0B', '#D97706']}
            style={styles.goldBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.goldBannerText}>{'🥇 Gold Member'}</Text>
            <Text style={styles.goldBannerSub}>{"You're at the top of every stack"}</Text>
          </LinearGradient>
        ) : tierBannerConfig ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('Subscription' as any)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={tierBannerConfig.colors}
              style={styles.upgradeBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.upgradeBannerLeft}>
                <Text style={styles.upgradeEmoji}>{tierBannerConfig.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upgradeTitle}>{tierBannerConfig.title}</Text>
                  <Text style={styles.upgradeSub}>{tierBannerConfig.body}</Text>
                </View>
              </View>
              <View style={styles.upgradeBtn}>
                <Text style={styles.upgradeBtnText}>{tierBannerConfig.btnText}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ) : null}

        {/* ── New matches story row ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>New Matches</Text>
          {activeMatches.length > 0 && (
            <TouchableOpacity onPress={() => navigation.navigate('Matches' as any)}>
              <Text style={styles.sectionSeeAll}>{'See all ›'}</Text>
            </TouchableOpacity>
          )}
        </View>

        {recentMatches.length === 0 ? (
          <View style={styles.emptyMatchesRow}>
            <View style={styles.emptyRingPlaceholder}>
              <Text style={{ fontSize: 30 }}>{'💘'}</Text>
            </View>
            <View style={styles.emptyRingPlaceholder}>
              <Text style={{ fontSize: 30 }}>{'💝'}</Text>
            </View>
            <View style={styles.emptyRingPlaceholder}>
              <Text style={{ fontSize: 30 }}>{'💖'}</Text>
            </View>
            <TouchableOpacity
              style={styles.startSwipingBtn}
              onPress={() => navigation.navigate('Tabs' as any)}
            >
              <Text style={styles.startSwipingText}>{'Start\nswiping'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={recentMatches}
            keyExtractor={(m) => m.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.ringList}
            renderItem={({ item, index }) => (
              <MatchRing
                match={item}
                partner={getPartner(item)}
                isNew={index < 3}
                onPress={() => navigation.navigate('MatchDetails', { matchId: item.id })}
              />
            )}
          />
        )}

        {/* ── Activity feed ── */}
        {activeMatches.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>Activity</Text>
            </View>
            {activeMatches.slice(0, 5).map((match) => (
              <ActivityItem
                key={match.id}
                match={match}
                partner={getPartner(match)}
                onPress={() => navigation.navigate('MatchDetails', { matchId: match.id })}
              />
            ))}
          </>
        )}

        {/* ── Discover CTA card (no matches state) ── */}
        {activeMatches.length === 0 && (
          <TouchableOpacity
            style={styles.discoverCTA}
            onPress={() => navigation.navigate('Tabs' as any)}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#FF6B9D', '#C44569']}
              style={styles.discoverCTAGrad}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.discoverCTAEmoji}>{'🔥'}</Text>
              <Text style={styles.discoverCTATitle}>Find your match</Text>
              <Text style={styles.discoverCTASub}>Start swiping to get your first match</Text>
              <View style={styles.discoverCTABtn}>
                <Text style={styles.discoverCTABtnText}>{'Discover People →'}</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </Animated.ScrollView>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F5F5F7' },

  // Header
  headerWrap: { width: '100%', overflow: 'hidden' },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 50,
  },
  headerLeft: { flex: 1 },
  headerEyebrow: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
    marginBottom: 2,
  },
  headerName: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  avatarWrap: { position: 'relative' },
  headerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.6)',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ADE80',
    borderWidth: 2,
    borderColor: '#fff',
  },

  // Body
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingTop: 14 },

  // Steal alert
  stealAlert: { borderRadius: 14, marginBottom: 14, overflow: 'hidden' },
  stealAlertGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 10,
  },
  stealAlertEmoji: { fontSize: 20 },
  stealAlertText: { flex: 1, color: '#fff', fontWeight: '700', fontSize: 14 },
  stealAlertArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 22, fontWeight: '700' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  statEmoji: { fontSize: 18, marginBottom: 4 },
  statNum: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  statLabel: { fontSize: 11, color: COLORS.gray, marginTop: 3, fontWeight: '500' },

  // Gold banner
  goldBanner: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginBottom: 16,
  },
  goldBannerText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  goldBannerSub: { fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  // Upgrade banner
  upgradeBanner: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  upgradeBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  upgradeEmoji: { fontSize: 28 },
  upgradeTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  upgradeSub: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  upgradeBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.black,
    letterSpacing: -0.3,
  },
  sectionSeeAll: { fontSize: 14, color: COLORS.primary, fontWeight: '600' },

  // Match rings
  ringList: { paddingRight: 16, paddingBottom: 4 },
  ringWrap: { alignItems: 'center', marginRight: 14, width: 72 },
  ringGradient: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    marginBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPhoto: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: '#fff',
  },
  ringPlaceholder: {
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newDot: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: '#fff',
  },
  ringName: {
    fontSize: 12,
    color: COLORS.darkGray,
    fontWeight: '600',
    textAlign: 'center',
    width: 72,
  },

  // Empty placeholders
  emptyMatchesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
    paddingLeft: 4,
  },
  emptyRingPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  startSwipingBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 34,
    width: 68,
    height: 68,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startSwipingText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },

  // Activity feed
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activityPhotoWrap: { position: 'relative', marginRight: 14 },
  activityPhoto: { width: 56, height: 56, borderRadius: 28 },
  activityPlaceholder: {
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityStatusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#fff',
  },
  activityInfo: { flex: 1 },
  activityName: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  activityStatus: { fontSize: 12, marginTop: 4, fontWeight: '500' },
  activityBtn: { borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  activityBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  // Discover CTA
  discoverCTA: { borderRadius: 20, overflow: 'hidden', marginTop: 8 },
  discoverCTAGrad: { padding: 28, alignItems: 'center' },
  discoverCTAEmoji: { fontSize: 48, marginBottom: 12 },
  discoverCTATitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  discoverCTASub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  discoverCTABtn: {
    backgroundColor: '#fff',
    borderRadius: 30,
    paddingHorizontal: 28,
    paddingVertical: 13,
  },
  discoverCTABtnText: { color: COLORS.primary, fontWeight: '800', fontSize: 15 },
});
