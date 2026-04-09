import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../store/store';
import { nextStep, skipTutorial, markTutorialSeen } from '../../store/slices/tutorialSlice';
import { COLORS } from '../../constants';

export const TutorialOverlay: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isVisible, currentStep, steps } = useSelector(
    (s: RootState) => s.tutorial
  );

  const slideAnim = React.useRef(new Animated.Value(120)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 320,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      slideAnim.setValue(120);
      opacityAnim.setValue(0);
    }
  }, [isVisible, currentStep]);

  if (!isVisible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLast) {
      dispatch(markTutorialSeen());
    }
    dispatch(nextStep());
  };

  const handleSkip = () => {
    dispatch(markTutorialSeen());
    dispatch(skipTutorial());
  };

  return (
    <Modal transparent animationType="none" visible={isVisible} statusBarTranslucent>
      {/* Dim backdrop */}
      <View style={styles.backdrop} pointerEvents="box-none" />

      {/* Bottom card */}
      <Animated.View
        style={[
          styles.card,
          { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
        ]}
      >
        {/* Step indicator dots */}
        <View style={styles.dots}>
          {steps.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>

        {/* Emoji */}
        <Text style={styles.emoji}>{step.emoji}</Text>

        {/* Content */}
        <Text style={styles.title}>{step.title}</Text>
        <Text style={styles.body}>{step.body}</Text>

        {/* Buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip all</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleNext} style={styles.nextBtn}>
            <Text style={styles.nextText}>{isLast ? 'Got it! 🎉' : 'Next →'}</Text>
          </TouchableOpacity>
        </View>

        {/* Step counter */}
        <Text style={styles.counter}>
          {currentStep + 1} / {steps.length}
        </Text>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 20,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 22,
  },
  emoji: {
    fontSize: 44,
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  body: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skipBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    color: '#999',
  },
  nextBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 28,
  },
  nextText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  counter: {
    textAlign: 'center',
    fontSize: 12,
    color: '#bbb',
  },
});
