import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { store, RootState, AppDispatch } from './src/store/store';
import { AppNavigator } from './src/navigation/AppNavigator';
import { loadSavedTheme } from './src/store/slices/themeSlice';
import { ThemeContext, LIGHT_COLORS, DARK_COLORS } from './src/constants/theme';

/** Inner component so it can use hooks that need the Provider to be mounted */
const ThemedApp: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const mode = useSelector((s: RootState) => s.theme.mode);

  // Restore theme from AsyncStorage once on mount
  useEffect(() => {
    dispatch(loadSavedTheme());
  }, []);

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={colors}>
      <StatusBar style={mode === 'dark' ? 'light' : 'dark'} />
      <AppNavigator />
    </ThemeContext.Provider>
  );
};

export default function App() {
  return (
    <Provider store={store}>
      <ThemedApp />
    </Provider>
  );
}

