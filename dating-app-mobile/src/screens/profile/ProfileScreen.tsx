import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMe, logoutUser } from '../../store/slices/authSlice';
import { COLORS, useTheme } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { PhotoViewerModal } from '../../components/common/PhotoViewerModal';

type Nav = NativeStackNavigationProp<MainStackParamList>;

const { width: W } = Dimensions.get('window');
const HERO_HEIGHT = W * 1.1; // tall portrait card like Tinder

export const ProfileScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<Nav>();
  const { user } = useAppSelector((s) => s.auth);
  const C = useTheme();
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState(0);

  // Only refresh from server if we don't already have user data
  useEffect(() => { if (!user) dispatch(getMe()); }, [dispatch]);

  const openViewer = (idx: number) => {
    setViewerIndex(idx);
    setViewerOpen(true);
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => dispatch(logoutUser()) },
    ]);
  };

  if (!user) return null;

  const profile = user.profile;
  const allPhotos: string[] = profile?.photos?.length
    ? profile.photos
    : user.profilePhoto
    ? [user.profilePhoto]
    : [];

  return (
    <ScrollView style={[styles.screen, { backgroundColor: C.background }]} contentContainerStyle={styles.content}>
      {/* ── Hero Photo Card (Tinder-style swipeable) ──────────────── */}
      <View style={[styles.heroCard, { backgroundColor: C.surfaceAlt }]}>
        {allPhotos.length > 0 ? (
          <View style={styles.heroTouch}>
            <Image source={{ uri: allPhotos[heroPhotoIndex] }} style={styles.heroImage} />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.72)']}
              style={styles.heroGradient}
            />

            {/* Tinder top progress bars */}
            {allPhotos.length > 1 && (
              <View style={styles.heroBars}>
                {allPhotos.map((_, idx) => (
                  <View key={idx} style={styles.heroBarTrack}>
                    <View style={[
                      styles.heroBarFill,
                      idx <= heroPhotoIndex && styles.heroBarFillActive,
                    ]} />
                  </View>
                ))}
              </View>
            )}

            {/* Tap zones: left = prev, right = next, center = open viewer */}
            <View style={styles.heroTapZones} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.heroTapLeft}
                activeOpacity={1}
                onPress={() => setHeroPhotoIndex(i => Math.max(0, i - 1))}
              />
              <TouchableOpacity
                style={styles.heroTapCenter}
                activeOpacity={0.85}
                onPress={() => openViewer(heroPhotoIndex)}
              />
              <TouchableOpacity
                style={styles.heroTapRight}
                activeOpacity={1}
                onPress={() => setHeroPhotoIndex(i => Math.min(allPhotos.length - 1, i + 1))}
              />
            </View>

            {/* Name / info overlay */}
            <View style={styles.heroInfo} pointerEvents="none">
              <Text style={styles.heroName}>
                {user.firstName} {user.lastName}
              </Text>
              {user.subscriptionTier && user.subscriptionTier !== 'free' && (
                <View style={styles.heroBadge}>
                  <Ionicons
                    name={user.subscriptionTier === 'gold' ? 'star' : 'star-outline'}
                    size={12}
                    color="#fff"
                  />
                  <Text style={styles.heroBadgeText}>
                    {user.subscriptionTier === 'gold' ? ' Gold' : ' Premium'}
                  </Text>
                </View>
              )}
              <Text style={styles.heroPhotoCount}>
                {heroPhotoIndex + 1} / {allPhotos.length}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.heroEmpty}
            onPress={() => navigation.navigate('ProfileEdit')}
          >
            <Ionicons name="camera" size={56} color={COLORS.gray} />
            <Text style={styles.heroEmptyText}>No photos yet</Text>
            <Text style={styles.heroEmptySubtext}>Tap to add photos</Text>
          </TouchableOpacity>
        )}

        {/* Edit photos button — overlaid top-right */}
        <TouchableOpacity
          style={styles.editPhotosBtn}
          onPress={() => navigation.navigate('ProfileEdit')}
        >
          <Ionicons name="pencil" size={13} color="#fff" />
          <Text style={styles.editPhotosBtnText}> Edit</Text>
        </TouchableOpacity>
      </View>

      {/* ── Photo Grid ──────────────────────────────────────────────── */}
      {allPhotos.length > 0 && (
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>All Photos</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProfileEdit')}>
              <Text style={styles.cardTitleAction}>Manage →</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.photoGrid}>
            {allPhotos.map((uri, idx) => (
              <TouchableOpacity
                key={uri + idx}
                style={styles.photoSlot}
                onPress={() => openViewer(idx)}
                activeOpacity={0.82}
              >
                <Image source={{ uri }} style={styles.photoThumb} />
                {idx === 0 && (
                  <View style={styles.mainBadge}><Text style={styles.mainBadgeText}>Main</Text></View>
                )}
                <View style={styles.photoOverlay}>
                  <Ionicons name="expand-outline" size={20} color="rgba(255,255,255,0)" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Email + tier strip */}
      <View style={styles.identityStrip}>
        <Text style={[styles.emailText, { color: C.gray }]}>{user.email}</Text>
        {user.subscriptionTier && (
          <View style={styles.tierBadge}>
            <Ionicons
              name={
                user.subscriptionTier === 'gold' ? 'star' :
                user.subscriptionTier === 'premium' ? 'star-outline' : 'person-outline'
              }
              size={12}
              color={COLORS.warning}
            />
            <Text style={styles.tierText}>
              {' '}{user.subscriptionTier === 'gold' ? 'Gold' : user.subscriptionTier === 'premium' ? 'Premium' : 'Free'}
            </Text>
          </View>
        )}
      </View>

      {/* Bio */}
      {profile?.bio ? (
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.black }]}>About Me</Text>
          <Text style={styles.bioText}>{profile.bio}</Text>
        </View>
      ) : null}

      {/* Details */}
      <View style={[styles.card, { backgroundColor: C.card }]}>
        <Text style={[styles.cardTitle, { color: C.black }]}>Details</Text>
        {profile?.occupation ? <InfoRow iconName="briefcase-outline" label="Occupation" value={profile.occupation} /> : null}
        {profile?.education ? <InfoRow iconName="school-outline" label="Education" value={profile.education} /> : null}
        {profile?.relationshipGoal ? <InfoRow iconName="heart-outline" label="Goal" value={profile.relationshipGoal} /> : null}
      </View>

      {/* Hobbies */}
      {profile?.hobbies?.length ? (
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.black }]}>Hobbies</Text>
          <View style={styles.chips}>
            {profile.hobbies.map((h) => (
              <View key={h} style={styles.chip}><Text style={styles.chipText}>{h}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Interests */}
      {profile?.interests?.length ? (
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <Text style={[styles.cardTitle, { color: C.black }]}>Interests</Text>
          <View style={styles.chips}>
            {profile.interests.map((i) => (
              <View key={i} style={[styles.chip, styles.chipInterest]}><Text style={styles.chipText}>{i}</Text></View>
            ))}
          </View>
        </View>
      ) : null}

      {/* Hot Takes */}
      {profile?.hotTakes?.filter(Boolean).length ? (
        <View style={[styles.card, { backgroundColor: C.card }]}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="flame" size={16} color="#FFA726" style={{ marginRight: 6 }} />
            <Text style={[styles.cardTitle, { color: C.black }]}>My Hot Takes</Text>
          </View>
          <Text style={styles.hotTakesSubtitle}>These are shared with your match as conversation starters</Text>
          {profile.hotTakes.filter(Boolean).map((take, idx) => (
            <View key={idx} style={styles.hotTakeItem}>
              <Ionicons name="chatbubble-outline" size={16} color="#FFA726" style={styles.hotTakeIcon} />
              <Text style={styles.hotTakeText}>{take}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.card }]} onPress={() => navigation.navigate('ProfileEdit')}>
          <Ionicons name="create-outline" size={20} color={COLORS.primary} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: C.black }]}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={18} color={C.lightGray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: C.card }]} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color={COLORS.gray} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: C.black }]}>Settings</Text>
          <Ionicons name="chevron-forward" size={18} color={C.lightGray} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, styles.logoutBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={styles.actionIcon} />
          <Text style={[styles.actionText, { color: C.danger }]}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Full-screen photo viewer */}
      <PhotoViewerModal
        photos={allPhotos}
        initialIndex={viewerIndex}
        visible={viewerOpen}
        onClose={() => setViewerOpen(false)}
        userName={`${user.firstName} ${user.lastName}`}
        onEditPress={() => {
          setViewerOpen(false);
          navigation.navigate('ProfileEdit');
        }}
      />
    </ScrollView>
  );
};

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
const InfoRow = ({ iconName, label, value }: { iconName: IoniconName; label: string; value: string }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={iconName} size={18} color={COLORS.gray} />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  content: { paddingBottom: 60 },

  // ── Hero card ──────────────────────────────────────────────────────
  heroCard: {
    marginHorizontal: 16,
    marginTop: 56,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  heroTouch: { width: '100%', aspectRatio: 0.9 },
  heroImage: { width: '100%', height: '100%' },
  heroGradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '50%',
  },
  heroBars: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 4,
  },
  heroBarTrack: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    overflow: 'hidden',
  },
  heroBarFill: {
    flex: 1,
    height: 3,
    backgroundColor: 'transparent',
  },
  heroBarFillActive: {
    backgroundColor: '#fff',
  },
  heroTapZones: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row',
  },
  heroTapLeft:   { flex: 1 },
  heroTapCenter: { flex: 2 },
  heroTapRight:  { flex: 1 },
  heroInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    gap: 5,
  },
  heroName: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,107,157,0.85)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  heroBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  heroPhotoCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
  heroEmpty: {
    aspectRatio: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  heroEmptyText: { fontSize: 18, fontWeight: '700', color: COLORS.darkGray },
  heroEmptySubtext: { fontSize: 13, color: COLORS.gray },
  editPhotosBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.52)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editPhotosBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

  // ── Identity strip ─────────────────────────────────────────────────
  identityStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 4,
  },
  emailText: { fontSize: 13, color: COLORS.gray },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  tierText: { fontSize: 12, fontWeight: '600', color: COLORS.warning },

  // ── Cards ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.black },
  cardTitleAction: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  bioText: { fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },

  // ── Photo grid (inside card) ────────────────────────────────────────
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  photoSlot: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: COLORS.lightGray,
  },
  photoThumb: { width: '100%', height: '100%' },
  mainBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mainBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoOverlayIcon: { fontSize: 0 }, // invisible until pressed (handled by opacity)

  // ── Details ────────────────────────────────────────────────────────
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  infoIconWrap: { width: 32, alignItems: 'center', marginRight: 8 },
  infoLabel: { fontSize: 11, color: COLORS.gray },
  infoValue: { fontSize: 14, color: COLORS.darkGray, fontWeight: '500' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORS.lightGray, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 5 },
  chipInterest: { backgroundColor: '#EDE7F6' },
  chipText: { fontSize: 12, color: COLORS.darkGray },
  hotTakesSubtitle: { fontSize: 12, color: COLORS.gray, marginBottom: 12 },
  hotTakeItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF8F0', borderRadius: 10,
    padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#FFA726',
  },
  hotTakeIcon: { marginRight: 8, marginTop: 1 },
  hotTakeText: { flex: 1, fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },

  // ── Actions ────────────────────────────────────────────────────────
  actions: { margin: 16, marginTop: 20 },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logoutBtn: { borderWidth: 1, borderColor: COLORS.lightGray },
  actionIcon: { marginRight: 14 },
  actionText: { flex: 1, fontSize: 15, color: COLORS.black, fontWeight: '500' },
});
