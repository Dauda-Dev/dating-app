import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp, useFocusEffect } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatchDetails, initializeVideoCall, proposeDate, acceptDate, rejectMatch, completeDate } from '../../store/slices/matchSlice';
import { LoadingScreen } from '../../components/common/LoadingScreen';
import { Button } from '../../components/common/Button';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'MatchDetails'>;
  route: RouteProp<MainStackParamList, 'MatchDetails'>;
};

export const MatchDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId } = route.params;
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { currentMatch, isLoading } = useAppSelector((s) => s.matches);

  const [showDateModal, setShowDateModal] = useState(false);
  const [dateForm, setDateForm] = useState({ proposedDate: '', location: '', venue: '', message: '' });
  const [isCompleting, setIsCompleting] = useState(false);
  const [partnerPhotoIndex, setPartnerPhotoIndex] = useState(0);

  useEffect(() => { dispatch(fetchMatchDetails(matchId)); }, [matchId]);

  // Re-fetch every time this screen comes back into focus (e.g. returning from VideoCallScreen)
  // so the status updates to 'video_call_completed' and the "Propose a Date" section appears.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchMatchDetails(matchId));
    }, [matchId])
  );

  if (isLoading || !currentMatch) return <LoadingScreen />;

  const partner = currentMatch.user1Id === user?.id ? currentMatch.User2 : currentMatch.User1;
  const config = MATCH_STATUS_CONFIG[currentMatch.status];
  const session = currentMatch.videoSession;
  const canStartCall = currentMatch.status === 'matched_locked';
  const callActive = session && (session.status === 'active' || session.status === 'pending');
  const canProposeDate = currentMatch.status === 'video_call_completed';

  const handleVideoCall = async () => {
    const result = await dispatch(initializeVideoCall(matchId));
    if (initializeVideoCall.fulfilled.match(result)) {
      const payload = result.payload;
      const roomUrl = payload?.session?.dailyRoomUrl || payload?.session?.roomUrl || payload?.roomUrl;
      const sessionId = payload?.session?.id || payload?.sessionId;
      if (roomUrl && sessionId) {
        navigation.navigate('VideoCall', { matchId, roomUrl, sessionId });
      } else {
        Alert.alert('Error', 'Could not get video call room URL');
      }
    } else {
      Alert.alert('Error', result.payload as string);
    }
  };

  const handleProposeDate = async () => {
    if (!dateForm.proposedDate || !dateForm.location || !dateForm.venue) {
      Alert.alert('Error', 'Please fill in date, location, and venue'); return;
    }
    const result = await dispatch(proposeDate({ matchId, data: dateForm }));
    if (proposeDate.fulfilled.match(result)) {
      setShowDateModal(false);
      Alert.alert('Success', 'Date proposed! Waiting for their response.');
    } else {
      Alert.alert('Error', result.payload as string);
    }
  };

  const handleAcceptDate = async () => {
    Alert.alert(
      'Accept Date?',
      `Meet at ${pendingDate?.venue}, ${pendingDate?.location}?`,
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Accept!',
          onPress: async () => {
            const result = await dispatch(acceptDate(matchId));
            if (acceptDate.fulfilled.match(result)) {
              Alert.alert('🎉 Date confirmed!', 'Have a great time!');
              dispatch(fetchMatchDetails(matchId));
            } else {
              Alert.alert('Error', result.payload as string);
            }
          },
        },
      ]
    );
  };

  const handleReject = () => {
    Alert.alert(
      'End Connection',
      'Are you sure you want to end this match?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: async () => {
            await dispatch(rejectMatch(matchId));
            navigation.goBack();
          },
        },
      ]
    );
  };

  const pendingDate = currentMatch.dates?.find((d) => d.status === 'pending');
  const acceptedDate = currentMatch.dates?.find((d) => d.status === 'accepted');

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Details</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Partner photo carousel */}
        {(() => {
          const partnerPhotos = [
            ...(partner?.profilePhoto ? [partner.profilePhoto] : []),
            ...((partner?.profile?.photos || []) as string[]).filter(p => p !== partner?.profilePhoto),
          ];
          const shown = partnerPhotos[partnerPhotoIndex] || null;
          return (
            <View style={styles.carouselWrap}>
              {shown ? (
                <Image source={{ uri: shown }} style={styles.carouselImage} />
              ) : (
                <View style={[styles.carouselImage, styles.carouselPlaceholder]}>
                  <Text style={{ fontSize: 64 }}>👤</Text>
                </View>
              )}
              {partnerPhotos.length > 1 && (
                <>
                  <TouchableOpacity
                    style={styles.carouselTapLeft}
                    onPress={() => setPartnerPhotoIndex(i => Math.max(0, i - 1))}
                    activeOpacity={1}
                  />
                  <TouchableOpacity
                    style={styles.carouselTapRight}
                    onPress={() => setPartnerPhotoIndex(i => Math.min(partnerPhotos.length - 1, i + 1))}
                    activeOpacity={1}
                  />
                  <View style={styles.carouselDots}>
                    {partnerPhotos.map((_, i) => (
                      <View key={i} style={[styles.carouselDot, i === partnerPhotoIndex && styles.carouselDotActive]} />
                    ))}
                  </View>
                </>
              )}
              <View style={styles.carouselNameOverlay}>
                <Text style={styles.carouselName}>{partner?.firstName} {partner?.lastName}</Text>
                {currentMatch.compatibilityScore != null && (
                  <Text style={styles.carouselCompat}>⚡ {currentMatch.compatibilityScore}% Compatible</Text>
                )}
              </View>
            </View>
          );
        })()}

        {/* Status badge */}
        <View style={{ paddingHorizontal: 20 }}>
        <View style={[styles.statusBadge, { borderColor: config?.color }]}>
          <Text style={[styles.statusText, { color: config?.color }]}>{config?.label}</Text>
        </View>

        {/* Video call section */}
        {(canStartCall || callActive) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📹 Video Call</Text>
            <Text style={styles.sectionSub}>
              {callActive ? 'Your call is ready! Join now.' : 'Start a video call to get to know each other.'}
            </Text>
            <Button
              title={callActive ? 'Join Video Call' : 'Start Video Call'}
              onPress={handleVideoCall}
              loading={isLoading}
            />
          </View>
        )}

        {/* Propose date section */}
        {canProposeDate && !pendingDate && !acceptedDate && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Propose a Date</Text>
            <Text style={styles.sectionSub}>Your video call is done — take the next step!</Text>
            <Button title="Propose Date" onPress={() => setShowDateModal(true)} />
          </View>
        )}

        {pendingDate && (
          <View style={styles.dateCard}>
            <Text style={styles.dateTitle}>📅 Date Proposed</Text>
            <Text style={styles.dateInfo}>📍 {pendingDate.venue}, {pendingDate.location}</Text>
            <Text style={styles.dateInfo}>🕐 {new Date(pendingDate.proposedDate).toLocaleString()}</Text>
            {pendingDate.message ? <Text style={styles.dateInfo}>💬 {pendingDate.message}</Text> : null}
            {pendingDate.proposedById === user?.id ? (
              <Text style={styles.dateStatus}>Waiting for their response…</Text>
            ) : (
              <Button title="Accept Date 🎉" onPress={handleAcceptDate} loading={isLoading} style={{ marginTop: 12 }} />
            )}
          </View>
        )}

        {acceptedDate && currentMatch.status === 'date_accepted' && (
          <View style={[styles.dateCard, styles.dateCardAccepted]}>
            <Text style={styles.dateTitle}>✅ Date Confirmed!</Text>
            <Text style={styles.dateInfo}>📍 {acceptedDate.venue}, {acceptedDate.location}</Text>
            <Text style={styles.dateInfo}>🕐 {new Date(acceptedDate.proposedDate).toLocaleString()}</Text>
            <Button
              title="Mark Date as Complete 🎉"
              loading={isCompleting}
              disabled={isCompleting}
              onPress={() =>
                Alert.alert(
                  'Date Completed?',
                  'Did you go on this date? This will open both of you up to new connections.',
                  [
                    { text: 'Not yet', style: 'cancel' },
                    {
                      text: 'Yes, it happened!',
                      onPress: async () => {
                        setIsCompleting(true);
                        const result = await dispatch(completeDate(matchId));
                        setIsCompleting(false);
                        if (completeDate.fulfilled.match(result)) {
                          dispatch(fetchMatchDetails(matchId));
                        } else {
                          Alert.alert('Error', result.payload as string);
                        }
                      },
                    },
                  ]
                )
              }
              style={{ marginTop: 12 }}
            />
          </View>
        )}

        {currentMatch.status === 'post_date_open' && (
          <View style={styles.postDateCard}>
            <Text style={styles.postDateTitle}>🌟 Date Complete!</Text>
            <Text style={styles.postDateText}>
              You and {partner?.firstName} have gone on your date. Both of you are now open to new connections.
            </Text>
            <Text style={styles.postDateText}>
              If someone wants to steal you, you'll see their request in the{' '}
              <Text style={styles.postDateHighlight}>Steals</Text> tab.
            </Text>
            <TouchableOpacity
              style={styles.stealBtn}
              onPress={() => navigation.navigate('Tabs' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.stealBtnText}>⚡ Steal Someone New</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Partner bio */}
        {partner?.profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Them</Text>
            <Text style={styles.bioText}>{partner.profile.bio}</Text>
          </View>
        )}

        {/* Partner's hot takes — conversation starters */}
        {(partner?.profile as any)?.hotTakes?.filter(Boolean).length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔥 Their Hot Takes</Text>
            <Text style={styles.sectionSub}>Bring these up during your video call or date!</Text>
            {(partner?.profile as any).hotTakes.filter(Boolean).map((take: string, idx: number) => (
              <View key={idx} style={styles.hotTakeItem}>
                <Text style={styles.hotTakeEmoji}>💬</Text>
                <Text style={styles.hotTakeText}>{take}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <Button title="End Connection" variant="danger" onPress={handleReject} />
        </View>
        </View>{/* end padded body */}
      </ScrollView>

      {/* Propose Date Modal */}
      <Modal visible={showDateModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Propose a Date 📅</Text>
          <TextInput
            style={styles.modalInput}
            placeholder="Date & Time (YYYY-MM-DD HH:MM)"
            value={dateForm.proposedDate}
            onChangeText={(v) => setDateForm((f) => ({ ...f, proposedDate: v }))}
            placeholderTextColor={COLORS.gray}
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Location (City)"
            value={dateForm.location}
            onChangeText={(v) => setDateForm((f) => ({ ...f, location: v }))}
            placeholderTextColor={COLORS.gray}
          />
          <TextInput
            style={styles.modalInput}
            placeholder="Venue (Restaurant, Park…)"
            value={dateForm.venue}
            onChangeText={(v) => setDateForm((f) => ({ ...f, venue: v }))}
            placeholderTextColor={COLORS.gray}
          />
          <TextInput
            style={[styles.modalInput, { height: 80 }]}
            placeholder="Optional message…"
            value={dateForm.message}
            onChangeText={(v) => setDateForm((f) => ({ ...f, message: v }))}
            multiline
            placeholderTextColor={COLORS.gray}
          />
          <View style={styles.modalActions}>
            <Button title="Cancel" variant="outline" onPress={() => setShowDateModal(false)} style={styles.modalBtn} />
            <Button title="Send Proposal" onPress={handleProposeDate} loading={isLoading} style={styles.modalBtn} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.background },
  headerBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  back: { color: COLORS.primary, fontSize: 16, width: 60 },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black },
  content: { paddingBottom: 48 },
  carouselWrap: {
    width: '100%', height: 340, position: 'relative', backgroundColor: COLORS.lightGray,
  },
  carouselImage: { width: '100%', height: '100%' },
  carouselPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  carouselTapLeft: { position: 'absolute', top: 0, left: 0, width: '40%', height: '100%' },
  carouselTapRight: { position: 'absolute', top: 0, right: 0, width: '40%', height: '100%' },
  carouselDots: {
    position: 'absolute', top: 10, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 5, paddingHorizontal: 20,
  },
  carouselDot: {
    height: 3, flex: 1, maxWidth: 40, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
  carouselDotActive: { backgroundColor: '#fff' },
  carouselNameOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  carouselName: { fontSize: 22, fontWeight: '700', color: '#fff' },
  carouselCompat: { fontSize: 13, color: '#FFD93D', marginTop: 2, fontWeight: '600' },
  statusBadgeWrap: { paddingHorizontal: 20 },
  statusBadge: {
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    alignSelf: 'center', marginBottom: 20, marginTop: 16,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: COLORS.gray, marginBottom: 14 },
  bioText: { fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },
  hotTakeItem: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#FFF8F0', borderRadius: 10,
    padding: 10, marginBottom: 8,
    borderLeftWidth: 3, borderLeftColor: '#FFA726',
  },
  hotTakeEmoji: { fontSize: 16, marginRight: 8, marginTop: 1 },
  hotTakeText: { flex: 1, fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },
  dateCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: COLORS.warning,
  },
  dateCardAccepted: { borderLeftColor: COLORS.success },
  dateTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 8 },
  dateInfo: { fontSize: 14, color: COLORS.darkGray, marginBottom: 4 },
  dateStatus: { fontSize: 13, color: COLORS.gray, marginTop: 4, fontStyle: 'italic' },
  dangerZone: { marginTop: 24 },
  postDateCard: {
    backgroundColor: '#F0FFF4', borderRadius: 16, padding: 18, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: '#34C759',
  },
  postDateTitle: { fontSize: 17, fontWeight: '700', color: '#1A7A3C', marginBottom: 8 },
  postDateText: { fontSize: 14, color: '#2D6A4F', lineHeight: 20, marginBottom: 6 },
  postDateHighlight: { fontWeight: '700', color: '#1A7A3C' },
  stealBtn: {
    marginTop: 12, backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
  },
  stealBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  modal: { flex: 1, padding: 24, paddingTop: 48, backgroundColor: '#fff' },
  modalTitle: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginBottom: 24 },
  modalInput: {
    borderWidth: 1.5, borderColor: COLORS.lightGray, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: COLORS.black, marginBottom: 14,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: { flex: 1 },
});
