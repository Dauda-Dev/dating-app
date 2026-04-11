import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Image,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StatusBar,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';

const { width: W, height: H } = Dimensions.get('window');

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
  const scrollRef = useRef<ScrollView>(null);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  // When the modal opens, snap to the initialIndex
  const handleShow = () => {
    setCurrentIndex(initialIndex);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: initialIndex * W, animated: false });
    }, 50);
  };

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setCurrentIndex(idx);
  };

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
        {/* Swipeable photos */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          scrollEventThrottle={16}
          style={styles.scroller}
        >
          {photos.map((uri, idx) => (
            <View key={idx} style={styles.slide}>
              <Image
                source={{ uri }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Top gradient bar — close + counter */}
        <LinearGradient
          colors={['rgba(0,0,0,0.72)', 'transparent']}
          style={styles.topBar}
        >
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.counterText}>
            {currentIndex + 1} / {photos.length}
          </Text>
          {onEditPress ? (
            <TouchableOpacity style={styles.editBtn} onPress={onEditPress}>
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 52 }} />
          )}
        </LinearGradient>

        {/* Bottom gradient bar — dots + name */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.72)']}
          style={styles.bottomBar}
        >
          {/* Dot indicators */}
          <View style={styles.dots}>
            {photos.map((_, idx) => (
              <View
                key={idx}
                style={[
                  styles.dot,
                  idx === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
          {userName ? (
            <Text style={styles.nameText}>{userName}</Text>
          ) : null}
          {currentIndex === 0 && (
            <View style={styles.mainPhotoBadge}>
              <Text style={styles.mainPhotoBadgeText}>⭐ Main Photo</Text>
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
  scroller: {
    flex: 1,
  },
  slide: {
    width: W,
    height: H,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullImage: {
    width: W,
    height: H,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingBottom: 24,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  counterText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
  },
  editBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'ios' ? 48 : 24,
    paddingTop: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 10,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    borderRadius: 50,
  },
  dotActive: {
    width: 20,
    height: 5,
    backgroundColor: '#fff',
  },
  dotInactive: {
    width: 5,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  nameText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  mainPhotoBadge: {
    backgroundColor: 'rgba(255,107,157,0.85)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  mainPhotoBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
