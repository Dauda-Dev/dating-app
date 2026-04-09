import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  loadMessages,
  receiveMessage,
  clearUnread,
  markMessagesRead,
  removeMatchChat,
} from '../../store/slices/chatSlice';
import { socketClient } from '../../services/socketClient';
import { COLORS } from '../../constants';
import { ChatMessage, Match } from '../../types';

// ── Styled components ──────────────────────────────────────────────────────────

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px);
  max-width: 800px;
  margin: 0 auto;
  background: #F9FAFB;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 20px;
  background: linear-gradient(135deg, ${COLORS.gradientStart} 0%, #C44569 100%);
  color: #fff;
  flex-shrink: 0;
  border-radius: 0 0 0 0;
`;

const BackButton = styled.button`
  background: none;
  border: none;
  color: #fff;
  font-size: 26px;
  cursor: pointer;
  padding: 0 6px;
  line-height: 1;
  &:hover { opacity: 0.8; }
`;

const Avatar = styled.div<{ src?: string }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: ${props => props.src ? `url(${props.src}) center/cover` : 'rgba(255,255,255,0.3)'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  border: 2px solid rgba(255,255,255,0.6);
  flex-shrink: 0;
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const HeaderName = styled.div`
  font-weight: 700;
  font-size: 17px;
`;

const TypingLabel = styled.div`
  font-size: 11px;
  opacity: 0.85;
  margin-top: 2px;
`;

const MessageList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const LoadMoreSpinner = styled.div`
  text-align: center;
  padding: 10px;
  color: ${COLORS.primary};
  font-size: 13px;
`;

const EmptyChat = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #6B7280;
`;

const EmptyChatEmoji = styled.div`
  font-size: 56px;
  margin-bottom: 14px;
`;

const MsgWrap = styled.div<{ mine: boolean }>`
  display: flex;
  flex-direction: ${props => props.mine ? 'row-reverse' : 'row'};
  align-items: flex-end;
  gap: 8px;
`;

const BubbleAvatar = styled.div<{ src?: string }>`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${props => props.src ? `url(${props.src}) center/cover` : '#E5E7EB'};
  flex-shrink: 0;
  align-self: flex-end;
`;

const BubbleCol = styled.div<{ mine: boolean }>`
  max-width: 65%;
  display: flex;
  flex-direction: column;
  align-items: ${props => props.mine ? 'flex-end' : 'flex-start'};
`;

const Bubble = styled.div<{ mine: boolean }>`
  padding: 10px 14px;
  border-radius: 18px;
  border-bottom-right-radius: ${props => props.mine ? '4px' : '18px'};
  border-bottom-left-radius: ${props => props.mine ? '18px' : '4px'};
  font-size: 15px;
  line-height: 1.5;
  ${props => props.mine
    ? `background: linear-gradient(135deg, ${COLORS.gradientStart} 0%, #C44569 100%); color: #fff;`
    : `background: #fff; color: #111827; box-shadow: 0 1px 4px rgba(0,0,0,0.06);`
  }
`;

const BubbleTime = styled.div`
  font-size: 10px;
  color: #9CA3AF;
  margin-top: 3px;
`;

const dotBounce = keyframes`
  0%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-6px); }
`;

const TypingRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 0 20px 8px;
`;

const TypingBubble = styled.div`
  background: #fff;
  border-radius: 18px;
  border-bottom-left-radius: 4px;
  padding: 10px 14px;
  display: flex;
  gap: 4px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
`;

const Dot = styled.span<{ delay: string }>`
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9CA3AF;
  display: inline-block;
  animation: ${dotBounce} 1.2s ease-in-out infinite;
  animation-delay: ${props => props.delay};
`;

const InputBar = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding: 12px 16px 16px;
  background: #fff;
  border-top: 1px solid #F3F4F6;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.04);
  flex-shrink: 0;
`;

const Input = styled.textarea`
  flex: 1;
  min-height: 42px;
  max-height: 120px;
  background: #F3F4F6;
  border: none;
  border-radius: 21px;
  padding: 10px 16px;
  font-size: 15px;
  color: #111827;
  resize: none;
  outline: none;
  font-family: inherit;
  &::placeholder { color: #9CA3AF; }
`;

const SendBtn = styled.button<{ disabled: boolean }>`
  width: 42px;
  height: 42px;
  border-radius: 50%;
  border: none;
  background: ${props => props.disabled
    ? '#D1D5DB'
    : `linear-gradient(135deg, ${COLORS.gradientStart} 0%, #C44569 100%)`};
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: ${props => props.disabled ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: opacity 0.15s;
  &:hover { opacity: ${props => props.disabled ? 1 : 0.9}; }
`;

// ── Component ──────────────────────────────────────────────────────────────────

const TYPING_TIMEOUT_MS = 3000;

const ChatScreen: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const { user } = useAppSelector(s => s.auth);
  const { matches } = useAppSelector(s => s.match);
  const chatState = useAppSelector(s => s.chat) as import('../../types').ChatState;

  const messages: ChatMessage[] = matchId ? (chatState.messagesByMatch[matchId] ?? []) : [];
  const isLoading = matchId ? (chatState.loadingByMatch[matchId] ?? false) : false;
  const hasMore = matchId ? (chatState.hasMoreByMatch[matchId] ?? true) : false;

  const match: Match | undefined = matches.find((m: Match) => m.id === matchId);
  const partner = match ? (match.user1Id === user?.id ? match.User2 : match.User1) : undefined;

  const [inputText, setInputText] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [socketReady, setSocketReady] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTypingRef = useRef(false);

  // ── Socket setup ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;
    let mounted = true;

    try {
      socketClient.connect();

      socketClient.on('new_message', (msg: ChatMessage) => {
        if (msg.matchId === matchId && mounted) {
          dispatch(receiveMessage(msg));
          socketClient.markRead(matchId);
          dispatch(clearUnread(matchId));
        }
      });

      socketClient.on('user_typing', ({ matchId: mid, userId, isTyping }: any) => {
        if (mid === matchId && userId !== user?.id && mounted) {
          setPartnerTyping(isTyping);
          if (isTyping) {
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
          alert('This match has been closed.');
          navigate('/matches');
        }
      });

      socketClient.joinRoom(matchId);
      setSocketReady(true);
    } catch (err) {
      console.error('Socket connect failed:', err);
    }

    return () => {
      mounted = false;
      socketClient.off('new_message');
      socketClient.off('user_typing');
      socketClient.off('messages_read');
      socketClient.off('match_ended');
      if (isTypingRef.current) {
        socketClient.sendTyping(matchId, false);
        isTypingRef.current = false;
      }
    };
  }, [matchId]);

  // ── Load initial messages ───────────────────────────────────────────────────
  useEffect(() => {
    if (!matchId) return;
    dispatch(loadMessages({ matchId }));
    dispatch(clearUnread(matchId));
  }, [matchId]);

  // ── Auto-scroll to bottom ───────────────────────────────────────────────────
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  // ── Typing indicator ────────────────────────────────────────────────────────
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (!matchId) return;

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Send message ────────────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const content = inputText.trim();
    if (!content || !socketReady || !matchId) return;

    setInputText('');
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socketClient.sendTyping(matchId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
    socketClient.sendMessage(matchId, content);
  }, [inputText, matchId, socketReady]);

  // ── Load older messages ─────────────────────────────────────────────────────
  const handleScroll = () => {
    if (!listRef.current || isLoading || !hasMore || messages.length === 0 || !matchId) return;
    if (listRef.current.scrollTop === 0) {
      const oldest = messages[0]?.createdAt;
      dispatch(loadMessages({ matchId, before: oldest }));
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!matchId) return null;

  return (
    <Screen>
      {/* Header */}
      <Header>
        <BackButton onClick={() => navigate('/matches')}>‹</BackButton>
        {partner?.profilePhoto
          ? <Avatar src={partner.profilePhoto} />
          : <Avatar>👤</Avatar>}
        <HeaderInfo>
          <HeaderName>{partner?.firstName} {partner?.lastName}</HeaderName>
          {partnerTyping && <TypingLabel>typing…</TypingLabel>}
        </HeaderInfo>
      </Header>

      {/* Message list */}
      <MessageList ref={listRef} onScroll={handleScroll}>
        {isLoading && hasMore && <LoadMoreSpinner>Loading earlier messages…</LoadMoreSpinner>}

        {messages.length === 0 && !isLoading ? (
          <EmptyChat>
            <EmptyChatEmoji>💬</EmptyChatEmoji>
            <div style={{ fontWeight: 700, fontSize: 20, color: '#111827' }}>Say hello!</div>
            <div style={{ marginTop: 6, fontSize: 14 }}>This is the beginning of your conversation.</div>
          </EmptyChat>
        ) : (
          messages.map((msg, index) => {
            const isMine = msg.senderId === user?.id;
            const prevMsg = messages[index - 1];
            const showAvatar = !isMine && (!prevMsg || prevMsg.senderId !== msg.senderId);
            const time = formatTime(msg.createdAt);

            return (
              <MsgWrap key={msg.id} mine={isMine}>
                {!isMine && (
                  showAvatar
                    ? <BubbleAvatar src={partner?.profilePhoto} />
                    : <div style={{ width: 28, flexShrink: 0 }} />
                )}
                <BubbleCol mine={isMine}>
                  <Bubble mine={isMine}>{msg.content}</Bubble>
                  <BubbleTime>
                    {time}{isMine && msg.readAt ? ' ✓✓' : isMine ? ' ✓' : ''}
                  </BubbleTime>
                </BubbleCol>
              </MsgWrap>
            );
          })
        )}
      </MessageList>

      {/* Typing indicator */}
      {partnerTyping && (
        <TypingRow>
          <BubbleAvatar src={partner?.profilePhoto} />
          <TypingBubble>
            <Dot delay="0s" />
            <Dot delay="0.2s" />
            <Dot delay="0.4s" />
          </TypingBubble>
        </TypingRow>
      )}

      {/* Input bar */}
      <InputBar>
        <Input
          value={inputText}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message… (Enter to send)"
          maxLength={2000}
          rows={1}
        />
        <SendBtn disabled={!inputText.trim() || !socketReady} onClick={handleSend}>
          ↑
        </SendBtn>
      </InputBar>
    </Screen>
  );
};

export default ChatScreen;
