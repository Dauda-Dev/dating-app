import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '../../store/hooks';
import { apiClient } from '../../services/apiClient';
import { COLORS } from '../../constants';

const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    price: '₦0',
    period: 'forever',
    emoji: '🆓',
    color: '#6B7280',
    bg: '#F9FAFB',
    border: '#E5E7EB',
    features: [
      '10 swipes per day',
      '1 active match at a time',
      'Basic discovery',
      'Video calls',
      'Date planning',
    ],
    missing: ['Unlimited swipes', 'See who liked you', 'Unlimited steals', 'Profile boost'],
  },
  {
    tier: 'premium',
    name: 'Premium',
    price: '₦2,000',
    period: 'per month',
    emoji: '⭐',
    color: '#7C3AED',
    bg: '#F5F3FF',
    border: '#7C3AED',
    features: [
      'Unlimited swipes',
      'See who liked you',
      'Priority discovery',
      'Video calls',
      'Date planning',
      'Steal requests',
    ],
    missing: ['Unlimited steals', 'Profile boost'],
  },
  {
    tier: 'gold',
    name: 'Gold',
    price: '₦5,000',
    period: 'per month',
    emoji: '🥇',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#D97706',
    features: [
      'Everything in Premium',
      'Unlimited steals',
      'Profile boost',
      'Read receipts',
      'Priority support',
      'Exclusive badge',
    ],
    missing: [],
  },
];

export const SubscriptionScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState<string | null>(null);

  const currentTier = user?.subscriptionTier || 'free';

  const handleUpgrade = async (tier: string) => {
    if (tier === currentTier) return;
    if (tier === 'free') {
      Alert.alert('Downgrade', 'Contact support to downgrade your plan.');
      return;
    }

    Alert.alert(
      `Upgrade to ${tier.charAt(0).toUpperCase() + tier.slice(1)}?`,
      'Continue to in-app subscription checkout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Proceed',
          onPress: async () => {
            try {
              setLoading(tier);
              const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
              const result = await apiClient.initializeStoreSubscription(tier, platform);
              setLoading(null);

              Alert.alert(
                '🧾 Subscription Started',
                `Plan: ${tier.toUpperCase()}\nProduct: ${result.productId}\n\nNext step: complete purchase in native billing and submit purchase token/receipt for server validation.`,
                [
                  { text: 'OK', style: 'default' },
                ]
              );
            } catch (error: any) {
              setLoading(null);
              Alert.alert('Error', error.response?.data?.error || error.message || 'Subscription setup failed');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Choose a Plan</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Unlock more connections and features</Text>

        {/* Current plan badge */}
        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>
            Current plan: <Text style={{ fontWeight: '700' }}>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</Text>
          </Text>
        </View>

        {PLANS.map((plan) => {
          const isCurrent = plan.tier === currentTier;
          const isUpgrade = PLANS.findIndex((p) => p.tier === plan.tier) > PLANS.findIndex((p) => p.tier === currentTier);
          const isLoadingThis = loading === plan.tier;

          return (
            <View
              key={plan.tier}
              style={[
                styles.planCard,
                { borderColor: plan.border, backgroundColor: plan.bg },
                isCurrent && styles.planCardCurrent,
              ]}
            >
              {isCurrent && (
                <View style={[styles.currentChip, { backgroundColor: plan.color }]}>
                  <Text style={styles.currentChipText}>Current Plan</Text>
                </View>
              )}
              {plan.tier === 'gold' && !isCurrent && (
                <View style={styles.popularChip}>
                  <Text style={styles.popularChipText}>⭐ Most Popular</Text>
                </View>
              )}

              <View style={styles.planHeader}>
                <Text style={styles.planEmoji}>{plan.emoji}</Text>
                <View style={styles.planTitleWrap}>
                  <Text style={[styles.planName, { color: plan.color }]}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {plan.price} <Text style={styles.planPeriod}>{plan.period}</Text>
                  </Text>
                </View>
              </View>

              <View style={styles.featureList}>
                {plan.features.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={[styles.featureCheck, { color: plan.color }]}>✓</Text>
                    <Text style={styles.featureText}>{f}</Text>
                  </View>
                ))}
                {plan.missing.map((f) => (
                  <View key={f} style={styles.featureRow}>
                    <Text style={styles.featureCross}>✕</Text>
                    <Text style={styles.featureTextMissing}>{f}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && isUpgrade && (
                <TouchableOpacity
                  style={[styles.upgradeBtn, { backgroundColor: plan.color }, isLoadingThis && styles.upgradeBtnLoading]}
                  onPress={() => handleUpgrade(plan.tier)}
                  disabled={!!loading}
                  activeOpacity={0.85}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.upgradeBtnText}>Upgrade to {plan.name}</Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          Subscriptions are managed in your device app store billing settings.
          Renewal and cancellation are controlled by your store account.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  content: { padding: 20, paddingBottom: 48 },
  subtitle: { fontSize: 15, color: COLORS.gray, textAlign: 'center', marginBottom: 12 },
  currentBadge: {
    backgroundColor: '#EFF6FF', borderRadius: 10, paddingVertical: 8,
    paddingHorizontal: 16, alignSelf: 'center', marginBottom: 20,
  },
  currentBadgeText: { color: '#1D4ED8', fontSize: 14 },
  planCard: {
    borderRadius: 18, borderWidth: 2, padding: 20, marginBottom: 16,
    position: 'relative', overflow: 'hidden',
  },
  planCardCurrent: { borderWidth: 2.5 },
  currentChip: {
    position: 'absolute', top: 14, right: 14,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
  },
  currentChipText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  popularChip: {
    position: 'absolute', top: 14, right: 14,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3,
    backgroundColor: '#FEF3C7',
  },
  popularChipText: { color: '#92400E', fontSize: 11, fontWeight: '700' },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  planEmoji: { fontSize: 36, marginRight: 14 },
  planTitleWrap: { flex: 1 },
  planName: { fontSize: 20, fontWeight: '800' },
  planPrice: { fontSize: 18, fontWeight: '700', color: COLORS.black, marginTop: 2 },
  planPeriod: { fontSize: 13, color: COLORS.gray, fontWeight: '400' },
  featureList: { marginBottom: 16 },
  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  featureCheck: { fontSize: 14, fontWeight: '700', marginRight: 8, width: 16 },
  featureCross: { fontSize: 13, color: COLORS.lightGray, marginRight: 8, width: 16 },
  featureText: { fontSize: 14, color: COLORS.black },
  featureTextMissing: { fontSize: 14, color: COLORS.lightGray },
  upgradeBtn: {
    borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4,
  },
  upgradeBtnLoading: { opacity: 0.7 },
  upgradeBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  disclaimer: {
    fontSize: 12, color: COLORS.gray, textAlign: 'center', lineHeight: 18, marginTop: 8,
  },
});
