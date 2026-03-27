import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signup, googleLogin } from '../../store/slices/authSlice';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

WebBrowser.maybeCompleteAuthSession();

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'> };

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', dateOfBirth: '', gender: '',
  });
  const [googleLoading, setGoogleLoading] = useState(false);

  const set = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const GENDERS = ['male', 'female', 'non-binary'];

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'heartsync' }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) {
        handleGoogleToken(idToken);
      } else {
        Alert.alert('Error', 'Google sign-in did not return a token');
        setGoogleLoading(false);
      }
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    const result = await dispatch(googleLogin(idToken));
    setGoogleLoading(false);
    if (googleLogin.rejected.match(result)) {
      Alert.alert('Google Sign-In Failed', result.payload as string || 'Please try again');
    }
    // On success, Redux state update triggers navigator to show main app
  };

  const handleGooglePress = async () => {
    if (!request) {
      Alert.alert('Not ready', 'Google sign-in is not configured yet');
      return;
    }
    setGoogleLoading(true);
    await promptAsync();
  };

  const handleSignup = async () => {
    const { email, password, confirmPassword, firstName, lastName, dateOfBirth, gender } = form;
    if (!email || !password || !firstName || !lastName || !dateOfBirth || !gender) {
      Alert.alert('Error', 'Please fill in all fields including gender'); return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match'); return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters'); return;
    }

    const result = await dispatch(signup({
      email: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      gender,
    }));

    if (signup.fulfilled.match(result)) {
      navigation.navigate('VerifyEmail', { email: form.email });
    } else {
      Alert.alert('Signup Failed', result.payload as string);
    }
  };

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Create account</Text>
          <Text style={styles.subtitle}>Find your match today</Text>

          <View style={styles.form}>
            <View style={styles.row}>
              <View style={styles.half}>
                <Input label="First Name" placeholder="Jane" value={form.firstName} onChangeText={set('firstName')} />
              </View>
              <View style={styles.half}>
                <Input label="Last Name" placeholder="Doe" value={form.lastName} onChangeText={set('lastName')} />
              </View>
            </View>
            <Input
              label="Email"
              placeholder="jane@example.com"
              value={form.email}
              onChangeText={set('email')}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Date of Birth (YYYY-MM-DD)"
              placeholder="1995-06-15"
              value={form.dateOfBirth}
              onChangeText={set('dateOfBirth')}
            />
            <Text style={styles.label}>Gender</Text>
            <View style={styles.genderRow}>
              {GENDERS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genderBtn, form.gender === g && styles.genderBtnActive]}
                  onPress={() => set('gender')(g)}
                >
                  <Text style={[styles.genderBtnText, form.gender === g && styles.genderBtnTextActive]}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Input label="Password" placeholder="••••••••" value={form.password} onChangeText={set('password')} secureTextEntry />
            <Input label="Confirm Password" placeholder="••••••••" value={form.confirmPassword} onChangeText={set('confirmPassword')} secureTextEntry />

            <Button title="Create Account" onPress={handleSignup} loading={isLoading} />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGooglePress}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#444" />
              ) : (
                <>
                  <Text style={styles.googleIcon}>G</Text>
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.signInRow}>
              <Text style={styles.grayText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.link}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  container: { flexGrow: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 12 },
  backText: { color: '#fff', fontSize: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginBottom: 24 },
  form: { backgroundColor: '#fff', borderRadius: 20, padding: 24, elevation: 8 },
  row: { flexDirection: 'row', gap: 12 },
  half: { flex: 1 },
  signInRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  grayText: { color: COLORS.gray, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, marginBottom: 6, marginTop: 4 },
  genderRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  genderBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1.5,
    borderColor: COLORS.lightGray, alignItems: 'center',
  },
  genderBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  genderBtnText: { fontSize: 13, color: COLORS.gray, fontWeight: '500' },
  genderBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#e5e7eb' },
  dividerText: { marginHorizontal: 12, color: COLORS.gray, fontSize: 13 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#dadce0',
    borderRadius: 10,
    paddingVertical: 12,
    marginBottom: 8,
    backgroundColor: '#fff',
    gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#3c4043' },
});
