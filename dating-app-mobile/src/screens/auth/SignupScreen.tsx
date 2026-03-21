import React, { useState } from 'react';
import {
  View, Text, StyleSheet, KeyboardAvoidingView,
  Platform, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signup } from '../../store/slices/authSlice';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'Signup'> };

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isLoading } = useAppSelector((s) => s.auth);

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '',
    firstName: '', lastName: '', dateOfBirth: '',
  });

  const set = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const handleSignup = async () => {
    const { email, password, confirmPassword, firstName, lastName, dateOfBirth } = form;
    if (!email || !password || !firstName || !lastName || !dateOfBirth) {
      Alert.alert('Error', 'Please fill in all fields'); return;
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
            <Input label="Password" placeholder="••••••••" value={form.password} onChangeText={set('password')} secureTextEntry />
            <Input label="Confirm Password" placeholder="••••••••" value={form.confirmPassword} onChangeText={set('confirmPassword')} secureTextEntry />

            <Button title="Create Account" onPress={handleSignup} loading={isLoading} />

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
});
