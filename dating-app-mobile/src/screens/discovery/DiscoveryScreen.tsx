import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Animated, PanResponder, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchEligibleUsers, likeUser, superLikeUser, passUser,
  removeUserFromDeck, undoSwipe, setDiscoveryFilters, setUserLocation,
} from '../../store/slices/discoverySlice';
import { requestSteal } from '../../store/slices/stealSlice';
import { apiClient } from '../../services/apiClient';
import { COLORS, useTheme } from '../../constants';
import { Ionicons } from '@expo/vector-icons';
import { DiscoveryUser } from '../../types';
import { TutorialOverlay } from '../../components/common/TutorialOverlay';
import { HelpButton } from '../../components/common/HelpButton';
import { HelpModal } from '../../components/common/HelpModal';
import { startTutorial, loadTutorialSeen } from '../../store/slices/tutorialSlice';
import { DiscoveryFilterSheet } from '../../components/common/DiscoveryFilterSheet';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

type SwipeAdModule = {
  TestIds: { BANNER: string };
  BannerAdSize: { MEDIUM_RECTANGLE: string };
  BannerAd: React.ComponentType<{
    unitId: string;
    size: string;
    requestOptions?: Record<string, unknown>;
  }>;
};

const AD_EVERY_N_SWIPES = 8;

const swipeAdModule: SwipeAdModule | null = (() => {
  try {
    return require('react-native-google-mobile-ads') as SwipeAdModule;
  } catch {
    return null;
  }
})();

interface QuotaInfo {
  tier: string;
  unlimited: boolean;
  used: number | null;
  limit: number | null;
  remaining: number | null;
}

export const DiscoveryScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const { users, currentIndex, isLoading, filters } = useAppSelector((s) => s.discovery);
  const { user } = useAppSelector((s) => s.auth);
  const { hasSeenTutorial } = useAppSelector((s) => s.tutorial);
  const C = useTheme();
  const [photoIndex, setPhotoIndex] = useState(0);
  const [quota, setQuota] = useState<QuotaInfo | null>(null);
  const [isUndoing, setIsUndoing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showAdCard, setShowAdCard] = useState(false);
  const swipeCountRef = useRef(0);

  const tier = user?.subscriptionTier || 'free';
  const isGold = tier === 'gold';

  // Show tutorial on first visit
  useEffect(() => {
    dispatch(loadTutorialSeen()).then((action: any) => {
      if (!action.payload) {
        dispatch(startTutorial('Discover'));
      }
    });
  }, []);

  const loadQuota = useCallback(async () => {
    if (tier === 'premium' || tier === 'gold') {
      setQuota({ tier, unlimited: true, used: null, limit: null, remaining: null });
      return;
    }
    try {
      const q = await apiClient.getLikeQuota();
      setQuota(q);
    } catch {
      // non-critical — don't block UI
    }
  }, [tier]);

  const checkAndShowAd = useCallback(() => {
    if (tier !== 'free' || !swipeAdModule || users.length === 0) return;
    swipeCountRef.current += 1;
    if (swipeCountRef.current % AD_EVERY_N_SWIPES === 0) {
      setShowAdCard(true);
    }
  }, [tier, users.length]);

  // Re-fetch every time this tab is focused so swiped users don't reappear
  useFocusEffect(
    useCallback(() => {
      (async () => {
        // Request location permission silently — don't block if denied
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            dispatch(setUserLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude }));
          }
        } catch {
          // ignore — location is optional
        }
        dispatch(fetchEligibleUsers());
        loadQuota();
      })();
    }, [loadQuota])
  );

  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      position.setValue({ x: gestureState.dx, y: gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
      if (showAdCard) {
        const dist = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
        if (dist > SWIPE_THRESHOLD) {
          const toX = gestureState.dx >= 0 ? SCREEN_W + 100 : -(SCREEN_W + 100);
          Animated.timing(position, {
            toValue: { x: toX, y: gestureState.dy },
            duration: 250,
            useNativeDriver: true,
          }).start(() => {
            position.setValue({ x: 0, y: 0 });
            setShowAdCard(false);
          });
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
        }
        return;
      }
      if (gestureState.dx > SWIPE_THRESHOLD) {
        swipeRight();
      } else if (gestureState.dx < -SWIPE_THRESHOLD) {
        swipeLeft();
      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: true }).start();
      }
    },
  });

  const swipeRight = () => {
    if (showAdCard) return;
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    // Quota guard for free tier
    if (quota && !quota.unlimited && quota.remaining !== null && quota.remaining <= 0) {
      Alert.alert(
        '💔 Daily Limit Reached',
        `Free plan allows ${quota.limit} likes per day. Upgrade to Premium or Gold for unlimited likes.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade ✨', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    setPhotoIndex(0);
    dispatch(removeUserFromDeck(currentUser.id));
    Animated.timing(position, {
      toValue: { x: SCREEN_W + 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      checkAndShowAd();
      const result = await dispatch(likeUser(currentUser.id));
      if (likeUser.fulfilled.match(result)) {
        if (quota && !quota.unlimited && quota.remaining !== null) {
          setQuota((q) => q ? { ...q, remaining: Math.max(0, (q.remaining ?? 1) - 1), used: (q.used ?? 0) + 1 } : q);
        }
        if (result.payload.result?.matched) {
          Alert.alert(
            "🎉 It's a Match!",
            `You and ${currentUser.firstName} liked each other! Go to Matches to start your journey.`,
            [{ text: 'Awesome!', style: 'default' }]
          );
        }
      } else if (likeUser.rejected.match(result)) {
        const payload = result.payload as string;
        if (payload?.includes('limit')) {
          Alert.alert('Daily Limit Reached', 'Upgrade to Premium or Gold for unlimited likes.');
        }
      }
    });
  };

  const superSwipe = () => {
    if (showAdCard) return;
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    // Super-like shares the same daily quota as regular likes for free tier
    if (quota && !quota.unlimited && quota.remaining !== null && quota.remaining <= 0) {
      Alert.alert(
        '💔 Daily Limit Reached',
        `Free plan allows ${quota.limit} likes per day. Upgrade to Premium or Gold for unlimited likes.`,
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Upgrade ✨', onPress: () => navigation.navigate('Subscription') },
        ]
      );
      return;
    }

    setPhotoIndex(0);
    dispatch(removeUserFromDeck(currentUser.id));
    Animated.timing(position, {
      toValue: { x: 0, y: -(SCREEN_W + 100) },
      duration: 280,
      useNativeDriver: true,
    }).start(async () => {
      position.setValue({ x: 0, y: 0 });
      checkAndShowAd();
      const result = await dispatch(superLikeUser(currentUser.id));
      if (superLikeUser.fulfilled.match(result)) {
        if (quota && !quota.unlimited && quota.remaining !== null) {
          setQuota((q) => q ? { ...q, remaining: Math.max(0, (q.remaining ?? 1) - 1), used: (q.used ?? 0) + 1 } : q);
        }
        if (result.payload.result?.matched) {
          Alert.alert(
            "⭐ Super Match!",
            `You and ${currentUser.firstName} are a match! They'll know you really meant it.`,
            [{ text: 'Amazing!', style: 'default' }]
          );
        } else {
          Alert.alert(
            "⭐ Super Like Sent!",
            `${currentUser.firstName} will see that you super-liked them.`,
            [{ text: 'Nice!', style: 'default' }]
          );
        }
      } else if (superLikeUser.rejected.match(result)) {
        const payload = result.payload as string;
        if (payload?.includes('limit')) {
          Alert.alert('Daily Limit Reached', 'Upgrade to Premium or Gold for unlimited likes.');
        }
      }
    });
  };

  const swipeLeft = () => {
    if (showAdCard) return;
    const currentUser = users[currentIndex];
    if (!currentUser) return;
    setPhotoIndex(0);
    dispatch(removeUserFromDeck(currentUser.id));
    Animated.timing(position, {
      toValue: { x: -(SCREEN_W + 100), y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      dispatch(passUser(currentUser.id));
      checkAndShowAd();
    });
  };

  const handleUndo = async () => {
    if (isUndoing) return;
    setIsUndoing(true);
    const result = await dispatch(undoSwipe());
    setIsUndoing(false);
    if (undoSwipe.rejected.match(result)) {
      Alert.alert('Nothing to Undo', 'No recent swipe to revert.');
    }
  };

  const rotation = position.x.interpolate({
    inputRange: [-SCREEN_W / 2, 0, SCREEN_W / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SCREEN_W / 4],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SCREEN_W / 4, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardStyle = {
    transform: [{ translateX: position.x }, { translateY: position.y }, { rotate: rotation }],
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding matches…</Text>
      </View>
    );
  }

  const currentUser: DiscoveryUser | undefined = users[currentIndex];

  if (!currentUser && !showAdCard) {
    return (
      <View style={[styles.center, { backgroundColor: C.background }]}>
        <Ionicons name="checkmark-circle-outline" size={72} color={COLORS.primary} style={{ marginBottom: 16 }} />
        <Text style={styles.emptyTitle}>You've seen everyone!</Text>
        <Text style={styles.emptySubtitle}>Check back later for new profiles</Text>
        <TouchableOpacity onPress={() => dispatch(fetchEligibleUsers())} style={styles.refreshBtn}>
          <Text style={styles.refreshBtnText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const age = currentUser.age ??
    (currentUser.dateOfBirth ? Math.floor((Date.now() - new Date(currentUser.dateOfBirth).getTime()) / 3.156e10) : null);
  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <TutorialOverlay />
      <HelpButton onPress={() => setShowHelp(true)} />
      <HelpModal visible={showHelp} onClose={() => setShowHelp(false)} currentScreen="Discover" />
      {/* Tinder-style header */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Settings' as any)}>
          <Ionicons name="settings-outline" size={24} color={COLORS.gray} />
        </TouchableOpacity>
        <Ionicons name="flame" size={34} color={COLORS.primary} />
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => setShowFilter(true)}>
            <Ionicons name="options-outline" size={24} color={COLORS.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('Subscription' as any)}>
            {tier === 'gold'
              ? <Ionicons name="trophy" size={22} color="#F59E0B" />
              : tier === 'premium'
              ? <Ionicons name="star" size={22} color="#7C3AED" />
              : <Ionicons name="diamond-outline" size={22} color={COLORS.primary} />}
          </TouchableOpacity>
        </View>
      </View>
      {/* Next card (behind) — during ad shows the upcoming profile, otherwise the one after current */}}
      {showAdCard ? (
        currentUser && (
          <View style={[styles.card, styles.nextCard]}>
            <Image source={{ uri: currentUser.profilePhoto }} style={styles.cardImage} />
          </View>
        )
      ) : (
        users[currentIndex + 1] && (
          <View style={[styles.card, styles.nextCard]}>
            <Image source={{ uri: users[currentIndex + 1].profilePhoto }} style={styles.cardImage} />
          </View>
        )
      )}

      {/* Current card — ad card when it's ad time, otherwise profile card */}
      <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
        {showAdCard ? (
          /* ── Sponsored / Ad card (Tinder-style in-deck ad) ── */
          <>
            <LinearGradient
              colors={['#1a1a2e', '#16213e', '#0f3460']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.adSponsoredBadge}>
              <Text style={styles.adSponsoredText}>SPONSORED</Text>
            </View>
            <View style={styles.adContent}>
              {BannerAdComp && adUnitId ? (
                <BannerAdComp
                  unitId={adUnitId}
                  size={swipeAdModule!.BannerAdSize.MEDIUM_RECTANGLE}
                  requestOptions={{ requestNonPersonalizedAdsOnly: true }}
                />
              ) : null}
            </View>
            <View style={styles.adSwipeHint}>
              <Text style={styles.adSwipeHintText}>← Swipe to skip →</Text>
            </View>
            <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeLabelText}>SKIP ⏭</Text>
            </Animated.View>
          </>
        ) : (
          /* ── Profile card ── */
          <>
            {(() => {
              if (!currentUser) return null;
              const allPhotos = [
                ...(currentUser.profilePhoto ? [currentUser.profilePhoto] : []),
                ...(currentUser.profile?.photos || []).filter(p => p !== currentUser.profilePhoto),
              ];
              const displayPhoto = allPhotos[photoIndex] || null;
              return (
                <>
                  {displayPhoto ? (
                    <Image source={{ uri: displayPhoto }} style={styles.cardImage} />
                  ) : (
                    <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
                      <Ionicons name="person" size={80} color={COLORS.lightGray} />
                    </View>
                  )}
                  {allPhotos.length > 1 && (
                    <>
                      <TouchableOpacity
                        style={styles.tapLeft}
                        onPress={() => setPhotoIndex(i => Math.max(0, i - 1))}
                        activeOpacity={1}
                      />
                      <TouchableOpacity
                        style={styles.tapRight}
                        onPress={() => setPhotoIndex(i => Math.min(allPhotos.length - 1, i + 1))}
                        activeOpacity={1}
                      />
                      <View style={styles.dotsRow}>
                        {allPhotos.map((_, i) => (
                          <View key={i} style={[styles.dot, i === photoIndex && styles.dotActive]} />
                        ))}
                      </View>
                    </>
                  )}
                </>
              );
            })()}
            <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
              <Text style={styles.likeLabelText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
              <Text style={styles.nopeLabelText}>NOPE</Text>
            </Animated.View>
            {currentUser && (
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.cardGradient}>
                <Text style={styles.cardName}>
                  {currentUser.firstName}{currentUser.lastName ? ` ${currentUser.lastName}` : ''}{age ? `, ${age}` : ''}
                </Text>
                {currentUser.location ? (
                  <View style={styles.cardInfoRow}>
                    <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.9)" />
                    <Text style={styles.cardLocation}> {currentUser.location}</Text>
                  </View>
                ) : null}
                {currentUser.distanceKm != null && (
                  <View style={styles.cardInfoRow}>
                    <Ionicons name="navigate-circle-outline" size={13} color="rgba(255,255,255,0.75)" />
                    <Text style={styles.cardDistance}>
                      {currentUser.distanceKm < 1 ? ' Less than 1 km away' : ` ${currentUser.distanceKm} km away`}
                    </Text>
                  </View>
                )}
                {(currentUser.bio || currentUser.profile?.bio) ? (
                  <Text style={styles.cardBio} numberOfLines={2}>{currentUser.bio || currentUser.profile?.bio}</Text>
                ) : null}
                {currentUser.compatibilityScore != null && (
                  <View style={styles.cardInfoRow}>
                    <Ionicons name="flash-outline" size={13} color="#FFD93D" />
                    <Text style={styles.compat}> {currentUser.compatibilityScore}% match</Text>
                  </View>
                )}
              </LinearGradient>
            )}
          </>
        )}
      </Animated.View>

      {/* Tinder-style action buttons */}
      <View style={styles.actions}>
        {/* Pass — red */}
        <TouchableOpacity style={styles.passBtn} onPress={swipeLeft} activeOpacity={0.8}>
          <Ionicons name="close" size={30} color="#FD3C5B" />
        </TouchableOpacity>

        {/* Undo last swipe — small grey rewind button */}
        <TouchableOpacity
          style={[styles.undoBtn, isUndoing && { opacity: 0.4 }]}
          onPress={handleUndo}
          activeOpacity={0.8}
          disabled={isUndoing}
        >
          <Ionicons name="arrow-undo" size={22} color={COLORS.gray} />
        </TouchableOpacity>

        {/* Super-like — cyan, flies the card upward */}
        <TouchableOpacity style={styles.superBtn} onPress={superSwipe} activeOpacity={0.8}>
          <Ionicons name="star" size={26} color="#00D8FF" />
        </TouchableOpacity>

        {/* Like — green */}
        <TouchableOpacity style={styles.likeBtn} onPress={swipeRight} activeOpacity={0.8}>
          <Ionicons name="heart" size={30} color="#01DF8B" />
        </TouchableOpacity>

        {/* Steal — purple, Gold only */}
        <TouchableOpacity
          style={[styles.stealBtn, !isGold && styles.stealBtnLocked]}
          activeOpacity={0.8}
          onPress={() => {
            if (!isGold) {
              Alert.alert(
                'Gold Feature',
                'Steal requests are exclusive to Gold members.',
                [
                  { text: 'Not Now', style: 'cancel' },
                  { text: 'Upgrade to Gold', onPress: () => navigation.navigate('Subscription') },
                ]
              );
              return;
            }
            dispatch(requestSteal({ targetUserId: currentUser.id }));
          }}
        >
          <Ionicons name={isGold ? 'flash' : 'lock-closed'} size={22} color={isGold ? '#A78BFA' : COLORS.lightGray} />
        </TouchableOpacity>
      </View>

      {/* Filter Sheet */}
      <DiscoveryFilterSheet
        visible={showFilter}
        initialFilters={filters}
        onClose={() => setShowFilter(false)}
        onApply={(newFilters) => {
          dispatch(setDiscoveryFilters(newFilters));
          dispatch(fetchEligibleUsers());
          setShowFilter(false);
        }}
      />
    </View>
  );
};

const CARD_H = Dimensions.get('window').height * 0.72;
const SCREEN_H = Dimensions.get('window').height;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff', alignItems: 'center' },

  // ── Header ──
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    alignSelf: 'stretch', paddingHorizontal: 20, paddingTop: 56, paddingBottom: 8,
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  headerBtnIcon: { fontSize: 22 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  screenTitle: { fontSize: 34, fontWeight: '700', color: COLORS.primary },

  // ── Loading / empty ──
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 15 },
  emptyEmoji: { fontSize: 72, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: 6 },
  emptySubtitle: { color: COLORS.gray, marginBottom: 28, fontSize: 15 },
  refreshBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 28,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  refreshBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },

  // ── Cards ──
  card: {
    width: SCREEN_W - 24,
    height: CARD_H,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'absolute',
    top: 108,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    backgroundColor: '#f0f0f0',
  },
  // ── Ad card (Tinder in-deck sponsored card) ──
  adSponsoredBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  adSponsoredText: { color: 'rgba(255,255,255,0.65)', fontSize: 11, fontWeight: '600', letterSpacing: 1 },
  adContent: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  adSwipeHint: { position: 'absolute', bottom: 28, left: 0, right: 0, alignItems: 'center' },
  adSwipeHintText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '500' },
  nextCard: {
    top: 116,
    transform: [{ scale: 0.95 }],
    opacity: 0.85,
  },
  cardImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  cardImagePlaceholder: { backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  tapLeft: { position: 'absolute', top: 0, left: 0, width: '40%', height: '80%' },
  tapRight: { position: 'absolute', top: 0, right: 0, width: '40%', height: '80%' },

  // Photo dots — Tinder has them as thin pill bars at top
  dotsRow: {
    position: 'absolute', top: 8, left: 8, right: 8,
    flexDirection: 'row', gap: 4,
  },
  dot: {
    height: 3, flex: 1, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: { backgroundColor: '#fff' },

  // Gradient info overlay
  cardGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingTop: 60, paddingBottom: 24,
  },
  cardName: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  cardLocation: { fontSize: 14, color: 'rgba(255,255,255,0.9)', marginTop: 3, fontWeight: '500' },
  cardDistance: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 2, fontWeight: '400' },
  cardBio: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5, lineHeight: 20 },
  cardInfoRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  compat: { fontSize: 13, color: '#FFD93D', fontWeight: '700' },

  // LIKE / NOPE stamps — exactly like Tinder (rotated, thick border)
  likeLabel: {
    position: 'absolute', top: 48, left: 24,
    borderWidth: 4, borderColor: '#01DF8B', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    transform: [{ rotate: '-22deg' }],
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  likeLabelText: { color: '#01DF8B', fontSize: 26, fontWeight: '900', letterSpacing: 2 },
  nopeLabel: {
    position: 'absolute', top: 48, right: 24,
    borderWidth: 4, borderColor: '#FD3C5B', borderRadius: 6,
    paddingHorizontal: 14, paddingVertical: 5,
    transform: [{ rotate: '22deg' }],
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  nopeLabelText: { color: '#FD3C5B', fontSize: 26, fontWeight: '900', letterSpacing: 2 },

  // ── Action buttons — Tinder sizing ──
  actions: {
    position: 'absolute',
    bottom: SCREEN_H * 0.04,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  // Red ring — Pass
  passBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FD3C5B',
    shadowColor: '#FD3C5B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  passBtnText: { fontSize: 26, color: '#FD3C5B', fontWeight: '700' },
  // Yellow ring — Super Like
  superBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#00D8FF',
    shadowColor: '#00D8FF', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  superBtnText: { fontSize: 22, color: '#00D8FF' },
  // Green ring — Like
  likeBtn: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#01DF8B',
    shadowColor: '#01DF8B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 5,
  },
  likeBtnText: { fontSize: 28, color: '#01DF8B' },
  // Purple ring — Steal
  stealBtn: {
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#A78BFA',
    shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.25, shadowRadius: 6, elevation: 4,
  },
  stealBtnLocked: { borderColor: COLORS.lightGray },
  stealBtnText: { fontSize: 20 },

  // Grey ring — Undo
  undoBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#9CA3AF',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.12, shadowRadius: 4, elevation: 3,
  },
  undoBtnText: { fontSize: 20, color: '#6B7280', fontWeight: '700' },
});
