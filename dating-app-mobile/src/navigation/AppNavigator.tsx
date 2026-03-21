import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { restoreAuth, getMe } from '../store/slices/authSlice';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { LoadingScreen } from '../components/common/LoadingScreen';

export const AppNavigator = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, needsOnboarding, isLoading, token } = useAppSelector((s) => s.auth);

  useEffect(() => {
    const init = async () => {
      const result = await dispatch(restoreAuth());
      if (restoreAuth.fulfilled.match(result) && result.payload) {
        await dispatch(getMe());
      }
    };
    init();
  }, [dispatch]);

  if (isLoading) return <LoadingScreen message="Loading…" />;

  if (!isAuthenticated) return <NavigationContainer><AuthNavigator /></NavigationContainer>;
  if (needsOnboarding) return <NavigationContainer><OnboardingNavigator /></NavigationContainer>;
  return <NavigationContainer><MainNavigator /></NavigationContainer>;
};

// Thin onboarding stack
import { createNativeStackNavigator } from '@react-navigation/native-stack';
const OnbStack = createNativeStackNavigator();
const OnboardingNavigator = () => (
  <OnbStack.Navigator screenOptions={{ headerShown: false }}>
    <OnbStack.Screen name="Onboarding" component={OnboardingScreen} />
  </OnbStack.Navigator>
);
