import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateProfile, getMe } from '../../store/slices/authSlice';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, HOBBIES_OPTIONS, INTERESTS_OPTIONS } from '../../constants';

export const ProfileEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((s) => s.auth);
  const profile = user?.profile;

  const [form, setForm] = useState({
    bio: profile?.bio || '',
    location: profile?.location || '',
    occupation: profile?.occupation || '',
    education: profile?.education || '',
    relationshipGoal: profile?.relationshipGoal || '' as any,
  });
  const [hobbies, setHobbies] = useState<string[]>(profile?.hobbies || []);
  const [interests, setInterests] = useState<string[]>(profile?.interests || []);

  const set = (field: keyof typeof form) => (val: string) =>
    setForm((f) => ({ ...f, [field]: val }));

  const toggleHobby = (h: string) =>
    setHobbies((p) => p.includes(h) ? p.filter((x) => x !== h) : [...p, h]);
  const toggleInterest = (i: string) =>
    setInterests((p) => p.includes(i) ? p.filter((x) => x !== i) : [...p, i]);

  const handleSave = async () => {
    const result = await dispatch(updateProfile({ ...form, hobbies, interests }));
    if (updateProfile.fulfilled.match(result)) {
      dispatch(getMe());
      Alert.alert('Saved', 'Profile updated successfully');
      navigation.goBack();
    } else {
      Alert.alert('Error', result.payload as string);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.cancel}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Profile</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Input label="Bio" placeholder="Tell people about yourself…" value={form.bio} onChangeText={set('bio')} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' }} />
        <Input label="Location" placeholder="City, Country" value={form.location} onChangeText={set('location')} />
        <Input label="Occupation" placeholder="What do you do?" value={form.occupation} onChangeText={set('occupation')} />
        <Input label="Education" placeholder="Highest qualification" value={form.education} onChangeText={set('education')} />

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

        <Text style={styles.sectionLabel}>Hobbies</Text>
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
});
