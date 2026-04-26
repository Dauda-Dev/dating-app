import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import NetInfo from '@react-native-community/netinfo';
import { store, RootState, AppDispatch } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { loadSavedTheme } from './src/store/slices/themeSlice';
import { ThemeContext, LIGHT_COLORS, DARK_COLORS } from './src/constants/theme';

/** Inner component so it can use hooks that need the Provider to be mounted */
const ThemedApp: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);
  const [isOffline, setIsOffline] = useState(false);

  // Restore theme from AsyncStorage once on mount
  useEffect(() => {
    dispatch(loadSavedTheme());
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={colors}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
      {isOffline && (
        <View style={offlineStyles.banner}>
          <Text style={offlineStyles.text}>No internet connection</Text>
        </View>
      )}
    </ThemeContext.Provider>
  );
};

const offlineStyles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: '#EF4444',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  text: { color: '#fff', fontWeight: '700', fontSize: 13 },
});

export default function App() {
  return (
    <Provider store={store}>
      <ThemedApp />
    </Provider>
  );
}

