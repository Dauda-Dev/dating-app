import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useAppDispatch } from '../../store/hooks';
import { completeVideoSession } from '../../store/slices/matchSlice';
import { COLORS, VIDEO_CONFIG } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';

type Props = {
  navigation: NativeStackNavigationProp<MainStackParamList, 'VideoCall'>;
  route: RouteProp<MainStackParamList, 'VideoCall'>;
};

export const VideoCallScreen: React.FC<Props> = ({ navigation, route }) => {
  const { matchId, roomUrl, sessionId } = route.params;
  const dispatch = useAppDispatch();

  const callRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const [callState, setCallState] = useState<'connecting' | 'joined' | 'ended'>('connecting');
  const [participants, setParticipants] = useState<Record<string, any>>({});
  const [elapsed, setElapsed] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [DailyMediaView, setDailyMediaView] = useState<any>(null);

  const endCall = useCallback(
    async (completed = false) => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callRef.current) {
        try { await callRef.current.leave(); } catch (_) {}
        try { await callRef.current.destroy(); } catch (_) {}
        callRef.current = null;
      }
      if (completed) {
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const result = await dispatch(completeVideoSession({ sessionId, durationSeconds: duration }));
        if (completeVideoSession.rejected.match(result)) {
          // Session too short or API error — inform the user but still go back
          Alert.alert(
            'Call Not Counted',
            (result.payload as string) || 'The call was too short to count. You need at least 2 minutes.',
          );
        }
      }
      navigation.goBack();
    },
    [dispatch, navigation, sessionId]
  );

  useEffect(() => {
    let DailyIframe: any;
    let DailyMediaViewModule: any;

    try {
      const Daily = require('@daily-co/react-native-daily-js');
      DailyIframe = Daily.default;
      DailyMediaViewModule = Daily.DailyMediaView;
      setDailyMediaView(() => DailyMediaViewModule);
    } catch {
      Alert.alert('Not supported', 'Video calls require a device build (not Expo Go).');
      navigation.goBack();
      return;
    }

    if (!DailyIframe) {
      Alert.alert('Not supported', 'Video calls require a device build (not Expo Go).');
      navigation.goBack();
      return;
    }

    let call: any;

    const requestPermissions = async (): Promise<boolean> => {
      try {
        if (Platform.OS === 'android') {
          const { PermissionsAndroid } = require('react-native');
          const grants = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
          const cameraOk = grants[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
          const micOk = grants[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
          if (!cameraOk || !micOk) {
            Alert.alert(
              'Permissions Required',
              'Camera and microphone access are required for video calls. Please grant them in Settings.',
            );
            return false;
          }
        }
        return true;
      } catch {
        return true; // proceed optimistically
      }
    };

    const init = async () => {
      const hasPermissions = await requestPermissions();
      if (!hasPermissions) {
        navigation.goBack();
        return;
      }

      try {
        call = DailyIframe.createCallObject();
        callRef.current = call;

        call.on('joined-meeting', () => {
          setCallState('joined');
          startTimeRef.current = Date.now();
          // Snapshot participants immediately so local video renders
          setParticipants({ ...call.participants() });
          timerRef.current = setInterval(() => {
            setElapsed((e) => e + 1);
          }, 1000);
        });

        call.on('participant-joined', () => {
          setParticipants({ ...call.participants() });
        });

        call.on('participant-updated', () => {
          setParticipants({ ...call.participants() });
        });

        call.on('participant-left', () => {
          setParticipants({ ...call.participants() });
        });

        call.on('left-meeting', () => {
          setCallState('ended');
        });

        call.on('error', (e: any) => {
          Alert.alert('Call Error', e?.error?.msg || 'An error occurred');
          endCall(false);
        });

        // Explicitly start with camera AND audio enabled
        await call.join({
          url: roomUrl,
          startVideoOff: false,
          startAudioOff: false,
        });
      } catch (err: any) {
        Alert.alert('Error', 'Failed to join video call');
        navigation.goBack();
      }
    };

    init();

    // Min duration warning
    const warningTimer = setTimeout(() => {
      const dur = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (dur < VIDEO_CONFIG.MIN_DURATION) {
        const remaining = VIDEO_CONFIG.MIN_DURATION - dur;
        const remainingLabel = remaining < 60
          ? `${remaining}s`
          : `${Math.floor(remaining / 60)}m ${remaining % 60}s`;
        Alert.alert(
          '⏰ Keep talking',
          `You need at least ${Math.floor(VIDEO_CONFIG.MIN_DURATION / 60)} minutes for the call to count. Only ${remainingLabel} left!`
        );
      }
    }, (VIDEO_CONFIG.MIN_DURATION - VIDEO_CONFIG.WARNING_TIME) * 1000);

    return () => {
      clearTimeout(warningTimer);
      endCall(false);
    };
  }, []);

  const handleLeave = () => {
    const dur = elapsed;
    const met = dur >= VIDEO_CONFIG.MIN_DURATION;
    Alert.alert(
      'End Call',
      met
        ? 'Great conversation! End the call and unlock the next step?'
        : `Only ${dur < 60 ? `${dur}s` : `${Math.floor(dur / 60)}m ${dur % 60}s`} elapsed. You need at least ${Math.floor(VIDEO_CONFIG.MIN_DURATION / 60)} minutes to complete the session.`,
      [
        { text: 'Keep Talking', style: 'cancel' },
        { text: met ? 'Complete & Continue' : 'Leave Anyway', onPress: () => endCall(met) },
      ]
    );
  };

  const toggleMute = async () => {
    if (!callRef.current) return;
    if (isMuted) {
      await callRef.current.setLocalAudio(true);
    } else {
      await callRef.current.setLocalAudio(false);
    }
    setIsMuted(!isMuted);
  };

  const toggleCamera = async () => {
    if (!callRef.current) return;
    if (isCamOff) {
      await callRef.current.setLocalVideo(true);
    } else {
      await callRef.current.setLocalVideo(false);
    }
    setIsCamOff(!isCamOff);
  };

  const formatTime = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const remoteParticipants = Object.values(participants).filter((p: any) => !p.local);

  return (
    <View style={styles.screen}>
      {/* Remote video */}
      <View style={styles.remoteContainer}>
        {callState === 'connecting' ? (
          <View style={styles.connecting}>
            <Text style={styles.connectingEmoji}>📹</Text>
            <Text style={styles.connectingText}>Connecting…</Text>
          </View>
        ) : remoteParticipants.length > 0 && DailyMediaView ? (
          <DailyMediaView
            sessionId={remoteParticipants[0].session_id}
            videoTrackState={remoteParticipants[0].tracks?.video}
            audioTrackState={remoteParticipants[0].tracks?.audio}
            style={styles.remoteVideo}
          />
        ) : (
          <View style={styles.waiting}>
            <Text style={styles.waitingEmoji}>⏳</Text>
            <Text style={styles.waitingText}>Waiting for partner…</Text>
          </View>
        )}
      </View>

      {/* Local video (picture-in-picture) */}
      {callState === 'joined' && DailyMediaView && participants?.local && (
        <View style={styles.localContainer}>
          <DailyMediaView
            sessionId={participants.local.session_id}
            videoTrackState={participants.local.tracks?.video}
            audioTrackState={participants.local.tracks?.audio}
            mirror
            style={styles.localVideo}
          />
        </View>
      )}

      {/* Timer */}
      {callState === 'joined' && (
        <View style={styles.timerBadge}>
          <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
          {elapsed < VIDEO_CONFIG.MIN_DURATION && (
            <Text style={styles.timerHint}>
              {formatTime(VIDEO_CONFIG.MIN_DURATION - elapsed)} until complete
            </Text>
          )}
        </View>
      )}

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity style={[styles.controlBtn, isMuted && styles.controlBtnOff]} onPress={toggleMute}>
          <Text style={styles.controlIcon}>{isMuted ? '🔇' : '🎤'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.endCallBtn} onPress={handleLeave}>
          <Text style={styles.endCallIcon}>📵</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.controlBtn, isCamOff && styles.controlBtnOff]} onPress={toggleCamera}>
          <Text style={styles.controlIcon}>{isCamOff ? '📷' : '📸'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0a0a0a' },
  remoteContainer: { flex: 1 },
  remoteVideo: { flex: 1 },
  connecting: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
  },
  connectingEmoji: { fontSize: 64, marginBottom: 16 },
  connectingText: { color: '#fff', fontSize: 18 },
  waiting: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  waitingEmoji: { fontSize: 64, marginBottom: 16 },
  waitingText: { color: '#fff', fontSize: 18 },
  localContainer: {
    position: 'absolute',
    top: 56,
    right: 16,
    width: 100,
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
  },
  localVideo: { width: '100%', height: '100%' },
  timerBadge: {
    position: 'absolute',
    top: 56,
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignItems: 'center',
  },
  timerText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  timerHint: { color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    paddingBottom: 48,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  controlBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  controlBtnOff: { backgroundColor: 'rgba(255,80,80,0.5)' },
  controlIcon: { fontSize: 24 },
  endCallBtn: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#F44336',
    alignItems: 'center', justifyContent: 'center',
  },
  endCallIcon: { fontSize: 32 },
});
