import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/common/Button';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { apiClient } from '../../services/apiClient';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
  route: RouteProp<AuthStackParamList, 'VerifyEmail'>;
};

const COOLDOWN = 60;

export const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;

  const [countdown, setCountdown] = useState(0);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pulse animation for the envelope icon
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.12, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const startCountdown = useCallback(() => {
    setCountdown(COOLDOWN);
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(intervalRef.current!);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const handleResend = async () => {
    if (countdown > 0 || resendState === 'sending') return;
    setResendState('sending');
    setResendError('');
    try {
      await apiClient.resendVerification(email);
      setResendState('sent');
      startCountdown();
      // Reset "sent" banner after 4s
      setTimeout(() => setResendState('idle'), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to resend. Try again.';
      setResendError(msg);
      setResendState('error');
    }
  };

  const canResend = countdown === 0 && resendState !== 'sending';

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.card}>
          {/* Animated envelope */}
          <Animated.Text style={[styles.emoji, { transform: [{ scale: pulse }] }]}>📧</Animated.Text>

          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.body}>
            We sent a link to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
          <Text style={styles.hint}>
            Click the link in your inbox to activate your account. Check your spam folder if you don't see it.
          </Text>

          {/* Success banner */}
          {resendState === 'sent' && (
            <View style={styles.successBanner}>
              <Text style={styles.successText}>✅ New verification email sent!</Text>
            </View>
          )}

          {/* Error banner */}
          {resendState === 'error' && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>⚠️ {resendError}</Text>
            </View>
          )}

          {/* Resend section */}
          <View style={styles.resendSection}>
            <Text style={styles.resendLabel}>Didn't receive it?</Text>

            {resendState === 'sending' ? (
              <View style={styles.sendingRow}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.sendingText}>Sending…</Text>
              </View>
            ) : (
              <TouchableOpacity
                onPress={handleResend}
                disabled={!canResend}
                style={[styles.resendBtn, !canResend && styles.resendBtnDisabled]}
                activeOpacity={0.7}
              >
                <Text style={[styles.resendBtnText, !canResend && styles.resendBtnTextDisabled]}>
                  {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Email'}
                </Text>
              </TouchableOpacity>
            )}

            {countdown > 0 && (
              <View style={styles.progressBarWrap}>
                <View style={[styles.progressBar, { width: `${((COOLDOWN - countdown) / COOLDOWN) * 100}%` }]} />
              </View>
            )}
          </View>

          <View style={styles.divider} />

          <Button
            title="Back to Login"
            variant="outline"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginBtn}
          />
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    alignItems: 'center',
  },
  emoji: { fontSize: 64, marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginBottom: 12, textAlign: 'center' },
  body: { fontSize: 15, color: COLORS.darkGray, textAlign: 'center', lineHeight: 22, marginBottom: 6 },
  emailText: { color: COLORS.primary, fontWeight: '700' },
  hint: { fontSize: 13, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 20 },

  successBanner: {
    backgroundColor: COLORS.success + '20',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
  },
  successText: { color: COLORS.success, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  errorBanner: {
    backgroundColor: COLORS.danger + '15',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
    width: '100%',
  },
  errorText: { color: COLORS.danger, fontSize: 13, fontWeight: '600', textAlign: 'center' },

  resendSection: { width: '100%', alignItems: 'center', marginBottom: 20 },
  resendLabel: { fontSize: 13, color: COLORS.gray, marginBottom: 10 },

  sendingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sendingText: { color: COLORS.primary, fontSize: 14 },

  resendBtn: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '10',
  },
  resendBtnDisabled: {
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.background,
  },
  resendBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  resendBtnTextDisabled: { color: COLORS.gray },

  progressBarWrap: {
    width: '100%',
    height: 4,
    backgroundColor: COLORS.lightGray,
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },

  divider: { width: '100%', height: 1, backgroundColor: COLORS.lightGray, marginBottom: 20 },
  loginBtn: { width: '100%' },
});

