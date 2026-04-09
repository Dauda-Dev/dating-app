import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { AppDispatch } from '../../store/store';
import { reopenTutorial } from '../../store/slices/tutorialSlice';
import { COLORS } from '../../constants';

interface Props {
  visible: boolean;
  onClose: () => void;
  currentScreen?: string; // e.g. 'Discover', 'Matches'
}

const HELP_SECTIONS = [
  {
    emoji: '🔥',
    screen: 'Discover',
    title: 'Discover',
    items: [
      'Swipe right to like, left to pass.',
      'Tap ⭐ to Super Like someone.',
      'You have a daily like quota (upgrade to remove it).',
      'Tap 😈 to steal someone else\'s match.',
    ],
  },
  {
    emoji: '💬',
    screen: 'Matches',
    title: 'Matches & Chat',
    items: [
      'New matches appear as circles at the top.',
      'Complete a video call to unlock full chat.',
      '✓✓ means your message has been read.',
    ],
  },
  {
    emoji: '📹',
    screen: 'Chat',
    title: 'Video Calls',
    items: [
      'Tap the 📹 icon in the chat header to start a call.',
      'Both users must join for the call to begin.',
      'After the call, the match is fully unlocked.',
    ],
  },
  {
    emoji: '🛡️',
    screen: null,
    title: 'Safety',
    items: [
      'Use 🚩 Report in any profile or chat to flag bad behavior.',
      'Our team reviews all reports within 24 hours.',
      'Accounts that violate guidelines will be suspended.',
    ],
  },
];

export const HelpModal: React.FC<Props> = ({ visible, onClose, currentScreen }) => {
  const dispatch = useDispatch<AppDispatch>();

  const handleReplayTutorial = (screen: string) => {
    onClose();
    setTimeout(() => dispatch(reopenTutorial(screen)), 300);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={styles.sheet}>
        {/* Handle bar */}
        <View style={styles.handle} />

        <Text style={styles.heading}>Help & Quick Reference 📖</Text>

        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
          {HELP_SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionEmoji}>{section.emoji}</Text>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.screen && (
                  <TouchableOpacity
                    style={styles.replayBtn}
                    onPress={() => handleReplayTutorial(section.screen!)}
                  >
                    <Text style={styles.replayText}>Show tutorial</Text>
                  </TouchableOpacity>
                )}
              </View>
              {section.items.map((item, i) => (
                <View key={i} style={styles.item}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={styles.itemText}>{item}</Text>
                </View>
              ))}
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
          <Text style={styles.closeBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '78%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 0,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E0E0E0',
    marginBottom: 16,
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 16,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
    backgroundColor: '#F9F9F9',
    borderRadius: 14,
    padding: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionEmoji: { fontSize: 20, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  replayBtn: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: 10,
    paddingVertical: 3,
    paddingHorizontal: 10,
  },
  replayText: { fontSize: 11, color: COLORS.primary, fontWeight: '700' },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4 },
  bullet: { color: COLORS.primary, fontWeight: '700', marginRight: 6, marginTop: 1 },
  itemText: { fontSize: 13, color: '#555', flex: 1, lineHeight: 19 },
  closeBtn: {
    margin: 16,
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
