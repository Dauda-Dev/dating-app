import React, { createContext, useContext } from 'react';

// ─── Brand / status colours (same in both themes) ─────────────────────────────
const BRAND = {
  primary: '#FF6B9D',
  secondary: '#4ECDC4',
  accent: '#FFD93D',
  success: '#6BCF7F',
  danger: '#FF5252',
  warning: '#FFA726',
  gradientStart: '#FF6B9D',
  gradientEnd: '#C44569',
  online: '#6BCF7F',
  offline: '#9E9E9E',
  away: '#FFA726',
};

// ─── Light palette ─────────────────────────────────────────────────────────────
export const LIGHT_COLORS = {
  ...BRAND,
  // surfaces
  background: '#F8F9FA',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F0F5',
  card: '#FFFFFF',
  // text
  black: '#1A1A1A',
  darkGray: '#4A4A4A',
  gray: '#9E9E9E',
  // borders / dividers
  lightGray: '#E0E0E0',
  border: '#E8E8E8',
  // keep legacy names
  white: '#FFFFFF',
  // status bar / header
  headerBg: '#FFFFFF',
  headerText: '#1A1A1A',
  tabBarBg: '#FFFFFF',
  inputBg: '#F5F5F5',
  inputText: '#1A1A1A',
  placeholderText: '#BDBDBD',
  isDark: false as const,
};

// ─── Dark palette ──────────────────────────────────────────────────────────────
export const DARK_COLORS = {
  ...BRAND,
  // surfaces
  background: '#0F0F12',
  surface: '#1C1C22',
  surfaceAlt: '#252530',
  card: '#1C1C22',
  // text
  black: '#F0F0F0',
  darkGray: '#C0C0C0',
  gray: '#7A7A8A',
  // borders / dividers
  lightGray: '#2E2E3A',
  border: '#2E2E3A',
  // keep legacy names
  white: '#FFFFFF',
  // status bar / header
  headerBg: '#1C1C22',
  headerText: '#F0F0F0',
  tabBarBg: '#1C1C22',
  inputBg: '#252530',
  inputText: '#F0F0F0',
  placeholderText: '#555566',
  isDark: true as const,
};

export type AppColors = typeof LIGHT_COLORS;

// ─── Legacy static export (for screens not yet theme-aware) ───────────────────
// Points to LIGHT_COLORS so existing imports keep compiling.
export const COLORS = LIGHT_COLORS;

// ─── Context ───────────────────────────────────────────────────────────────────
export const ThemeContext = createContext<AppColors>(LIGHT_COLORS);

export const useTheme = (): AppColors => useContext(ThemeContext);
