import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  Animated, PanResponder, Dimensions, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEligibleUsers, likeUser, passUser } from '../../store/slices/discoverySlice';
import { requestSteal } from '../../store/slices/stealSlice';
import { COLORS } from '../../constants';
import { DiscoveryUser } from '../../types';

const { width: SCREEN_W } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_W * 0.3;

export const DiscoveryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users, currentIndex, isLoading } = useAppSelector((s) => s.discovery);

  useEffect(() => {
    dispatch(fetchEligibleUsers());
  }, []);

  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      position.setValue({ x: gestureState.dx, y: gestureState.dy });
    },
    onPanResponderRelease: (_, gestureState) => {
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
    Animated.timing(position, {
      toValue: { x: SCREEN_W + 100, y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      const currentUser = users[currentIndex];
      if (currentUser) dispatch(likeUser(currentUser.id));
      position.setValue({ x: 0, y: 0 });
    });
  };

  const swipeLeft = () => {
    Animated.timing(position, {
      toValue: { x: -(SCREEN_W + 100), y: 0 },
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      const currentUser = users[currentIndex];
      if (currentUser) dispatch(passUser(currentUser.id));
      position.setValue({ x: 0, y: 0 });
    });
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
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Finding matches…</Text>
      </View>
    );
  }

  const currentUser: DiscoveryUser | undefined = users[currentIndex];

  if (!currentUser) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyEmoji}>🎉</Text>
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
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Discover 🔍</Text>

      {/* Next card (behind) */}
      {users[currentIndex + 1] && (
        <View style={[styles.card, styles.nextCard]}>
          <Image source={{ uri: users[currentIndex + 1].profilePhoto }} style={styles.cardImage} />
        </View>
      )}

      {/* Current card */}
      <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
        {currentUser.profilePhoto ? (
          <Image source={{ uri: currentUser.profilePhoto }} style={styles.cardImage} />
        ) : (
          <View style={[styles.cardImage, styles.cardImagePlaceholder]}>
            <Text style={{ fontSize: 80 }}>👤</Text>
          </View>
        )}

        {/* Like / Nope overlays */}
        <Animated.View style={[styles.likeLabel, { opacity: likeOpacity }]}>
          <Text style={styles.likeLabelText}>LIKE 💚</Text>
        </Animated.View>
        <Animated.View style={[styles.nopeLabel, { opacity: nopeOpacity }]}>
          <Text style={styles.nopeLabelText}>NOPE ❌</Text>
        </Animated.View>

        <LinearGradient colors={['transparent', 'rgba(0,0,0,0.75)']} style={styles.cardGradient}>
          <Text style={styles.cardName}>
            {currentUser.firstName}{currentUser.lastName ? ` ${currentUser.lastName}` : ''}{age ? `, ${age}` : ''}
          </Text>
          {currentUser.location ? <Text style={styles.cardLocation}>📍 {currentUser.location}</Text> : null}
          {(currentUser.bio || currentUser.profile?.bio) ? (
            <Text style={styles.cardBio} numberOfLines={2}>{currentUser.bio || currentUser.profile?.bio}</Text>
          ) : null}
          {currentUser.compatibilityScore != null && (
            <Text style={styles.compat}>⚡ {currentUser.compatibilityScore}% match</Text>
          )}
        </LinearGradient>
      </Animated.View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.passBtn} onPress={swipeLeft}>
          <Text style={styles.passBtnText}>✕</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.stealBtn}
          onPress={() => dispatch(requestSteal({ targetUserId: currentUser.id }))}
        >
          <Text style={styles.stealBtnText}>⚡</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeBtn} onPress={swipeRight}>
          <Text style={styles.likeBtnText}>♥</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CARD_H = Dimensions.get('window').height * 0.6;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background, alignItems: 'center' },
  screenTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black, alignSelf: 'flex-start', paddingHorizontal: 20, paddingTop: 56, marginBottom: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText: { marginTop: 12, color: COLORS.gray, fontSize: 15 },
  emptyEmoji: { fontSize: 64, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.black, marginBottom: 6 },
  emptySubtitle: { color: COLORS.gray, marginBottom: 24 },
  refreshBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 28, paddingVertical: 12, borderRadius: 24 },
  refreshBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  card: {
    width: SCREEN_W - 32,
    height: CARD_H,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'absolute',
    top: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    backgroundColor: '#fff',
  },
  nextCard: {
    top: 108,
    transform: [{ scale: 0.96 }],
  },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center' },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  cardName: { fontSize: 24, fontWeight: '700', color: '#fff' },
  cardLocation: { fontSize: 14, color: 'rgba(255,255,255,0.85)', marginTop: 2 },
  cardBio: { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  compat: { fontSize: 13, color: '#FFD93D', marginTop: 4, fontWeight: '600' },
  likeLabel: {
    position: 'absolute', top: 40, left: 20,
    borderWidth: 3, borderColor: '#4CAF50', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '-15deg' }],
  },
  likeLabelText: { color: '#4CAF50', fontSize: 22, fontWeight: '800' },
  nopeLabel: {
    position: 'absolute', top: 40, right: 20,
    borderWidth: 3, borderColor: '#F44336', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 4, transform: [{ rotate: '15deg' }],
  },
  nopeLabelText: { color: '#F44336', fontSize: 22, fontWeight: '800' },
  actions: {
    position: 'absolute',
    bottom: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  passBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  passBtnText: { fontSize: 24, color: '#F44336' },
  stealBtn: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  stealBtnText: { fontSize: 22 },
  likeBtn: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 8, elevation: 4,
  },
  likeBtnText: { fontSize: 24, color: COLORS.primary },
});
