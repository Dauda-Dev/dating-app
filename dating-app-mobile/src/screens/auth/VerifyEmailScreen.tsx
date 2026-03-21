import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../../components/common/Button';
import { COLORS } from '../../constants';
import { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'VerifyEmail'>;
  route: RouteProp<AuthStackParamList, 'VerifyEmail'>;
};

export const VerifyEmailScreen: React.FC<Props> = ({ navigation, route }) => {
  const { email } = route.params;

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.emoji}>📧</Text>
          <Text style={styles.title}>Verify Your Email</Text>
          <Text style={styles.body}>
            We sent a verification link to{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <Text style={styles.hint}>
            Check your inbox and click the link to activate your account.
          </Text>
          <Button
            title="Go to Login"
            onPress={() => navigation.navigate('Login')}
            style={styles.btn}
          />
          <TouchableOpacity style={styles.resendWrap}>
            <Text style={styles.resend}>Didn't receive it? Resend</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 32, elevation: 8, alignItems: 'center' },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.black, marginBottom: 16 },
  body: { fontSize: 15, color: COLORS.darkGray, textAlign: 'center', lineHeight: 22, marginBottom: 8 },
  email: { color: COLORS.primary, fontWeight: '600' },
  hint: { fontSize: 13, color: COLORS.gray, textAlign: 'center', marginBottom: 28 },
  btn: { width: '100%' },
  resendWrap: { marginTop: 16 },
  resend: { color: COLORS.primary, fontSize: 14 },
});
