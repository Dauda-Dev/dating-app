import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, Image, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateProfile, getMe } from '../../store/slices/authSlice';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, HOBBIES_OPTIONS, INTERESTS_OPTIONS, useTheme } from '../../constants';
import { apiClient } from '../../services/apiClient';

const MAX_HOT_TAKES = 5;
const MAX_HOT_TAKE_LEN = 120;

const EDUCATION_OPTIONS: { label: string; value: string }[] = [
  { label: 'High School', value: 'high_school' },
  { label: 'Some College', value: 'some_college' },
  { label: "Bachelor's", value: 'bachelors' },
  { label: "Master's", value: 'masters' },
  { label: 'PhD', value: 'phd' },
];

export const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const C = useTheme();
  const profile = user?.profile;

  const [photos, setPhotos] = useState<string[]>(profile?.photos || []);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to upload pictures.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploadingPhoto(true);
      try {
        const res = await apiClient.uploadGalleryPhoto(result.assets[0].uri);
        setPhotos(res.photos || [...photos, res.photoUrl]);
      } catch (e: any) {
        Alert.alert('Upload failed', e?.response?.data?.error || 'Could not upload photo.');
      } finally {
        setUploadingPhoto(false);
      }
    }
  };

  const handleDeletePhoto = (photoUrl: string) => {
    Alert.alert('Remove photo?', 'This will permanently delete this photo.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            const res = await apiClient.deleteGalleryPhoto(photoUrl);
            setPhotos(res.photos || photos.filter(p => p !== photoUrl));
          } catch {
            Alert.alert('Error', 'Could not remove photo.');
          }
        },
      },
    ]);
  };

  const [form, setForm] = useState({
    bio: profile?.bio || '',
    location: profile?.location || '',
    occupation: profile?.occupation || '',
    education: profile?.education || '',
    relationshipGoal: profile?.relationshipGoal || '' as any,
  });
  const [hobbies, setHobbies] = useState<string[]>(profile?.hobbies || []);
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);
  const [hotTakes, setHotTakes] = useState<string[]>(
    profile?.hotTakes?.length ? profile.hotTakes : ['']
  );

  const set = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const toggleHobby = (h: string) =>
    setHobbies((p) => p.includes(h) ? p.filter((x) => x !== h) : [...p, h]);
  const toggleInterest = (i: string) =>
    setInterests((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i]);

  const updateHotTake = (idx: number, val: string) =>
    setHotTakes((prev) => prev.map((t, i) => (i === idx ? val.slice(0, MAX_HOT_TAKE_LEN) : t)));

  const addHotTake = () => {
    if (hotTakes.length < MAX_HOT_TAKES) setHotTakes((p) => [...p, '']);
  };

  const removeHotTake = (idx: number) =>
    setHotTakes((p) => p.filter((_, i) => i !== idx).length === 0 ? [''] : p.filter((_, i) => i !== idx));

  const handleSave = async () => {
    const cleanedTakes = hotTakes.map((t) => t.trim()).filter(Boolean);
    const result = await dispatch(updateProfile({ ...form, hobbies, interests, hotTakes: cleanedTakes }));
    if (updateProfile.fulfilled.match(result)) {
      dispatch(getMe());
      Alert.alert('Saved', 'Profile updated successfully');
      navigation.goBack();
    } else {
      Alert.alert('Error', result.payload as string);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: C.background }]}>
      <View style={[styles.headerBar, { backgroundColor: C.headerBg, borderBottomColor: C.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={[styles.cancel, { color: C.primary }]}>Cancel</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: C.headerText }]}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ── Photo Grid ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>Photos ({photos.length}/9)</Text>
        <Text style={[styles.photoHint, { color: C.gray }]}>First photo is shown on your profile. Tap a photo to remove it.</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, idx) => (
            <TouchableOpacity key={uri} style={styles.photoSlot} onPress={() => handleDeletePhoto(uri)}>
              <Image source={{ uri }} style={styles.photoThumb} />
              {idx === 0 && (
                <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>
              )}
              <View style={styles.photoDeleteBadge}>
                <Text style={styles.photoDeleteText}>✕</Text>
              </View>
            </TouchableOpacity>
          ))}
          {photos.length < 9 && (
            <TouchableOpacity
              style={[styles.photoSlot, styles.photoAddSlot]}
              onPress={handleAddPhoto}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <ActivityIndicator color={COLORS.primary} />
              ) : (
                <Text style={styles.photoAddText}>+</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Input label="Bio" placeholder="Tell people about yourself…" value={form.bio} onChangeText={set('bio')} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' }} />
        <Input label="Location" placeholder="City, Country" value={form.location} onChangeText={set('location')} />
        <Input label="Occupation" placeholder="What do you do?" value={form.occupation} onChangeText={set('occupation')} />

        <Text style={styles.sectionLabel}>Education</Text>
        <View style={styles.chips}>
          {EDUCATION_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.chip, form.education === opt.value && styles.chipSel]}
              onPress={() => set('education')(form.education === opt.value ? '' : opt.value)}
            >
              <Text style={[styles.chipText, form.education === opt.value && styles.chipTextSel]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Relationship Goal</Text>
        <View style={styles.chips}>
          {['casual', 'serious', 'friendship', 'unsure'].map((g) => (
            <TouchableOpacity
              key={g}
              style={[styles.chip, form.relationshipGoal === g && styles.chipSel]}
              onPress={() => set('relationshipGoal')(g)}
            >
              <Text style={[styles.chipText, form.relationshipGoal === g && styles.chipTextSel]}>
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Hot Takes ─────────────────────────────────────────────────── */}
        <View style={styles.hotTakesHeader}>
          <View>
            <Text style={styles.sectionLabel}>🔥 Hot Takes</Text>
            <Text style={styles.hotTakesHint}>
              Bold opinions shown to your match — great conversation starters! ({hotTakes.filter(Boolean).length}/{MAX_HOT_TAKES})
            </Text>
          </View>
        </View>
        {hotTakes.map((take, idx) => (
          <View key={idx} style={styles.hotTakeRow}>
            <TextInput
              style={styles.hotTakeInput}
              placeholder={`e.g. "Pineapple belongs on pizza" 🍕`}
              placeholderTextColor={COLORS.gray}
              value={take}
              onChangeText={(v) => updateHotTake(idx, v)}
              maxLength={MAX_HOT_TAKE_LEN}
              multiline={false}
              returnKeyType="done"
            />
            <View style={styles.hotTakeMeta}>
              <Text style={styles.charCount}>{take.length}/{MAX_HOT_TAKE_LEN}</Text>
              <TouchableOpacity onPress={() => removeHotTake(idx)} style={styles.removeBtn}>
                <Text style={styles.removeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
        {hotTakes.length < MAX_HOT_TAKES && (
          <TouchableOpacity style={styles.addHotTakeBtn} onPress={addHotTake}>
            <Text style={styles.addHotTakeBtnText}>+ Add Hot Take</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Hobbies</Text>
        <View style={styles.chips}>
          {HOBBIES_OPTIONS.map((h) => (
            <TouchableOpacity key={h} style={[styles.chip, hobbies.includes(h) && styles.chipSel]} onPress={() => toggleHobby(h)}>
              <Text style={[styles.chipText, hobbies.includes(h) && styles.chipTextSel]}>{h}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Interests</Text>
        <View style={styles.chips}>
          {INTERESTS_OPTIONS.map((i) => (
            <TouchableOpacity key={i} style={[styles.chip, interests.includes(i) && styles.chipSel]} onPress={() => toggleInterest(i)}>
              <Text style={[styles.chipText, interests.includes(i) && styles.chipTextSel]}>{i}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button title="Save Changes" onPress={handleSave} loading={isLoading} style={styles.saveBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  cancel: { color: COLORS.primary, fontSize: 16, width: 60 },
  title: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  content: { padding: 20, paddingBottom: 48 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: COLORS.darkGray, marginBottom: 10, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: COLORS.lightGray, backgroundColor: '#fff',
  },
  chipSel: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.darkGray },
  chipTextSel: { color: '#fff', fontWeight: '600' },
  saveBtn: { marginTop: 16 },
  photoHint: { fontSize: 12, color: COLORS.gray, marginBottom: 10, marginTop: -6 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  photoSlot: { width: '31%', aspectRatio: 3 / 4, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%' },
  photoAddSlot: {
    backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.primary, borderStyle: 'dashed',
  },
  photoAddText: { fontSize: 32, color: COLORS.primary, fontWeight: '300' },
  photoDeleteBadge: {
    position: 'absolute', top: 6, right: 6,
    width: 22, height: 22, borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center',
  },
  photoDeleteText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  mainBadge: {
    position: 'absolute', bottom: 6, left: 6,
    backgroundColor: COLORS.primary, borderRadius: 6,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  // Hot takes
  hotTakesHeader: { marginBottom: 4 },
  hotTakesHint: { fontSize: 12, color: COLORS.gray, marginBottom: 10 },
  hotTakeRow: {
    backgroundColor: '#fff', borderRadius: 12, marginBottom: 10,
    borderWidth: 1.5, borderColor: COLORS.lightGray,
    overflow: 'hidden',
  },
  hotTakeInput: {
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6,
    fontSize: 14, color: COLORS.black,
  },
  hotTakeMeta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingBottom: 8,
  },
  charCount: { fontSize: 11, color: COLORS.gray },
  removeBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  removeBtnText: { fontSize: 11, color: COLORS.darkGray, fontWeight: '700' },
  addHotTakeBtn: {
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, borderStyle: 'dashed',
    paddingVertical: 12, alignItems: 'center', marginBottom: 16,
  },
  addHotTakeBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 14 },
});
