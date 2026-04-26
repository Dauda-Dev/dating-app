import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Alert, ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateProfile, markOnboardingDone } from '../../store/slices/authSlice';
import { apiClient } from '../../services/apiClient';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { COLORS, HOBBIES_OPTIONS, INTERESTS_OPTIONS } from '../../constants';

const STEPS = ['Photo', 'About You', 'Hobbies', 'Interests'];

const GENDER_OPTIONS = ['Man', 'Woman', 'Non-binary', 'Other'];
const LOOKING_FOR_OPTIONS = ['Men', 'Women', 'Everyone'];

function calculateAge(dob: { day: number; month: number; year: number }): number {
  const today = new Date();
  const birthDate = new Date(dob.year, dob.month - 1, dob.day);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

export const OnboardingScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((s) => s.auth);

  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [occupation, setOccupation] = useState('');
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [gender, setGender] = useState('');
  const [lookingFor, setLookingFor] = useState('');

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Camera roll access is required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setUploading(true);
      try {
        await apiClient.uploadProfilePicture(result.assets[0].uri);
        setPhoto(result.assets[0].uri);
      } catch {
        Alert.alert('Upload failed', 'Could not upload photo. Please try again.');
      } finally {
        setUploading(false);
      }
    }
  };

  const toggleHobby = (h: string) =>
    setSelectedHobbies((prev) => prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]);

  const toggleInterest = (i: string) =>
    setSelectedInterests((prev) => prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]);

  const handleNext = () => {
    if (step === 1) {
      const day = parseInt(dobDay, 10);
      const month = parseInt(dobMonth, 10);
      const year = parseInt(dobYear, 10);
      if (!dobDay || !dobMonth || !dobYear || isNaN(day) || isNaN(month) || isNaN(year)) {
        Alert.alert('Required', 'Please enter your date of birth.');
        return;
      }
      const age = calculateAge({ day, month, year });
      if (age < 18) {
        Alert.alert('Age requirement', 'You must be 18 or older to use Ovally.');
        return;
      }
      if (!gender) {
        Alert.alert('Required', 'Please select your gender.');
        return;
      }
      if (!lookingFor) {
        Alert.alert('Required', 'Please select who you are looking for.');
        return;
      }
    }
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    const day = parseInt(dobDay, 10);
    const month = parseInt(dobMonth, 10);
    const year = parseInt(dobYear, 10);
    const dateOfBirth = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    await dispatch(updateProfile({
      bio,
      location,
      occupation,
      hobbies: selectedHobbies,
      interests: selectedInterests,
      gender: gender.toLowerCase(),
      lookingFor: lookingFor.toLowerCase(),
      dateOfBirth,
    }));
    dispatch(markOnboardingDone());
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Add your best photo 📸</Text>
            <Text style={styles.stepSub}>This will be your main profile picture</Text>
            <TouchableOpacity onPress={pickPhoto} style={styles.photoWrap}>
              {uploading ? (
                <ActivityIndicator color={COLORS.primary} size="large" />
              ) : photo ? (
                <Image source={{ uri: photo }} style={styles.photo} />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Text style={styles.photoPlaceholderText}>📷</Text>
                  <Text style={{ color: COLORS.gray, marginTop: 8 }}>Tap to select</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      case 1:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Tell us about yourself</Text>

            <Text style={styles.fieldLabel}>Date of birth (must be 18+)</Text>
            <View style={styles.dobRow}>
              <Input
                label="DD"
                placeholder="DD"
                value={dobDay}
                onChangeText={(t) => setDobDay(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                style={styles.dobInput}
              />
              <Input
                label="MM"
                placeholder="MM"
                value={dobMonth}
                onChangeText={(t) => setDobMonth(t.replace(/\D/g, '').slice(0, 2))}
                keyboardType="number-pad"
                style={styles.dobInput}
              />
              <Input
                label="YYYY"
                placeholder="YYYY"
                value={dobYear}
                onChangeText={(t) => setDobYear(t.replace(/\D/g, '').slice(0, 4))}
                keyboardType="number-pad"
                style={styles.dobYearInput}
              />
            </View>

            <Text style={styles.fieldLabel}>I am a</Text>
            <View style={styles.chips}>
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  onPress={() => setGender(g)}
                  style={[styles.chip, gender === g && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, gender === g && styles.chipTextSelected]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Interested in</Text>
            <View style={styles.chips}>
              {LOOKING_FOR_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  onPress={() => setLookingFor(opt)}
                  style={[styles.chip, lookingFor === opt && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, lookingFor === opt && styles.chipTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ marginTop: 16 }}>
              <Input label="Bio" placeholder="Write a short bio…" value={bio} onChangeText={setBio} multiline numberOfLines={4} style={{ height: 100, textAlignVertical: 'top' }} />
              <Input label="Location" placeholder="City, Country" value={location} onChangeText={setLocation} />
              <Input label="Occupation" placeholder="What do you do?" value={occupation} onChangeText={setOccupation} />
            </View>
          </View>
        );
      case 2:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>What are your hobbies?</Text>
            <Text style={styles.stepSub}>Select at least 1</Text>
            <View style={styles.chips}>
              {HOBBIES_OPTIONS.map((h) => (
                <TouchableOpacity
                  key={h}
                  onPress={() => toggleHobby(h)}
                  style={[styles.chip, selectedHobbies.includes(h) && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selectedHobbies.includes(h) && styles.chipTextSelected]}>{h}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
      case 3:
        return (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Your interests</Text>
            <Text style={styles.stepSub}>Select any that apply</Text>
            <View style={styles.chips}>
              {INTERESTS_OPTIONS.map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => toggleInterest(i)}
                  style={[styles.chip, selectedInterests.includes(i) && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selectedInterests.includes(i) && styles.chipTextSelected]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );
    }
  };

  return (
    <LinearGradient colors={[COLORS.gradientStart, COLORS.gradientEnd]} style={styles.gradient}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Welcome{user?.firstName ? `, ${user.firstName}` : ''}! 👋</Text>
        <Text style={styles.stepIndicator}>{step + 1} / {STEPS.length}</Text>
        <View style={styles.progressBar}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressSegment, i <= step && styles.progressActive]} />
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderStep()}
        </ScrollView>
        <View style={styles.navRow}>
          {step > 0 && (
            <Button title="Back" variant="outline" onPress={() => setStep((s) => s - 1)} style={styles.navBtn} />
          )}
          <View style={{ flex: 1 }} />
          {step < STEPS.length - 1 ? (
            <Button title="Next →" onPress={handleNext} style={styles.navBtn} />
          ) : (
            <Button title="Get Started 🎉" onPress={handleFinish} loading={isLoading} style={styles.navBtn} />
          )}
        </View>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: { padding: 24, paddingTop: 60 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  stepIndicator: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
  progressBar: { flexDirection: 'row', gap: 6, marginTop: 12 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  progressActive: { backgroundColor: '#fff' },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
  },
  stepContainer: { paddingBottom: 16 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginBottom: 6 },
  stepSub: { fontSize: 14, color: COLORS.gray, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: COLORS.darkGray, marginBottom: 8 },
  dobRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  dobInput: { flex: 1 },
  dobYearInput: { flex: 1.8 },
  photoWrap: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignSelf: 'center',
    marginTop: 24,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoPlaceholder: { alignItems: 'center' },
  photoPlaceholderText: { fontSize: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.darkGray },
  chipTextSelected: { color: '#fff', fontWeight: '600' },
  navRow: { flexDirection: 'row', marginTop: 16 },
  navBtn: { minWidth: 100 },
});
