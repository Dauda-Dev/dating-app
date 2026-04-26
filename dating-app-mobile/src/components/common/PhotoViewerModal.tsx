import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  StatusBar,
  Platform,
  PanResponder,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants';

const { width: W, height: H } = Dimensions.get('window');
const SWIPE_THRESHOLD = W * 0.25;

interface Props {
  photos: string[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  userName?: string;
  onEditPress?: () => void;
}

export const PhotoViewerModal: React.FC<Props> = ({
  photos,
  initialIndex = 0,
  visible,
  onClose,
  userName,
  onEditPress,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const translateX = useRef(new Animated.Value(0)).current;

  // Reset to initialIndex whenever modal opens
  const handleShow = () => {
    setCurrentIndex(initialIndex);
    translateX.setValue(0);
  };

  const goTo = (idx: number) => {
    if (idx < 0 || idx >= photos.length) return;
    setCurrentIndex(idx);
    translateX.setValue(0);
  };

  // Horizontal swipe to go prev/next
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dy) < 40,
      onPanResponderMove: (_, g) => translateX.setValue(g.dx),
      onPanResponderRelease: (_, g) => {
        if (g.dx < -SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: -W, duration: 180, useNativeDriver: true }).start(() => {
            setCurrentIndex(i => Math.min(photos.length - 1, i + 1));
            translateX.setValue(0);
          });
        } else if (g.dx > SWIPE_THRESHOLD) {
          Animated.timing(translateX, { toValue: W, duration: 180, useNativeDriver: true }).start(() => {
            setCurrentIndex(i => Math.max(0, i - 1));
            translateX.setValue(0);
          });
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  if (!photos.length) return null;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="fade"
      statusBarTranslucent
      onShow={handleShow}
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>

        {/* Full-bleed photo */}
        <Animated.View
          style={[styles.slide, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <Image
            source={{ uri: photos[currentIndex] }}
            style={styles.fullImage}
            resizeMode="cover"
          />
        </Animated.View>

        {/* Tap zones: left = prev, right = next */}
        <View style={styles.tapZones} pointerEvents="box-none">
          <TouchableOpacity
            style={styles.tapLeft}
            activeOpacity={1}
            onPress={() => goTo(currentIndex - 1)}
          />
          <TouchableOpacity
            style={styles.tapRight}
            activeOpacity={1}
            onPress={() => goTo(currentIndex + 1)}
          />
        </View>

        {/* Top gradient: progress bars + close + edit */}
        <LinearGradient
          colors={['rgba(0,0,0,0.6)', 'transparent']}
          style={styles.topGradient}
          pointerEvents="box-none"
        >
          {/* Tinder-style thin progress bars */}
          <View style={styles.progressBars}>
            {photos.map((_, idx) => (
              <View key={idx} style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    idx < currentIndex && styles.progressDone,
                    idx === currentIndex && styles.progressActive,
                  ]}
                />
              </View>
            ))}
          </View>

          <View style={styles.topControls}>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.counterText}>{currentIndex + 1} / {photos.length}</Text>
            {onEditPress ? (
              <TouchableOpacity style={styles.editBtn} onPress={onEditPress}>
                <Ionicons name="pencil" size={14} color="#fff" />
                <Text style={styles.editBtnText}> Edit</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ width: 52 }} />
            )}
          </View>
        </LinearGradient>

        {/* Bottom gradient: name + main badge */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        >
          {userName ? <Text style={styles.nameText}>{userName}</Text> : null}
          {currentIndex === 0 && (
            <View style={styles.mainBadge}>
              <Ionicons name="star" size={11} color="#fff" />
              <Text style={styles.mainBadgeText}> Main Photo</Text>
            </View>
          )}
        </LinearGradient>

      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  slide: {
    width: W,
    height: H,
  },
  fullImage: {
    width: W,
    height: H,
  },
  tapZones: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
  },
  tapLeft:  { flex: 1 },
  tapRight: { flex: 1 },

  // ── Top gradient ──────────────────────────────────────────────────
  topGradient: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    paddingTop: Platform.OS === 'ios' ? 52 : 32,
    paddingBottom: 20,
    paddingHorizontal: 12,
    gap: 10,
  },
  progressBars: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 4,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  progressFill: {
    flex: 1,
    height: 3,
    backgroundColor: 'transparent',
  },
  progressDone: {
    backgroundColor: '#fff',
  },
  progressActive: {
    backgroundColor: '#fff',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterText: { color: '#fff', fontSize: 14, fontWeight: '600', letterSpacing: 0.5 },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  editBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // ── Bottom gradient ───────────────────────────────────────────────
  bottomGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    paddingBottom: Platform.OS === 'ios' ? 52 : 28,
    paddingTop: 60,
    paddingHorizontal: 20,
    gap: 8,
  },
  nameText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  mainBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,157,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  mainBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
