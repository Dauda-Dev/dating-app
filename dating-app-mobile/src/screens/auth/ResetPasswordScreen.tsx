import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, Animated, Alert, ScrollView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';
import { apiClient } from '../../services/apiClient';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
  route: RouteProp<AuthStackParamList, 'ResetPassword'>;
};

const CODE_LENGTH = 6;
const COOLDOWN = 60;

export const ResetPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;

  // ── Step: 'otp' | 'password' | 'done'
  const [step, setStep] = useState<'otp' | 'password' | 'done'>('otp');

  // OTP state
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [verifiedCode, setVerifiedCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [countdown, setCountdown] = useState(0);

  // Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [pwError, setPwError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(CODE_LENGTH).fill(null));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const shake = useRef(new Animated.Value(0)).current;
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

  // ── OTP digit input ────────────────────────────────────────────────────────
  const handleDigitChange = (text: string, idx: number) => {
    const cleaned = text.replace(/\D/g, '');
    if (cleaned.length === CODE_LENGTH) {
      const newDigits = cleaned.split('');
      setDigits(newDigits);
      inputRefs.current[CODE_LENGTH - 1]?.focus();
      submitCode(cleaned);
      return;
    }
    const digit = cleaned.slice(-1);
    const newDigits = [...digits];
    newDigits[idx] = digit;
    setDigits(newDigits);
    setOtpError('');
    if (digit && idx < CODE_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
    if (digit && idx === CODE_LENGTH - 1) {
      const full = newDigits.join('');
      if (full.length === CODE_LENGTH) submitCode(full);
    }
  };

  const handleKeyPress = (e: any, idx: number) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  // ── Verify OTP (just validate locally — the code is confirmed on resetPassword call)
  const submitCode = (code: string) => {
    if (code.length < CODE_LENGTH) { setOtpError('Enter all 6 digits'); return; }
    setVerifiedCode(code);
    setStep('password');
  };

  const handleVerifyPress = () => {
    const code = digits.join('');
    if (code.length < CODE_LENGTH) {
      setOtpError('Enter all 6 digits');
      triggerShake();
      return;
    }
    submitCode(code);
  };

  // ── Resend code ────────────────────────────────────────────────────────────
  const handleResend = async () => {
    if (resendState === 'sending' || countdown > 0) return;
    setResendState('sending');
    try {
      await apiClient.forgotPassword(email);
      setResendState('sent');
      setDigits(Array(CODE_LENGTH).fill(''));
      setOtpError('');
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
      startCountdown();
      setTimeout(() => setResendState('idle'), 3000);
    } catch {
      setResendState('idle');
      Alert.alert('Error', 'Could not resend code. Try again.');
    }
  };

  // ── Submit new password ────────────────────────────────────────────────────
  const handleResetPassword = async () => {
    setPwError('');
    if (!newPassword || newPassword.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      await apiClient.resetPassword(email, verifiedCode, newPassword);
      setStep('done');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Incorrect or expired code. Try again.';
      setPwError(msg);
      // Code was wrong — go back to OTP step
      if (err.response?.status === 400) {
        setStep('otp');
        setDigits(Array(CODE_LENGTH).fill(''));
        setOtpError(msg);
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.card}>

            {/* ── Done ── */}
            {step === 'done' && (
              <View style={styles.doneWrap}>
                <Text style={styles.doneEmoji}>🎉</Text>
                <Text style={styles.doneTitle}>Password updated!</Text>
                <Text style={styles.doneSub}>You can now log in with your new password.</Text>
                <TouchableOpacity
                  style={styles.primaryBtn}
                  onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Login' }] })}
                >
                  <Text style={styles.primaryBtnText}>Go to Login</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── OTP step ── */}
            {step === 'otp' && (
              <>
                <Animated.Text style={[styles.emoji, { transform: [{ scale: pulse }] }]}>🔐</Animated.Text>
                <Text style={styles.title}>Enter reset code</Text>
                <Text style={styles.sub}>
                  We sent a 6-digit code to{'\n'}
                  <Text style={styles.emailText}>{email}</Text>
                </Text>

                <Animated.View style={[styles.otpRow, { transform: [{ translateX: shake }] }]}>
                  {Array(CODE_LENGTH).fill(null).map((_, idx) => (
                    <TextInput
                      key={idx}
                      ref={(r) => { inputRefs.current[idx] = r; }}
                      style={[styles.otpBox, digits[idx] ? styles.otpBoxFilled : null]}
                      value={digits[idx]}
                      onChangeText={(t) => handleDigitChange(t, idx)}
                      onKeyPress={(e) => handleKeyPress(e, idx)}
                      keyboardType="number-pad"
                      maxLength={1}
                      selectTextOnFocus
                      autoFocus={idx === 0}
                      autoComplete="off"
                      autoCorrect={false}
                    />
                  ))}
                </Animated.View>

                {!!otpError && <Text style={styles.errorText}>{otpError}</Text>}

                <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyPress} disabled={verifying}>
                  {verifying
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Continue →</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.resendBtn}
                  onPress={handleResend}
                  disabled={resendState === 'sending' || countdown > 0}
                >
                  <Text style={styles.resendText}>
                    {resendState === 'sending' ? 'Sending…'
                      : resendState === 'sent' ? 'Code sent ✓'
                      : countdown > 0 ? `Resend in ${countdown}s`
                      : "Didn't receive it? Resend"}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── New password step ── */}
            {step === 'password' && (
              <>
                <Text style={styles.emoji}>🔑</Text>
                <Text style={styles.title}>New password</Text>
                <Text style={styles.sub}>Choose a strong password (8+ characters)</Text>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="New password"
                    placeholderTextColor={COLORS.gray}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                  />
                </View>

                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={COLORS.gray}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPass}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                  />
                </View>

                <TouchableOpacity style={styles.showPassRow} onPress={() => setShowPass((v) => !v)}>
                  <Text style={styles.showPassText}>{showPass ? '🙈 Hide password' : '👁️ Show password'}</Text>
                </TouchableOpacity>

                {!!pwError && <Text style={styles.errorText}>{pwError}</Text>}

                <TouchableOpacity style={styles.primaryBtn} onPress={handleResetPassword} disabled={submitting}>
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Reset Password</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity style={styles.resendBtn} onPress={() => setStep('otp')}>
                  <Text style={styles.resendText}>← Wrong code? Go back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24, paddingTop: 80 },
  back: { position: 'absolute', top: 56, left: 24 },
  backText: { color: '#fff', fontSize: 16 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },

  emoji: { fontSize: 52, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.black, textAlign: 'center', marginBottom: 8, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  emailText: { fontWeight: '700', color: COLORS.black },

  // OTP
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 12 },
  otpBox: {
    width: 46, height: 56,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.black,
    backgroundColor: '#fafafa',
  },
  otpBoxFilled: { borderColor: COLORS.primary, backgroundColor: '#fff5f8' },

  // Inputs
  inputWrap: { marginBottom: 14 },
  input: {
    height: 52,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: COLORS.black,
    backgroundColor: '#fafafa',
  },
  showPassRow: { alignItems: 'flex-end', marginBottom: 16 },
  showPassText: { fontSize: 13, color: COLORS.gray },

  errorText: { color: COLORS.danger, fontSize: 13, textAlign: 'center', marginBottom: 12 },

  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  resendBtn: { marginTop: 16, alignItems: 'center' },
  resendText: { fontSize: 14, color: COLORS.gray },

  // Done
  doneWrap: { alignItems: 'center', paddingVertical: 8 },
  doneEmoji: { fontSize: 60, marginBottom: 16 },
  doneTitle: { fontSize: 22, fontWeight: '800', color: COLORS.black, marginBottom: 8 },
  doneSub: { fontSize: 14, color: COLORS.gray, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
});
