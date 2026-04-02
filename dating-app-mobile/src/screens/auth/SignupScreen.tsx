import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, Dimensions, ScrollView, Animated,
  KeyboardAvoidingView, Platform, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signup, googleLogin } from '../../store/slices/authSlice';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

WebBrowser.maybeCompleteAuthSession();

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'> };

const { width: W } = Dimensions.get('window');
const TOTAL_STEPS = 5;

const GENDERS = [
  { key: 'male', emoji: '', label: 'Man' },
  { key: 'female', emoji: '', label: 'Woman' },
  { key: 'non-binary', emoji: '', label: 'Non-binary' },
];

const LOOKING_FOR = [
  { key: 'male', emoji: '', label: 'Men' },
  { key: 'female', emoji: '', label: 'Women' },
  { key: 'everyone', emoji: '', label: 'Everyone' },
];

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);

  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const [step, setStep] = useState(0);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    redirectUri: makeRedirectUri({ scheme: 'heartsync' }),
  });

  React.useEffect(() => {
    if (response?.type === 'success') {
      const idToken = response.authentication?.idToken;
      if (idToken) handleGoogleToken(idToken);
      else { Alert.alert('Error', 'Google sign-in did not return a token'); setGoogleLoading(false); }
    } else if (response?.type === 'error' || response?.type === 'dismiss') {
      setGoogleLoading(false);
    }
  }, [response]);

  const handleGoogleToken = async (idToken: string) => {
    const result = await dispatch(googleLogin(idToken));
    setGoogleLoading(false);
    if (googleLogin.rejected.match(result))
      Alert.alert('Google Sign-In Failed', result.payload as string || 'Please try again');
  };

  const handleGooglePress = async () => {
    if (!request) { Alert.alert('Not ready', 'Google sign-in is not configured yet'); return; }
    setGoogleLoading(true);
    await promptAsync();
  };

  const goTo = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * W, animated: true });
    setStep(next);
    Animated.spring(progressAnim, {
      toValue: next / (TOTAL_STEPS - 1),
      useNativeDriver: false,
    }).start();
  };

  const validateStep = (): boolean => {
    switch (step) {
      case 0:
        if (!firstName.trim() || !lastName.trim()) {
          Alert.alert('Required', 'Please enter your first and last name'); return false;
        }
        break;
      case 1:
        if (!dateOfBirth.match(/^\d{4}-\d{2}-\d{2}$/)) {
          Alert.alert('Invalid date', 'Use the format YYYY-MM-DD  e.g. 1995-06-15'); return false;
        }
        break;
      case 2:
        if (!gender) { Alert.alert('Required', 'Please select your gender'); return false; }
        break;
      case 3:
        if (!lookingFor) { Alert.alert('Required', "Please select who you're looking for"); return false; }
        break;
      case 4:
        if (!email.trim()) { Alert.alert('Required', 'Enter your email'); return false; }
        if (!password || password.length < 8) { Alert.alert('Weak password', 'At least 8 characters'); return false; }
        if (password !== confirmPassword) { Alert.alert('Mismatch', 'Passwords do not match'); return false; }
        break;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS - 1) goTo(step + 1);
    else handleSignup();
  };

  const handleBack = () => {
    if (step === 0) navigation.goBack();
    else goTo(step - 1);
  };

  const handleSignup = async () => {
    const result = await dispatch(signup({
      email: email.trim().toLowerCase(),
      password,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      gender,
    }));
    if (signup.fulfilled.match(result)) {
      navigation.navigate('VerifyEmail', { email });
    } else {
      Alert.alert('Signup Failed', result.payload as string);
    }
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const isLastStep = step === TOTAL_STEPS - 1;

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.screen}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>{'\u2190'}</Text>
        </TouchableOpacity>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepCounter}>{step + 1}/{TOTAL_STEPS}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled={false}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
          snapToInterval={W}
          decelerationRate="fast"
        >
          {/* Step 0 — Name */}
          <View style={{ width: W }}>
            <ScrollView contentContainerStyle={styles.slideScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.stepEmoji}>{'\uD83D\uDC4B'}</Text>
              <Text style={styles.stepTitle}>What's your name?</Text>
              <Text style={styles.stepSub}>This is how you'll appear to others</Text>
              <TextInput
                style={styles.bigInput}
                placeholder="First name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={firstName}
                onChangeText={setFirstName}
                returnKeyType="next"
              />
              <TextInput
                style={[styles.bigInput, { marginTop: 14 }]}
                placeholder="Last name"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={lastName}
                onChangeText={setLastName}
                returnKeyType="done"
              />
            </ScrollView>
          </View>

          {/* Step 1 — Birthday */}
          <View style={{ width: W }}>
            <ScrollView contentContainerStyle={styles.slideScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.stepEmoji}>{'\uD83C\uDF82'}</Text>
              <Text style={styles.stepTitle}>When's your birthday?</Text>
              <Text style={styles.stepSub}>You must be 18+ to use HeartSync</Text>
              <TextInput
                style={styles.bigInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                keyboardType="numbers-and-punctuation"
                maxLength={10}
              />
              <Text style={styles.inputHint}>e.g. 1995-06-15</Text>
            </ScrollView>
          </View>

          {/* Step 2 — Gender */}
          <View style={{ width: W }}>
            <ScrollView contentContainerStyle={styles.slideScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.stepEmoji}>{'\uD83E\uDDD1'}</Text>
              <Text style={styles.stepTitle}>How do you identify?</Text>
              <Text style={styles.stepSub}>Helps us personalise your experience</Text>
              <View style={styles.choiceGrid}>
                {GENDERS.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.choiceCard, gender === g.key && styles.choiceCardActive]}
                    onPress={() => setGender(g.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.choiceEmoji}>{g.label[0]}</Text>
                    <Text style={[styles.choiceLabel, gender === g.key && styles.choiceLabelActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Step 3 — Looking For */}
          <View style={{ width: W }}>
            <ScrollView contentContainerStyle={styles.slideScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.stepEmoji}>{'\uD83D\uDC9E'}</Text>
              <Text style={styles.stepTitle}>Who are you looking for?</Text>
              <Text style={styles.stepSub}>You can change this later in settings</Text>
              <View style={styles.choiceGrid}>
                {LOOKING_FOR.map((g) => (
                  <TouchableOpacity
                    key={g.key}
                    style={[styles.choiceCard, lookingFor === g.key && styles.choiceCardActive]}
                    onPress={() => setLookingFor(g.key)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.choiceEmoji}>{g.label[0]}</Text>
                    <Text style={[styles.choiceLabel, lookingFor === g.key && styles.choiceLabelActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          {/* Step 4 — Account */}
          <View style={{ width: W }}>
            <ScrollView contentContainerStyle={styles.slideScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.stepEmoji}>{'\uD83D\uDD10'}</Text>
              <Text style={styles.stepTitle}>Create your account</Text>
              <Text style={styles.stepSub}>Your email stays private</Text>
              <TextInput
                style={styles.bigInput}
                placeholder="Email address"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View style={styles.passRow}>
                <TextInput
                  style={[styles.bigInput, { flex: 1 }]}
                  placeholder="Password (8+ chars)"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <TouchableOpacity onPress={() => setShowPass((v) => !v)} style={styles.eyeBtn}>
                  <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[styles.bigInput, { marginTop: 14 }]}
                placeholder="Confirm password"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPass}
              />
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGooglePress}
                disabled={googleLoading}
                activeOpacity={0.85}
              >
                {googleLoading
                  ? <ActivityIndicator size="small" color="#444" />
                  : <><Text style={styles.googleIcon}>G</Text><Text style={styles.googleBtnText}>Continue with Google</Text></>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.nextBtn, isLoading && { opacity: 0.7 }]}
          onPress={handleNext}
          disabled={isLoading}
          activeOpacity={0.88}
        >
          {isLoading
            ? <ActivityIndicator color={COLORS.primary} />
            : <Text style={styles.nextBtnText}>{isLastStep ? 'Create Account ' : 'Continue '}</Text>}
        </TouchableOpacity>

        {step === 0 && (
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink}>
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1 },

  topBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 12, gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  progressTrack: {
    flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#fff', borderRadius: 2 },
  stepCounter: {
    color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: '600',
    width: 32, textAlign: 'right',
  },

  slideScroll: { paddingHorizontal: 28, paddingTop: 32, paddingBottom: 24 },
  slide: {},
  stepEmoji: { fontSize: 56, marginBottom: 16 },
  stepTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 8, lineHeight: 34 },
  stepSub: { fontSize: 15, color: 'rgba(255,255,255,0.75)', marginBottom: 32, lineHeight: 22 },

  bigInput: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 17,
    color: '#fff',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  inputHint: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 8 },
  passRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  eyeBtn: { padding: 8 },
  eyeText: { fontSize: 20 },

  choiceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  choiceCard: {
    flex: 1, minWidth: (W - 56 - 24) / 3 - 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 16, paddingVertical: 22,
    alignItems: 'center',
    borderWidth: 2, borderColor: 'transparent',
  },
  choiceCardActive: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderColor: '#fff',
  },
  choiceEmoji: { fontSize: 34, marginBottom: 10 },
  choiceLabel: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  choiceLabelActive: { color: '#FF6B9D' },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  dividerText: { marginHorizontal: 12, color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingVertical: 15, gap: 10,
  },
  googleIcon: { fontSize: 18, fontWeight: '900', color: '#4285F4' },
  googleBtnText: { fontSize: 15, fontWeight: '700', color: '#3c4043' },

  bottomBar: { paddingHorizontal: 24, paddingBottom: 44, paddingTop: 12, gap: 14 },
  nextBtn: {
    backgroundColor: '#fff', borderRadius: 28,
    paddingVertical: 17, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 10, elevation: 5,
  },
  nextBtnText: { fontSize: 17, fontWeight: '800', color: '#FF6B9D' },
  loginLink: { alignItems: 'center' },
  loginLinkText: { color: 'rgba(255,255,255,0.75)', fontSize: 14 },
  loginLinkBold: { color: '#fff', fontWeight: '700' },
});
