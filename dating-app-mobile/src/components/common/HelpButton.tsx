import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../../constants';

interface Props {
  onPress: () => void;
  style?: ViewStyle;
}

export const HelpButton: React.FC<Props> = ({ onPress, style }) => (
  <TouchableOpacity
    style={[styles.btn, style]}
    onPress={onPress}
    activeOpacity={0.8}
    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  >
    <Text style={styles.icon}>?</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    bottom: 88,   // above the tab bar
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  icon: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 22,
    marginTop: 1,
  },
});
