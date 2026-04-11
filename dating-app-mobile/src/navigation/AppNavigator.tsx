import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { restoreAuth, getMe } from '../store/slices/authSlice';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { LoadingScreen } from '../components/common/LoadingScreen';

// A single root stack so NavigationContainer is NEVER remounted.
// Switching between auth / onboarding / main is done by showing different
// screens inside this one stack rather than swapping out NavigationContainers.
const RootStack = createNativeStackNavigator();

export const AppNavigator = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, needsOnboarding } = useAppSelector((s) => s.auth);
  const [initializing, setInitializing] = React.useState(true);

  useEffect(() => {
    const init = async () => {
      const result = await dispatch(restoreAuth());
      if (restoreAuth.fulfilled.match(result) && result.payload) {
        await dispatch(getMe());
      }
      setInitializing(false);
    };
    init();
  }, [dispatch]);

  if (initializing) return <LoadingScreen message="Loading…" />;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!isAuthenticated ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : needsOnboarding ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainNavigator} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};

const OnbStack = createNativeStackNavigator();
const OnboardingNavigator = () => (
  <OnbStack.Navigator screenOptions={{ headerShown: false }}>
    <OnbStack.Screen name="OnboardingScreen" component={OnboardingScreen} />
  </OnbStack.Navigator>
);
