import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMe, logoutUser } from '../../store/slices/authSlice';
import { apiClient } from '../../services/apiClient';
import { COLORS } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Nav = NativeStackNavigationProp<MainStackParamList>;

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const [uploading, setUploading] = useState(false);

  useEffect(() => { dispatch(getMe()); }, []);

  const handlePhotoChange = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed'); return; }
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
        dispatch(getMe());
      } catch {
        Alert.alert('Upload failed', 'Could not upload photo.');
      } finally {
        setUploading(false);
      }
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  if (!user) return null;

  const profile = user.profile;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handlePhotoChange} disabled={uploading} style={styles.photoWrap}>
          {user.profilePhoto ? (
            <Image source={{ uri: user.profilePhoto }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={{ fontSize: 48 }}>👤</Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Text style={styles.editBadgeText}>{uploading ? '⏳' : '📷'}</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.name}>{user.firstName} {user.lastName}</Text>
        <Text style={styles.email}>{user.email}</Text>
        {user.subscriptionTier && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>
              {user.subscriptionTier === 'gold' ? '🥇 Gold' : user.subscriptionTier === 'premium' ? '⭐ Premium' : '🆓 Free'}
            </Text>
          </View>
        )}
      </View>

      {/* Photo Gallery */}
      {profile?.photos?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Photos</Text>
          <View style={styles.photoGrid}>
            {profile.photos.map((uri, idx) => (
              <View key={uri} style={styles.photoSlot}>
                <Image source={{ uri }} style={styles.photoThumb} />
                {idx === 0 && (
                  <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>
                )}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Bio */}
      {profile?.bio ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>About Me</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      {/* Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Details</Text>
        {profile?.location ? <InfoRow icon="📍" label="Location" value={profile.location} /> : null}
        {profile?.occupation ? <InfoRow icon="💼" label="Occupation" value={profile.occupation} /> : null}
        {profile?.education ? <InfoRow icon="🎓" label="Education" value={profile.education} /> : null}
        {profile?.relationshipGoal ? <InfoRow icon="💘" label="Goal" value={profile.relationshipGoal} /> : null}
      </View>

      {/* Hobbies */}
      {profile?.hobbies?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hobbies</Text>
          <View style={styles.chips}>
            {profile.hobbies.map((h) => (
              <View key={h} style={styles.chip}><Text style={styles.chipText}>{h}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Interests */}
      {profile?.interests?.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Interests</Text>
          <View style={styles.chips}>
            {profile.interests.map((i) => (
              <View key={i} style={[styles.chip, styles.chipInterest]}><Text style={styles.chipText}>{i}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Hot Takes */}
      {profile?.hotTakes?.filter(Boolean).length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔥 My Hot Takes</Text>
          <Text style={styles.hotTakesSubtitle}>These are shared with your match as conversation starters</Text>
          {profile.hotTakes.filter(Boolean).map((take, idx) => (
            <View key={idx} style={styles.hotTakeItem}>
              <Text style={styles.hotTakeEmoji}>💬</Text>
              <Text style={styles.hotTakeText}>{take}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('ProfileEdit')}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={styles.actionText}>Edit Profile</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.actionIcon}>⚙️</Text>
          <Text style={styles.actionText}>Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn]} onPress={handleLogout}>
          <Text style={styles.actionIcon}>🚪</Text>
          <Text style={[styles.actionText, { color: COLORS.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoIcon}>{icon}</Text>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 48 },
  header: { alignItems: 'center', paddingTop: 56, paddingBottom: 24, backgroundColor: '#fff' },
  photoWrap: { position: 'relative', marginBottom: 12 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  editBadgeText: { fontSize: 14 },
  name: { fontSize: 22, fontWeight: '700', color: COLORS.black },
  email: { fontSize: 13, color: COLORS.gray, marginTop: 2 },
  tierBadge: {
    marginTop: 8, backgroundColor: '#FFF3E0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  tierText: { fontSize: 13, fontWeight: '600', color: COLORS.warning },
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginHorizontal: 16,
    marginTop: 12, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black, marginBottom: 12 },
  bioText: { fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIcon: { fontSize: 20, marginRight: 12 },
  infoLabel: { fontSize: 11, color: COLORS.gray },
  infoValue: { fontSize: 14, color: COLORS.darkGray, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: COLORS.lightGray, borderRadius: 14,
    paddingHorizontal: 12, paddingVertical: 5,
  },
  chipInterest: { backgroundColor: '#EDE7F6' },
  chipText: { fontSize: 12, color: COLORS.darkGray },
  hotTakesSubtitle: { fontSize: 12, color: COLORS.gray, marginBottom: 12 },
  hotTakeItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF8F0', borderRadius: 10,
    padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#FFA726',
  },
  hotTakeEmoji: { fontSize: 16, marginRight: 8, marginTop: 1 },
  hotTakeText: { flex: 1, fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: { width: '31%', aspectRatio: 3 / 4, borderRadius: 10, overflow: 'hidden', position: 'relative' },
  photoThumb: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute', bottom: 5, left: 5,
    backgroundColor: COLORS.primary, borderRadius: 5,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  mainBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  actions: { margin: 16, marginTop: 20 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
  },
  logoutBtn: { borderWidth: 1, borderColor: COLORS.lightGray },
  actionIcon: { fontSize: 20, marginRight: 14 },
  actionText: { fontSize: 15, color: COLORS.black, fontWeight: '500' },
});
