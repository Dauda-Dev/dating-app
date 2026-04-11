import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppDispatch } from '../store';

export type ThemeMode = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
}

const initialState: ThemeState = {
  mode: 'light',
};

const STORAGE_KEY = '@theme_mode';

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<ThemeMode>) {
      state.mode = action.payload;
    },
  },
});

export const { setTheme } = themeSlice.actions;

/** Persist + dispatch in one thunk */
export const toggleTheme = (current: ThemeMode) => async (dispatch: AppDispatch) => {
  const next: ThemeMode = current === 'light' ? 'dark' : 'light';
  dispatch(setTheme(next));
  await AsyncStorage.setItem(STORAGE_KEY, next);
};

/** Call once on app boot to restore saved preference */
export const loadSavedTheme = () => async (dispatch: AppDispatch) => {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      dispatch(setTheme(saved));
    }
  } catch {}
};

export default themeSlice.reducer;
