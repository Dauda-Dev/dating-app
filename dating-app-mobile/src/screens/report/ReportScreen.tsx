import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { apiClient } from '../../services/apiClient';
import { ReportReason } from '../../types';
import { COLORS } from '../../constants';

type Props = NativeStackScreenProps<MainStackParamList, 'Report'>;

const REASONS: { value: ReportReason; label: string; emoji: string }[] = [
  { value: 'harassment', label: 'Harassment or bullying', emoji: '😡' },
  { value: 'fake_profile', label: 'Fake profile or impersonation', emoji: '🎭' },
  { value: 'underage', label: 'Appears to be underage', emoji: '🔞' },
  { value: 'spam', label: 'Spam or scam', emoji: '🚫' },
  { value: 'inappropriate_content', label: 'Inappropriate content', emoji: '⚠️' },
  { value: 'other', label: 'Other', emoji: '📝' },
];

export const ReportScreen: React.FC<Props> = ({ route, navigation }) => {
  const { userId, userName, matchId } = route.params;
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedReason) {
      Alert.alert('Select a reason', 'Please select a reason for your report.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient.submitReport({
        reportedUserId: userId,
        reason: selectedReason,
        matchId: matchId,
        details: details.trim() || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err.response?.data?.error ?? 'Failed to submit report. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>✅</Text>
          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successBody}>
            Thank you for helping keep Ovally safe. Our team will review your report
            within 24 hours.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report {userName}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>
          Why are you reporting this profile? Your report is anonymous.
        </Text>

        {/* Reason picker */}
        {REASONS.map((r) => (
          <TouchableOpacity
            key={r.value}
            style={[styles.reasonItem, selectedReason === r.value && styles.reasonSelected]}
            onPress={() => setSelectedReason(r.value)}
            activeOpacity={0.75}
          >
            <Text style={styles.reasonEmoji}>{r.emoji}</Text>
            <Text
              style={[styles.reasonLabel, selectedReason === r.value && styles.reasonLabelSelected]}
            >
              {r.label}
            </Text>
            {selectedReason === r.value && <Text style={styles.checkmark}>✓</Text>}
          </TouchableOpacity>
        ))}

        {/* Optional details */}
        <Text style={styles.detailsLabel}>Additional details (optional)</Text>
        <TextInput
          style={styles.detailsInput}
          placeholder="Tell us more about what happened…"
          placeholderTextColor="#bbb"
          multiline
          numberOfLines={4}
          value={details}
          onChangeText={setDetails}
          maxLength={500}
        />
        <Text style={styles.charCount}>{details.length}/500</Text>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, !selectedReason && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!selectedReason || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>Submit Report</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          False reports may result in your own account being reviewed.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 18, color: '#555' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#1a1a1a' },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    marginBottom: 10,
    backgroundColor: '#FAFAFA',
  },
  reasonSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '0D',
  },
  reasonEmoji: { fontSize: 22, marginRight: 12 },
  reasonLabel: { fontSize: 14, color: '#333', flex: 1, fontWeight: '500' },
  reasonLabelSelected: { color: COLORS.primary, fontWeight: '700' },
  checkmark: { fontSize: 16, color: COLORS.primary, fontWeight: '900' },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  detailsInput: {
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: { textAlign: 'right', fontSize: 11, color: '#bbb', marginTop: 4 },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 28,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  disclaimer: { textAlign: 'center', fontSize: 11, color: '#bbb', marginTop: 12 },
  // Success state
  successContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  successEmoji: { fontSize: 64, marginBottom: 20 },
  successTitle: { fontSize: 24, fontWeight: '900', color: '#1a1a1a', marginBottom: 12 },
  successBody: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 36 },
  doneBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    paddingVertical: 14,
    paddingHorizontal: 48,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
