import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, Clipboard, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { apiClient } from '../../services/apiClient';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
  route: RouteProp<AuthStackParamList, 'VerifyEmail'>;
};

const CODE_LENGTH = 6;
const COOLDOWN = 60;

export const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;

  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [codeError, setCodeError] = useState('');

  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  // Pulse the envelope
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const startCountdown = useCallback(() => {
    setCountdown(COOLDOWN);
    intervalRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(intervalRef.current!); return 0; }
        return c - 1;
      });
    }, 1000);
  }, []);

  const triggerShake = () => {
    shake.setValue(0);
    Animated.sequence([
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 10, duration: 60, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  };

  const submitCode = async (code: string) => {
    if (verifying) return;
    setVerifying(true);
    setCodeError('');
    try {
      await apiClient.verifyEmailOtp(email, code);
      // Success — navigate to Login with a success flag
      navigation.reset({ index: 0, routes: [{ name: 'Login', params: { verified: true } as any }] });
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Incorrect code. Try again.';
      setCodeError(msg);
      setDigits(Array(CODE_LENGTH).fill(''));
      setFocusedIdx(0);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
      triggerShake();
    } finally {
      setVerifying(false);
    }
  };

  const handleDigitChange = (text: string, idx: number) => {
    // Handle paste — if user pastes all 6 digits at once
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === CODE_LENGTH) {
      const newDigits = cleaned.split('');
      setDigits(newDigits);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      submitCode(cleaned);
      return;
    }

    // Normal single-digit entry
    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = digit;
    setDigits(newDigits);
    setCodeError('');

    if (digit && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
      setFocusedIdx(idx + 1);
    }

    // Auto-submit when last box filled
    if (digit && idx === CODE_LENGTH - 1) {
      const full = newDigits.join('');
      if (full.length === CODE_LENGTH) submitCode(full);
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      const newDigits = [...digits];
      newDigits[idx - 1] = '';
      setDigits(newDigits);
      inputRefs.current[idx - 1]?.focus();
      setFocusedIdx(idx - 1);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resendState === 'sending') return;
    setResendState('sending');
    setResendError('');
    setCodeError('');
    try {
      await apiClient.resendVerification(email);
      setResendState('sent');
      startCountdown();
      setTimeout(() => setResendState('idle'), 4000);
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to resend.';
      setResendError(msg);
      setResendState('error');
    }
  };

  const code = digits.join('');
  const canVerify = code.length === CODE_LENGTH && !verifying;

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <View style={styles.container}>
        {/* Card */}
        <View style={styles.card}>
          <Animated.Text style={[styles.emoji, { transform: [{ scale: pulse }] }]}>📧</Animated.Text>

          <Text style={styles.title}>Check your email</Text>
          <Text style={styles.body}>
            We sent a 6-digit code to{'\n'}
            <Text style={styles.emailText}>{email}</Text>
          </Text>
          <Text style={styles.hint}>Enter the code below — it expires in 10 minutes.</Text>

          {/* OTP boxes */}
          <Animated.View style={[styles.otpRow, { transform: [{ translateX: shake }] }]}>
            {digits.map((d, i) => (
              <TextInput
                key={i}
                ref={(r) => { inputRefs.current[i] = r; }}
                style={[
                  styles.otpBox,
                  focusedIdx === i && styles.otpBoxFocused,
                  !!d && styles.otpBoxFilled,
                  !!codeError && styles.otpBoxError,
                ]}
                value={d}
                onChangeText={(t) => handleDigitChange(t, i)}
                onKeyPress={(e) => handleKeyPress(e, i)}
                onFocus={() => setFocusedIdx(i)}
                keyboardType="number-pad"
                maxLength={CODE_LENGTH} // allow paste of full code
                selectTextOnFocus
                caretHidden
              />
            ))}
          </Animated.View>

          {/* Error message */}
          {!!codeError && (
            <Text style={styles.codeError}>⚠️ {codeError}</Text>
          )}

          {/* Verify button */}
          <TouchableOpacity
            style={[styles.verifyBtn, !canVerify && styles.verifyBtnDisabled]}
            onPress={() => canVerify && submitCode(code)}
            disabled={!canVerify}
            activeOpacity={0.85}
          >
            {verifying
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.verifyBtnText}>Verify →</Text>}
          </TouchableOpacity>

          {/* Resend */}
          <View style={styles.resendRow}>
            <Text style={styles.resendLabel}>Didn't get it? </Text>
            {resendState === 'sending' ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : countdown > 0 ? (
              <Text style={styles.resendCooldown}>Resend in {countdown}s</Text>
            ) : (
              <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                <Text style={styles.resendLink}>Resend code</Text>
              </TouchableOpacity>
            )}
          </View>

          {resendState === 'sent' && (
            <Text style={styles.resendSuccess}>✅ New code sent!</Text>
          )}
          {resendState === 'error' && (
            <Text style={styles.resendError}>⚠️ {resendError}</Text>
          )}

          <View style={styles.divider} />

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>← Back to Sign in</Text>
          </TouchableOpacity>
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
    borderRadius: 28,
    padding: 28,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    alignItems: 'center',
  },
  emoji: { fontSize: 60, marginBottom: 14 },
  title: { fontSize: 22, fontWeight: '800', color: '#111', marginBottom: 10, textAlign: 'center' },
  body: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22, marginBottom: 4 },
  emailText: { color: COLORS.primary, fontWeight: '700' },
  hint: { fontSize: 13, color: '#999', textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  otpRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  otpBox: {
    width: 44, height: 54,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    fontSize: 24,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },
  otpBoxFocused: {
    borderColor: COLORS.primary,
    backgroundColor: '#fff5f9',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: '#fff' },
  otpBoxError: { borderColor: COLORS.danger, backgroundColor: '#fff5f5' },

  codeError: { color: COLORS.danger, fontSize: 13, fontWeight: '600', marginBottom: 12, textAlign: 'center' },

  verifyBtn: {
    width: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 28,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  verifyBtnDisabled: { opacity: 0.45 },
  verifyBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  resendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  resendLabel: { color: '#888', fontSize: 14 },
  resendLink: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  resendCooldown: { color: '#aaa', fontSize: 14 },
  resendSuccess: { color: COLORS.success, fontSize: 13, fontWeight: '600', marginTop: 4 },
  resendError: { color: COLORS.danger, fontSize: 13, marginTop: 4 },

  divider: { width: '100%', height: 1, backgroundColor: '#f0f0f0', marginVertical: 20 },
  loginLink: { alignSelf: 'center' },
  loginLinkText: { color: '#999', fontSize: 14 },
});
