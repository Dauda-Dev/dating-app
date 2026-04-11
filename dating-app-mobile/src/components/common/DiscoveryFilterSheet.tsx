import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '../../constants/theme';
import { DiscoveryFilters } from '../../types';

interface Props {
  visible: boolean;
  initialFilters: DiscoveryFilters;
  onClose: () => void;
  onApply: (filters: DiscoveryFilters) => void;
}

export const DiscoveryFilterSheet: React.FC<Props> = ({
  visible,
  initialFilters,
  onClose,
  onApply,
}) => {
  const colors = useTheme();

  const [maxDistance, setMaxDistance] = useState(initialFilters.maxDistance);
  const [ageMin, setAgeMin] = useState(initialFilters.ageMin);
  const [ageMax, setAgeMax] = useState(initialFilters.ageMax);
  const [showGlobal, setShowGlobal] = useState(initialFilters.showGlobal);

  // Sync local state when sheet opens with fresh filters
  useEffect(() => {
    if (visible) {
      setMaxDistance(initialFilters.maxDistance);
      setAgeMin(initialFilters.ageMin);
      setAgeMax(initialFilters.ageMax);
      setShowGlobal(initialFilters.showGlobal);
    }
  }, [visible, initialFilters]);

  const handleApply = () => {
    onApply({ maxDistance, ageMin, ageMax, showGlobal });
  };

  const handleAgeMinChange = (value: number) => {
    const rounded = Math.round(value);
    setAgeMin(Math.min(rounded, ageMax - 1));
  };

  const handleAgeMaxChange = (value: number) => {
    const rounded = Math.round(value);
    setAgeMax(Math.max(rounded, ageMin + 1));
  };

  const styles = makeStyles(colors);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle={colors.isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerCancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Discovery</Text>
          <View style={{ width: 52 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* ── Distance Section ──────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Maximum Distance</Text>
              <Text style={styles.sectionValue}>
                {showGlobal ? 'Worldwide' : `${maxDistance} km`}
              </Text>
            </View>

            <Slider
              style={styles.slider}
              minimumValue={2}
              maximumValue={160}
              step={1}
              value={maxDistance}
              onValueChange={(v) => setMaxDistance(Math.round(v))}
              minimumTrackTintColor="#FF6B9D"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#FF6B9D"
              disabled={showGlobal}
            />

            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>2 km</Text>
              <Text style={styles.sliderLabel}>160 km</Text>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Show global profiles</Text>
              <Switch
                value={showGlobal}
                onValueChange={setShowGlobal}
                trackColor={{ false: colors.border, true: '#FF6B9D' }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text style={styles.toggleHint}>
              {showGlobal
                ? 'Showing people from everywhere'
                : 'Showing people within your distance'}
            </Text>
          </View>

          <View style={styles.divider} />

          {/* ── Age Range Section ─────────────────────────────────────── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Age Range</Text>
              <Text style={styles.sectionValue}>{ageMin} – {ageMax}</Text>
            </View>

            {/* Min age slider */}
            <Text style={styles.subLabel}>Minimum age: {ageMin}</Text>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={80}
              step={1}
              value={ageMin}
              onValueChange={handleAgeMinChange}
              minimumTrackTintColor="#FF6B9D"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#FF6B9D"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>18</Text>
              <Text style={styles.sliderLabel}>80</Text>
            </View>

            {/* Max age slider */}
            <Text style={[styles.subLabel, { marginTop: 12 }]}>Maximum age: {ageMax}</Text>
            <Slider
              style={styles.slider}
              minimumValue={18}
              maximumValue={80}
              step={1}
              value={ageMax}
              onValueChange={handleAgeMaxChange}
              minimumTrackTintColor="#FF6B9D"
              maximumTrackTintColor={colors.border}
              thumbTintColor="#FF6B9D"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>18</Text>
              <Text style={styles.sliderLabel}>80</Text>
            </View>
          </View>

        </ScrollView>

        {/* ── Apply CTA ─────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply} activeOpacity={0.85}>
            <Text style={styles.applyText}>Show People</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const makeStyles = (colors: ReturnType<typeof useTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    headerCancel: {
      fontSize: 16,
      color: colors.darkGray,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.black,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    section: {
      paddingHorizontal: 20,
      paddingVertical: 20,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.black,
    },
    sectionValue: {
      fontSize: 16,
      fontWeight: '700',
      color: '#FF6B9D',
    },
    slider: {
      width: '100%',
      height: 40,
    },
    sliderLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: -6,
    },
    sliderLabel: {
      fontSize: 12,
      color: colors.darkGray,
    },
    subLabel: {
      fontSize: 13,
      color: colors.darkGray,
      marginBottom: 2,
    },
    toggleRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 16,
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.black,
    },
    toggleHint: {
      fontSize: 12,
      color: colors.darkGray,
      marginTop: 6,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: 20,
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 20,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    applyButton: {
      backgroundColor: '#FF6B9D',
      borderRadius: 50,
      paddingVertical: 16,
      alignItems: 'center',
    },
    applyText: {
      fontSize: 17,
      fontWeight: '700',
      color: '#FFFFFF',
    },
  });

export default DiscoveryFilterSheet;
