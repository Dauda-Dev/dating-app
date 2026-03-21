import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../services/apiClient';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = { navigation: NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'> };

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!email) { Alert.alert('Error', 'Please enter your email'); return; }
    setLoading(true);
    try {
      await apiClient.forgotPassword(email.trim().toLowerCase());
      setSent(true);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.card}>
          <Text style={styles.emoji}>🔑</Text>
          <Text style={styles.title}>Reset Password</Text>

          {sent ? (
            <View style={styles.sentWrap}>
              <Text style={styles.sentTitle}>Check your inbox!</Text>
              <Text style={styles.sentBody}>
                We've sent password reset instructions to {email}
              </Text>
              <Button title="Back to Login" onPress={() => navigation.navigate('Login')} style={styles.btn} />
            </View>
          ) : (
            <>
              <Text style={styles.desc}>Enter your email and we'll send you a reset link.</Text>
              <Input
                label="Email"
                placeholder="your@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <Button title="Send Reset Link" onPress={handleSubmit} loading={loading} />
            </>
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  back: { position: 'absolute', top: 56, left: 24 },
  backText: { color: '#fff', fontSize: 16 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 28, elevation: 8 },
  emoji: { fontSize: 48, textAlign: 'center', marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.black, textAlign: 'center', marginBottom: 8 },
  desc: { color: COLORS.gray, fontSize: 14, textAlign: 'center', marginBottom: 24 },
  sentWrap: { alignItems: 'center' },
  sentTitle: { fontSize: 18, fontWeight: '700', color: COLORS.success, marginBottom: 8 },
  sentBody: { color: COLORS.gray, textAlign: 'center', marginBottom: 24 },
  btn: { width: '100%' },
});
