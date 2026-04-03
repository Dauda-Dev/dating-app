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
import { login, googleLogin, clearError } from '../../store/slices/authSlice';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

WebBrowser.maybeCompleteAuthSession();

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'> };

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { error } = useAppSelector((s) => s.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

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
    dispatch(clearError());
    const result = await dispatch(googleLogin(idToken));
    setGoogleLoading(false);
    if (googleLogin.rejected.match(result)) {
      Alert.alert('Google Sign-In Failed', result.payload as string || 'Please try again');
    }
  };

  const handleGooglePress = async () => {
    if (!request) {
      Alert.alert('Not ready', 'Google sign-in is not configured yet');
      return;
    }
    setGoogleLoading(true);
    await promptAsync();
  };

  const handleLogin = async () => {
    if (!email || !password) { setLoginError('Please fill in all fields'); return; }
    dispatch(clearError());
    setLoginError('');
    setLoading(true);
    const result = await dispatch(login({ email: email.trim().toLowerCase(), password }));
    setLoading(false);
    if (login.rejected.match(result)) {
      const payload = result.payload as any;
      if (payload?.type === 'EMAIL_NOT_VERIFIED') {
        navigation.navigate('VerifyEmail', { email: email.trim().toLowerCase() });
      } else {
        setLoginError(typeof payload === 'string' ? payload : payload?.message || 'Login failed');
      }
    }
  };

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.logo}>💘</Text>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          <View style={styles.form}>
            <Input
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setLoginError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
            />
            <Input
              label="Password"
              placeholder="••••••••"
              value={password}
              onChangeText={(t) => { setPassword(t); setLoginError(''); }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
            />

            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotWrap}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <Button title="Sign In" onPress={handleLogin} loading={loading} style={styles.btn} />

            {!!loginError && (
              <Text style={styles.loginError}>{loginError}</Text>
            )}

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

            <View style={styles.row}>
              <Text style={styles.rowText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
                <Text style={styles.link}>Sign up</Text>
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
  container: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logo: { fontSize: 64, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginBottom: 32 },
  form: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  forgotWrap: { alignSelf: 'flex-end', marginBottom: 16 },
  forgotText: { color: COLORS.primary, fontSize: 14 },
  btn: { marginTop: 4 },
  loginError: {
    color: COLORS.danger,
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 18,
  },
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
  googleIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleBtnText: { fontSize: 15, fontWeight: '600', color: '#3c4043' },
  row: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  rowText: { color: COLORS.gray, fontSize: 14 },
  link: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
});
