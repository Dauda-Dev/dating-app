import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { apiClient } from '../../services/apiClient';
import { COLORS } from '../../constants';
import { setSubscriptionTier } from '../../store/slices/authSlice';

// ── Google Play / App Store product IDs ──────────────────────────────────────
// Register these exact IDs in Google Play Console → Monetize → Subscriptions
// and set EXPO_PUBLIC_IAP_PREMIUM_SKU / EXPO_PUBLIC_IAP_GOLD_SKU in .env
const PRODUCT_IDS: Record<string, string> = {
  premium: process.env.EXPO_PUBLIC_IAP_PREMIUM_SKU ?? 'premium_monthly',
  gold:    process.env.EXPO_PUBLIC_IAP_GOLD_SKU    ?? 'gold_monthly',
};
// Reverse map: productId → tier
const TIER_BY_PRODUCT: Record<string, string> = Object.fromEntries(
  Object.entries(PRODUCT_IDS).map(([tier, pid]) => [pid, tier])
);

// ── Dynamic IAP module (absent in Expo Go, present in dev/prod builds) ───────
let iap: typeof import('expo-iap') | null = null;
try { iap = require('expo-iap'); } catch {}

// ── Plan definitions ─────────────────────────────────────────────────────────
const PLANS = [
  {
    tier: 'free',
    name: 'Free',
    fallbackPrice: '₦0',
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
    fallbackPrice: '₦2,000',
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
    fallbackPrice: '₦5,000',
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
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [loading, setLoading] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<Record<string, any>>({});
  const [iapReady, setIapReady] = useState(false);
  const [loadingStore, setLoadingStore] = useState(true);
  const purchaseListenerRef = useRef<ReturnType<typeof iap.purchaseUpdatedListener> | null>(null);
  const errorListenerRef   = useRef<ReturnType<typeof iap.purchaseErrorListener>   | null>(null);

  const currentTier = user?.subscriptionTier || 'free';

  // ── Determine live price label ────────────────────────────────────────────
  const priceFor = (tier: string, fallback: string) => {
    if (!iapReady) return fallback;
    const pid = PRODUCT_IDS[tier];
    if (!pid) return fallback;
    const p = storeProducts[pid];
    if (!p) return fallback;
    // expo-iap returns localizedPrice on both platforms
    return p.localizedPrice ?? p.price ?? fallback;
  };

  // ── IAP init & product fetch ──────────────────────────────────────────────
  const initIAP = useCallback(async () => {
    if (!iap) { setLoadingStore(false); return; }
    try {
      await iap.initConnection();
      const skus = Object.values(PRODUCT_IDS);
      const subs = await iap.getSubscriptions({ skus });
      const map: Record<string, any> = {};
      for (const sub of subs) { map[sub.productId] = sub; }
      setStoreProducts(map);
      setIapReady(true);
    } catch (e: any) {
      // Expected in Expo Go / dev client built without native modules.
      // UI falls back to hardcoded prices and the backend purchase flow.
      if (!e?.message?.includes('Cannot find native module')) {
        console.warn('[IAP] init failed:', e);
      }
    } finally {
      setLoadingStore(false);
    }
  }, []);

  // ── Purchase listener ─────────────────────────────────────────────────────
  const setupPurchaseListeners = useCallback(() => {
    if (!iap) return;

    purchaseListenerRef.current = iap.purchaseUpdatedListener(async (purchase) => {
      try {
        const receipt = purchase.transactionReceipt;
        if (!receipt) return;

        const productId = purchase.productId;
        const tier = TIER_BY_PRODUCT[productId];
        if (!tier) return;

        const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';

        // Validate with backend
        await apiClient.validateStoreSubscriptionPurchase({
          tier,
          platform,
          productId,
          ...(platform === 'android'
            ? { purchaseToken: (purchase as any).purchaseToken }
            : { transactionId: purchase.transactionId, receipt }),
        });

        // Acknowledge / finish the transaction
        await iap!.finishTransaction({ purchase, isConsumable: false });

        // Update Redux + cached user
        dispatch(setSubscriptionTier(tier as 'free' | 'premium' | 'gold'));
        setLoading(null);

        Alert.alert(
          '🎉 Subscription Activated!',
          `Welcome to ${tier.charAt(0).toUpperCase() + tier.slice(1)}! Your new features are now unlocked.`,
          [{ text: 'Let\'s Go!', onPress: () => navigation.goBack() }]
        );
      } catch (err: any) {
        setLoading(null);
        console.warn('[IAP] purchase processing error:', err);
        Alert.alert(
          'Purchase Issue',
          'Your payment was received but we could not activate your subscription. Please contact support with your purchase receipt.',
        );
      }
    });

    errorListenerRef.current = iap.purchaseErrorListener((error: any) => {
      setLoading(null);
      if (error?.code !== 'E_USER_CANCELLED') {
        Alert.alert('Purchase Failed', error?.message || 'Could not complete the purchase. Please try again.');
      }
    });
  }, [dispatch, navigation]);

  useEffect(() => {
    initIAP();
    setupPurchaseListeners();
    return () => {
      purchaseListenerRef.current?.remove?.();
      errorListenerRef.current?.remove?.();
      iap?.endConnection?.().catch(() => {});
    };
  }, [initIAP, setupPurchaseListeners]);

  // ── Handle upgrade button press ───────────────────────────────────────────
  const handleUpgrade = async (tier: string) => {
    if (tier === currentTier || loading) return;
    if (tier === 'free') {
      Alert.alert('Downgrade', 'Contact support to downgrade your plan.');
      return;
    }

    const planName = tier.charAt(0).toUpperCase() + tier.slice(1);
    const price = priceFor(tier, PLANS.find(p => p.tier === tier)?.fallbackPrice ?? '');

    Alert.alert(
      `Upgrade to ${planName}?`,
      `${price} per month · Billed through ${Platform.OS === 'ios' ? 'App Store' : 'Google Play'}. Cancel anytime in your store account settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Subscribe',
          onPress: () => void startPurchase(tier),
        },
      ]
    );
  };

  const startPurchase = async (tier: string) => {
    const productId = PRODUCT_IDS[tier];
    if (!productId) return;
    setLoading(tier);

    // If native IAP is available, go through the store
    if (iap && iapReady) {
      try {
        const sub = storeProducts[productId];
        const offerToken: string | undefined =
          Platform.OS === 'android'
            ? sub?.subscriptionOfferDetails?.[0]?.offerToken
            : undefined;

        await iap.requestSubscription({
          sku: productId,
          ...(offerToken ? { offerToken } : {}),
        });
        // Purchase result arrives via purchaseUpdatedListener — loading cleared there
      } catch (err: any) {
        setLoading(null);
        if (err?.code !== 'E_USER_CANCELLED') {
          Alert.alert('Error', err?.message || 'Could not start subscription.');
        }
      }
      return;
    }

    // Fallback: server-side initialization (dev / Expo Go)
    try {
      const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
      await apiClient.initializeStoreSubscription(tier, platform);
      setLoading(null);
      Alert.alert(
        '📱 Open Store Billing',
        `To complete your ${tier} subscription, open ${platform === 'ios' ? 'App Store' : 'Google Play'} billing for product "${productId}".`,
      );
    } catch (error: any) {
      setLoading(null);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Subscription setup failed');
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
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

        <View style={styles.currentBadge}>
          <Text style={styles.currentBadgeText}>
            Current plan: <Text style={{ fontWeight: '700' }}>{currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}</Text>
          </Text>
        </View>

        {/* Store loading indicator */}
        {loadingStore && (
          <View style={styles.storeLoadingRow}>
            <ActivityIndicator size="small" color={COLORS.primary} />
            <Text style={styles.storeLoadingText}>Loading store prices…</Text>
          </View>
        )}

        {PLANS.map((plan) => {
          const isCurrent    = plan.tier === currentTier;
          const planIndex    = PLANS.findIndex((p) => p.tier === plan.tier);
          const currentIndex = PLANS.findIndex((p) => p.tier === currentTier);
          const isUpgrade    = planIndex > currentIndex;
          const isLoadingThis = loading === plan.tier;
          const displayPrice = priceFor(plan.tier, plan.fallbackPrice);

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
                    {displayPrice}{' '}
                    <Text style={styles.planPeriod}>{plan.period}</Text>
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
                  style={[
                    styles.upgradeBtn,
                    { backgroundColor: plan.color },
                    !!loading && styles.upgradeBtnLoading,
                  ]}
                  onPress={() => handleUpgrade(plan.tier)}
                  disabled={!!loading}
                  activeOpacity={0.85}
                >
                  {isLoadingThis ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={styles.upgradeBtnText}>
                        Subscribe to {plan.name}
                      </Text>
                      {iapReady && (
                        <Text style={styles.upgradeBtnSub}>
                          via {Platform.OS === 'ios' ? 'App Store' : 'Google Play'}
                        </Text>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={styles.disclaimer}>
          Subscriptions auto-renew monthly. Manage or cancel anytime in your{' '}
          {Platform.OS === 'ios' ? 'App Store' : 'Google Play'} account settings.
          Payment is charged to your store account upon purchase confirmation.
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
  storeLoadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, gap: 8,
  },
  storeLoadingText: { fontSize: 13, color: COLORS.gray },
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
  upgradeBtnSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },
  disclaimer: {
    fontSize: 12, color: COLORS.gray, textAlign: 'center', lineHeight: 18, marginTop: 8,
  },
});
