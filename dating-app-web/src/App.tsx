import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { restoreAuth, getMe } from './store/slices/authSlice';

// Auth screens
import LoginScreen from './screens/auth/LoginScreen';
import SignupScreen from './screens/auth/SignupScreen';
import ForgotPasswordScreen from './screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './screens/auth/ResetPasswordScreen';
import VerifyEmailScreen from './screens/auth/VerifyEmailScreen';
import ResendVerificationScreen from './screens/auth/ResendVerificationScreen';

// Onboarding
import OnboardingScreen from './screens/onboarding/OnboardingScreen';

// Main screens
import HomeScreen from './screens/home/HomeScreen';
import DiscoveryScreen from './screens/discovery/DiscoveryScreen';
import ProfileScreen from './screens/profile/ProfileScreen';
import ProfileEditScreen from './screens/profile/ProfileEditScreen';
import MatchesScreen from './screens/matches/MatchesScreen';
import MatchDetailsScreen from './screens/matches/MatchDetailsScreen';
import ChatScreen from './screens/matches/ChatScreen';
import VideoCallScreen from './screens/video/VideoCallScreen';
import DateProposalScreen from './screens/dating/DateProposalScreen';
import DateAcceptanceScreen from './screens/dating/DateAcceptanceScreen';
import DateCompletionScreen from './screens/dating/DateCompletionScreen';
import StealNotificationScreen from './screens/steal/StealNotificationScreen';
import SettingsScreen from './screens/settings/SettingsScreen';

// Layout
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/common/LoadingScreen';

const AppContent: React.FC = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, needsOnboarding } = useAppSelector(state => state.auth);
  const [initializing, setInitializing] = React.useState(true);

  useEffect(() => {
    const initAuth = async () => {
      dispatch(restoreAuth());
      const token = localStorage.getItem('token');
      if (token) {
        await dispatch(getMe());
      }
      setInitializing(false);
    };
    initAuth();
  }, [dispatch]);

  if (initializing || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={!isAuthenticated ? <LoginScreen /> : <Navigate to="/" />} />
        <Route path="/signup" element={!isAuthenticated ? <SignupScreen /> : <Navigate to="/" />} />
        <Route path="/verify-email" element={<VerifyEmailScreen />} />
        <Route path="/resend-verification" element={<ResendVerificationScreen />} />
        <Route path="/forgot-password" element={<ForgotPasswordScreen />} />
        <Route path="/reset-password" element={<ResetPasswordScreen />} />

        {/* Onboarding — authenticated but profile incomplete */}
        <Route
          path="/onboarding"
          element={isAuthenticated ? <OnboardingScreen /> : <Navigate to="/login" />}
        />

        {/* Protected routes */}
        {isAuthenticated ? (
          <Route path="/" element={<MainLayout />}>
            <Route
              index
              element={needsOnboarding ? <Navigate to="/onboarding" replace /> : <HomeScreen />}
            />
            <Route path="discovery" element={<DiscoveryScreen />} />
            <Route path="matches" element={<MatchesScreen />} />
            <Route path="matches/:matchId" element={<MatchDetailsScreen />} />
            <Route path="chat/:matchId" element={<ChatScreen />} />
            <Route path="profile" element={<ProfileScreen />} />
            <Route path="profile/edit" element={<ProfileEditScreen />} />
            <Route path="video/:sessionId" element={<VideoCallScreen />} />
            <Route path="date/propose/:matchId" element={<DateProposalScreen />} />
            <Route path="date/accept/:dateId" element={<DateAcceptanceScreen />} />
            <Route path="date/complete/:dateId" element={<DateCompletionScreen />} />
            <Route path="steals" element={<StealNotificationScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
          </Route>
        ) : (
          <Route path="*" element={<Navigate to="/login" />} />
        )}
      </Routes>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
