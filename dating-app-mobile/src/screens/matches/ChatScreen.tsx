import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Image, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loadMessages,
  receiveMessage,
  clearUnread,
  markMessagesRead,
  removeMatchChat,
} from '../../store/slices/chatSlice';
import { unmatchMatch } from '../../store/slices/matchSlice';
import { socketClient } from '../../services/socketClient';
import { COLORS } from '../../constants';
import { MainStackParamList } from '../../navigation/MainNavigator';
import { ChatMessage, Match, User } from '../../types';

type Props = NativeStackScreenProps<MainStackParamList, 'Chat'>;

const TYPING_TIMEOUT_MS = 3000;

export const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { matchId } = route.params;
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  const { user } = useAppSelector((s) => s.auth);
  const { matches } = useAppSelector((s) => s.matches);
  const messageState = useAppSelector((s) => s.chat);

  const messages: ChatMessage[] = messageState.messagesByMatch[matchId] ?? [];
  const isLoading = messageState.loadingByMatch[matchId] ?? false;
  const hasMore = messageState.hasMoreByMatch[matchId] ?? true;

  // Derive partner from match list
  const match: Match | undefined = matches.find((m: Match) => m.id === matchId);
  const partner: User | undefined = match
    ? (match.user1Id === user?.id ? match.User2 : match.User1)
    : undefined;

  const [inputText, setInputText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Socket setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const setupSocket = async () => {
      await socketClient.connect();

      socketClient.on('new_message', (msg: ChatMessage) => {
        if (msg.matchId === matchId && mounted) {
          dispatch(receiveMessage(msg));
          // Auto mark read since screen is open
          socketClient.markRead(matchId);
          dispatch(clearUnread(matchId));
        }
      });

      socketClient.on('user_typing', ({ matchId: mid, userId, isTyping }: any) => {
        if (mid === matchId && userId !== user?.id && mounted) {
          setPartnerTyping(isTyping);
          if (isTyping) {
            // Auto-clear typing indicator after timeout
            setTimeout(() => { if (mounted) setPartnerTyping(false); }, TYPING_TIMEOUT_MS + 500);
          }
        }
      });

      socketClient.on('messages_read', ({ matchId: mid, readAt }: any) => {
        if (mid === matchId && mounted) {
          dispatch(markMessagesRead({ matchId, readAt }));
        }
      });

      socketClient.on('match_ended', ({ matchId: mid }: any) => {
        if (mid === matchId && mounted) {
          dispatch(removeMatchChat(matchId));
          Alert.alert('Connection Ended', 'This match has been closed.', [
            { text: 'OK', onPress: () => navigation.goBack() },
          ]);
        }
      });

      socketClient.joinRoom(matchId);
      setSocketReady(true);
    };

    setupSocket();

    return () => {
      mounted = false;
      socketClient.off('new_message');
      socketClient.off('user_typing');
      socketClient.off('messages_read');
      socketClient.off('match_ended');
      // Send typing=false cleanup
      if (isTypingRef.current) {
        socketClient.sendTyping(matchId, false);
        isTypingRef.current = false;
      }
    };
  }, [matchId]);

  // ── Load initial messages ─────────────────────────────────────────────────
  useEffect(() => {
    dispatch(loadMessages({ matchId }));
    dispatch(clearUnread(matchId));
  }, [matchId]);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  // ── Typing indicator ──────────────────────────────────────────────────────
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (text.length > 0 && !isTypingRef.current) {
      isTypingRef.current = true;
      socketClient.sendTyping(matchId, true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socketClient.sendTyping(matchId, false);
      }
    }, TYPING_TIMEOUT_MS);

    if (text.length === 0 && isTypingRef.current) {
      isTypingRef.current = false;
      socketClient.sendTyping(matchId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
  };

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content || !socketReady) return;

    setInputText('');
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socketClient.sendTyping(matchId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }

    socketClient.sendMessage(matchId, content);
  }, [inputText, matchId, socketReady]);

  // ── Load older messages (pagination) ─────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (isLoading || !hasMore || messages.length === 0) return;
    const oldest = messages[0]?.createdAt;
    dispatch(loadMessages({ matchId, before: oldest }));
  }, [isLoading, hasMore, messages, matchId]);

  // ── Render message bubble ─────────────────────────────────────────────────
  const renderMessage = ({ item, index }: { item: ChatMessage; index: number }) => {
    const isMine = item.senderId === user?.id;
    const prevMsg = messages[index - 1];
    const showAvatar = !isMine && (!prevMsg || prevMsg.senderId !== item.senderId);

    const time = new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={[styles.msgWrap, isMine ? styles.msgWrapRight : styles.msgWrapLeft]}>
        {!isMine && (
          <View style={styles.bubbleAvatarSlot}>
            {showAvatar && (
              partner?.profilePhoto
                ? <Image source={{ uri: partner.profilePhoto }} style={styles.bubbleAvatar} />
                : <View style={[styles.bubbleAvatar, styles.bubbleAvatarPlaceholder]}><Text>👤</Text></View>
            )}
          </View>
        )}
        <View style={styles.bubbleColumn}>
          {isMine ? (
            <LinearGradient
              colors={[COLORS.gradientStart, COLORS.gradientEnd]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={[styles.bubble, styles.bubbleMine]}
            >
              <Text style={styles.bubbleTextMine}>{item.content}</Text>
            </LinearGradient>
          ) : (
            <View style={[styles.bubble, styles.bubbleTheirs]}>
              <Text style={styles.bubbleTextTheirs}>{item.content}</Text>
            </View>
          )}
          <Text style={[styles.bubbleTime, isMine ? styles.bubbleTimeRight : styles.bubbleTimeLeft]}>
            {time}{isMine && item.readAt ? ' ✓✓' : isMine ? ' ✓' : ''}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      {/* Header */}
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          {partner?.profilePhoto
            ? <Image source={{ uri: partner.profilePhoto }} style={styles.headerAvatar} />
            : <View style={[styles.headerAvatar, styles.headerAvatarPlaceholder]}><Text>👤</Text></View>}
          <View>
            <Text style={styles.headerName}>{partner?.firstName} {partner?.lastName}</Text>
            {partnerTyping && <Text style={styles.typingLabel}>typing…</Text>}
          </View>
        </View>
        {/* Report + Unmatch buttons */}
        {partner && (
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() =>
              Alert.alert(
                'Options',
                '',
                [
                  {
                    text: 'Report',
                    onPress: () =>
                      navigation.navigate('Report', {
                        userId: partner.id,
                        userName: partner.firstName ?? 'this user',
                        matchId,
                      }),
                  },
                  {
                    text: 'Unmatch',
                    style: 'destructive',
                    onPress: () =>
                      Alert.alert(
                        'Unmatch',
                        `Are you sure you want to unmatch with ${partner.firstName ?? 'this person'}? This cannot be undone.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Unmatch',
                            style: 'destructive',
                            onPress: async () => {
                              await dispatch(unmatchMatch(matchId));
                              dispatch(removeMatchChat(matchId));
                              navigation.goBack();
                            },
                          },
                        ]
                      ),
                  },
                  { text: 'Cancel', style: 'cancel' },
                ]
              )
            }
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.reportBtnText}>⋯</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Messages list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          isLoading && hasMore
            ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
            : null
        }
        ListEmptyComponent={
          !isLoading
            ? (
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatEmoji}>💬</Text>
                <Text style={styles.emptyChatText}>Say hello!</Text>
                <Text style={styles.emptyChatHint}>This is the beginning of your conversation.</Text>
              </View>
            )
            : <ActivityIndicator color={COLORS.primary} style={{ marginTop: 60 }} />
        }
      />

      {/* Typing indicator bubble */}
      {partnerTyping && (
        <View style={styles.typingRow}>
          <View style={styles.typingBubble}>
            <Text style={styles.typingDots}>● ● ●</Text>
          </View>
        </View>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={handleInputChange}
          placeholder="Type a message…"
          placeholderTextColor="#9CA3AF"
          multiline
          maxLength={2000}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || !socketReady) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || !socketReady}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={(!inputText.trim() || !socketReady) ? ['#D1D5DB', '#D1D5DB'] : [COLORS.gradientStart, COLORS.gradientEnd]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            style={styles.sendBtnGradient}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F9FAFB' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 14,
  },
  backBtn: { marginRight: 12, padding: 4 },
  backArrow: { fontSize: 32, color: '#fff', lineHeight: 32 },
  headerInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  headerAvatarPlaceholder: { backgroundColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  headerName: { fontSize: 17, fontWeight: '700', color: '#fff' },
  typingLabel: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },

  // List
  listContent: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },

  // Message rows
  msgWrap: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-end' },
  msgWrapRight: { justifyContent: 'flex-end' },
  msgWrapLeft: { justifyContent: 'flex-start' },
  bubbleAvatarSlot: { width: 30, marginRight: 6 },
  bubbleAvatar: { width: 28, height: 28, borderRadius: 14 },
  bubbleAvatarPlaceholder: { backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  bubbleColumn: { maxWidth: '72%' },

  // Bubbles
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: '#fff', borderBottomLeftRadius: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  bubbleTextMine: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleTextTheirs: { color: '#111827', fontSize: 15, lineHeight: 21 },
  bubbleTime: { fontSize: 10, color: '#9CA3AF', marginTop: 3 },
  bubbleTimeRight: { textAlign: 'right' },
  bubbleTimeLeft: { textAlign: 'left' },

  // Typing indicator
  typingRow: { paddingHorizontal: 24, paddingBottom: 6 },
  typingBubble: {
    alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 18, borderBottomLeftRadius: 4,
    paddingHorizontal: 14, paddingVertical: 9, elevation: 1,
  },
  typingDots: { color: '#9CA3AF', letterSpacing: 3, fontSize: 12 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#F3F4F6',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8,
  },
  input: {
    flex: 1, minHeight: 42, maxHeight: 120,
    backgroundColor: '#F3F4F6', borderRadius: 21,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: '#111827',
    marginRight: 8,
  },
  sendBtn: { marginBottom: 1 },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnGradient: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
  },
  sendIcon: { color: '#fff', fontSize: 20, fontWeight: '700', lineHeight: 22 },

  // Empty state
  emptyChat: { alignItems: 'center', paddingTop: 80 },
  emptyChatEmoji: { fontSize: 56, marginBottom: 14 },
  emptyChatText: { fontSize: 20, fontWeight: '800', color: '#111827' },
  emptyChatHint: { fontSize: 14, color: '#6B7280', marginTop: 6, textAlign: 'center' },
  reportBtn: {
    padding: 6,
    marginLeft: 8,
    alignSelf: 'center',
  },
  reportBtnText: { fontSize: 22 },
});
