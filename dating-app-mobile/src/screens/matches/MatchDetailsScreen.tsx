import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TouchableOpacity, Alert, Modal, TextInput,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatchDetails, initializeVideoCall, proposeDate, rejectMatch } from '../../store/slices/matchSlice';
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

  useEffect(() => { dispatch(fetchMatchDetails(matchId)); }, [matchId]);

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
        {/* Partner info */}
        <View style={styles.partnerCard}>
          {partner?.profilePhoto ? (
            <Image source={{ uri: partner.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={{ fontSize: 48 }}>👤</Text>
            </View>
          )}
          <Text style={styles.partnerName}>{partner?.firstName} {partner?.lastName}</Text>
          {currentMatch.compatibilityScore != null && (
            <Text style={styles.compat}>⚡ {currentMatch.compatibilityScore}% Compatible</Text>
          )}
        </View>

        {/* Status badge */}
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
            <Text style={styles.dateTitle}>📅 Date Pending</Text>
            <Text style={styles.dateInfo}>📍 {pendingDate.venue}, {pendingDate.location}</Text>
            <Text style={styles.dateInfo}>🕐 {new Date(pendingDate.proposedDate).toLocaleString()}</Text>
            {pendingDate.message ? <Text style={styles.dateInfo}>💬 {pendingDate.message}</Text> : null}
            <Text style={styles.dateStatus}>Waiting for their response…</Text>
          </View>
        )}

        {acceptedDate && (
          <View style={[styles.dateCard, styles.dateCardAccepted]}>
            <Text style={styles.dateTitle}>✅ Date Confirmed!</Text>
            <Text style={styles.dateInfo}>📍 {acceptedDate.venue}, {acceptedDate.location}</Text>
            <Text style={styles.dateInfo}>🕐 {new Date(acceptedDate.proposedDate).toLocaleString()}</Text>
          </View>
        )}

        {/* Partner profile */}
        {partner?.profile?.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About Them</Text>
            <Text style={styles.bioText}>{partner.profile.bio}</Text>
          </View>
        )}

        {/* Danger zone */}
        <View style={styles.dangerZone}>
          <Button title="End Connection" variant="danger" onPress={handleReject} />
        </View>
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
  content: { padding: 20, paddingBottom: 48 },
  partnerCard: { alignItems: 'center', marginBottom: 16 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: {
    backgroundColor: COLORS.lightGray, alignItems: 'center', justifyContent: 'center',
  },
  partnerName: { fontSize: 22, fontWeight: '700', color: COLORS.black, marginTop: 12 },
  compat: { fontSize: 14, color: COLORS.secondary, marginTop: 4 },
  statusBadge: {
    borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6,
    alignSelf: 'center', marginBottom: 20,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  section: {
    backgroundColor: '#fff', borderRadius: 16, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.black, marginBottom: 4 },
  sectionSub: { fontSize: 13, color: COLORS.gray, marginBottom: 14 },
  bioText: { fontSize: 14, color: COLORS.darkGray, lineHeight: 20 },
  dateCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
    borderLeftWidth: 4, borderLeftColor: COLORS.warning,
  },
  dateCardAccepted: { borderLeftColor: COLORS.success },
  dateTitle: { fontSize: 16, fontWeight: '700', color: COLORS.black, marginBottom: 8 },
  dateInfo: { fontSize: 14, color: COLORS.darkGray, marginBottom: 4 },
  dateStatus: { fontSize: 13, color: COLORS.gray, marginTop: 4, fontStyle: 'italic' },
  dangerZone: { marginTop: 24 },
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
