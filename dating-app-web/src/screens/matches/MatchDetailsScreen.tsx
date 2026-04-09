import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMatchDetails,
  initializeVideoCall,
  joinVideoCall,
  rejectMatch,
  proposeDate,
} from '../../store/slices/matchSlice';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';

// ─── Styled Components ──────────────────────────────────────────────────────

const Container = styled.div`
  max-width: 700px;
  margin: 0 auto;
  padding-bottom: 60px;
`;

const BackBtn = styled.button`
  background: none;
  border: none;
  font-size: 16px;
  color: ${COLORS.gray};
  cursor: pointer;
  padding: 0;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 6px;
  &:hover { color: ${COLORS.black}; }
`;

const PartnerHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 32px;
`;

const PartnerPhoto = styled.div<{ url?: string }>`
  width: 100px;
  height: 100px;
  border-radius: 50%;
  flex-shrink: 0;
  background: ${p => p.url
    ? `url(${p.url}) center/cover`
    : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42px;
`;

const PartnerInfo = styled.div`
  flex: 1;
`;

const PartnerName = styled.h1`
  font-size: 28px;
  font-weight: 700;
  color: ${COLORS.black};
  margin: 0 0 8px;
`;

const StatusBadge = styled.div<{ color: string }>`
  display: inline-block;
  padding: 6px 14px;
  background: ${p => p.color}20;
  color: ${p => p.color};
  border-radius: 20px;
  font-size: 13px;
  font-weight: 700;
`;

const StepList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  margin-bottom: 32px;
`;

const Step = styled.div<{ active: boolean; done: boolean }>`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 24px;
  border-radius: 16px;
  border: 2px solid ${p => p.active ? COLORS.primary : p.done ? COLORS.success : COLORS.lightGray};
  background: ${p => p.active ? `${COLORS.primary}08` : p.done ? `${COLORS.success}08` : COLORS.white};
  opacity: ${p => !p.active && !p.done ? 0.5 : 1};
`;

const StepIcon = styled.div<{ done: boolean; active: boolean }>`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${p => p.done ? COLORS.success : p.active ? COLORS.primary : COLORS.lightGray};
  color: ${COLORS.white};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
`;

const StepContent = styled.div`
  flex: 1;
`;

const StepTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 2px;
`;

const StepDesc = styled.div`
  font-size: 13px;
  color: ${COLORS.gray};
`;

const ActionArea = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const DangerArea = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid ${COLORS.lightGray};
`;

const DangerTitle = styled.p`
  font-size: 13px;
  color: ${COLORS.gray};
  margin-bottom: 12px;
  text-align: center;
`;

// Date proposal modal
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const Modal = styled.div`
  background: ${COLORS.white};
  border-radius: 20px;
  padding: 32px;
  width: 100%;
  max-width: 500px;
`;

const ModalTitle = styled.h2`
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 20px;
`;

const Label = styled.label`
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: ${COLORS.darkGray};
  margin-bottom: 6px;
`;

const FieldInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  font-size: 15px;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 10px;
  box-sizing: border-box;
  margin-bottom: 14px;
  font-family: inherit;
  &:focus { outline: none; border-color: ${COLORS.primary}; }
`;

const ModalActions = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 8px;
`;

// ─── Component ───────────────────────────────────────────────────────────────

const MatchDetailsScreen: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { currentMatch, isLoading } = useAppSelector(s => s.match);
  const { user } = useAppSelector(s => s.auth);

  const [actionLoading, setActionLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateForm, setDateForm] = useState({
    proposedDate: '',
    location: '',
    venue: '',
    message: '',
  });

  useEffect(() => {
    if (matchId) dispatch(fetchMatchDetails(matchId));
  }, [dispatch, matchId]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const match = currentMatch as any;

  const getPartner = () => {
    if (!match) return null;
    return match.user1Id === user?.id ? match.User2 : match.User1;
  };

  const partner = getPartner();
  const status: string = match?.status || '';

  const statusCfg = MATCH_STATUS_CONFIG[status] || {
    label: status,
    color: COLORS.gray,
    action: '',
  };

  // Steps and their completion state
  const steps: { key: string; icon: string; title: string; desc: string; done: boolean; active: boolean }[] = [
    {
      key: 'matched',
      icon: '💘',
      title: 'Matched!',
      desc: 'You and this person mutually liked each other.',
      done: true, // always true if we're on this screen
      active: false,
    },
    {
      key: 'video',
      icon: '📹',
      title: 'Video Call',
      desc: 'Have a video call to decide if you want to meet in person.',
      done: ['video_call_completed', 'date_accepted', 'post_date_open'].includes(status),
      active: status === 'matched_locked',
    },
    {
      key: 'agree',
      icon: '🤝',
      title: 'Agree to Meet',
      desc: 'After the call, propose a real-life date.',
      done: ['date_accepted', 'post_date_open'].includes(status),
      active: status === 'video_call_completed',
    },
    {
      key: 'date',
      icon: '📅',
      title: 'Go on a Date',
      desc: 'Your date is confirmed — enjoy it!',
      done: status === 'post_date_open',
      active: status === 'date_accepted',
    },
  ];

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleStartVideoCall = async () => {
    if (!matchId) return;
    setActionLoading(true);
    try {
      const result = await dispatch(initializeVideoCall(matchId)).unwrap();
      const { sessionId, roomUrl, token } = result || {};
      if (sessionId && roomUrl) {
        navigate(`/video/${sessionId}`, { state: { roomUrl, token, matchId } });
      } else {
        alert('Could not start video call — missing session data from server.');
      }
    } catch (err: any) {
      alert(err || 'Failed to start video call');
    } finally {
      setActionLoading(false);
    }
  };

  // User B joins a call that their partner already started
  const handleJoinVideoCall = async () => {
    if (!matchId) return;
    setActionLoading(true);
    try {
      // /initialize is now idempotent — returns existing session with User B's token
      const result = await dispatch(joinVideoCall(matchId)).unwrap();
      const { sessionId, roomUrl, token } = result || {};
      if (sessionId && roomUrl) {
        navigate(`/video/${sessionId}`, { state: { roomUrl, token, matchId } });
      } else {
        alert('Could not join video call — missing session data.');
      }
    } catch (err: any) {
      alert(err || 'Failed to join video call');
    } finally {
      setActionLoading(false);
    }
  };

  // True when partner has already initialised a session that is still open
  const hasPendingSession = !!(
    (match as any)?.videoSessions?.some((s: any) => ['pending', 'active'].includes(s.status)) ||
    (match as any)?.videoSession?.status === 'pending' ||
    (match as any)?.videoSession?.status === 'active'
  );

  const handleProposeDate = async () => {
    if (!matchId || !dateForm.proposedDate || !dateForm.location || !dateForm.venue) {
      alert('Please fill in all required fields.');
      return;
    }
    setActionLoading(true);
    try {
      await dispatch(proposeDate({
        matchId,
        data: {
          proposedDate: dateForm.proposedDate,
          location: dateForm.location,
          venue: dateForm.venue,
          message: dateForm.message,
        }
      })).unwrap();
      setShowDateModal(false);
      // Re-fetch to get updated status
      dispatch(fetchMatchDetails(matchId));
      alert('Date proposal sent!');
    } catch (err: any) {
      alert(err || 'Failed to send date proposal');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBreakMatch = async () => {
    if (!matchId) return;
    if (!window.confirm("Are you sure you want to break this match? Both of you will be set back to available.")) return;
    setActionLoading(true);
    try {
      await dispatch(rejectMatch(matchId)).unwrap();
      navigate('/matches', { replace: true });
    } catch (err: any) {
      alert(err || 'Failed to break match');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading && !match) {
    return (
      <Container>
        <p style={{ color: COLORS.gray, textAlign: 'center', marginTop: 60 }}>Loading match…</p>
      </Container>
    );
  }

  if (!match) {
    return (
      <Container>
        <BackBtn onClick={() => navigate('/matches')}>← Back to Matches</BackBtn>
        <Card><p style={{ textAlign: 'center', color: COLORS.gray }}>Match not found.</p></Card>
      </Container>
    );
  }

  const isBroken = status === 'broken';

  return (
    <Container>
      <BackBtn onClick={() => navigate('/matches')}>← Back to Matches</BackBtn>

      {/* Partner header */}
      <PartnerHeader>
        <PartnerPhoto url={partner?.profilePhoto}>
          {!partner?.profilePhoto && '💕'}
        </PartnerPhoto>
        <PartnerInfo>
          <PartnerName>
            {partner ? `${partner.firstName} ${partner.lastName}` : 'Your Match'}
          </PartnerName>
          <StatusBadge color={statusCfg.color}>{statusCfg.label}</StatusBadge>
          {partner?.profile?.bio && (
            <p style={{ fontSize: 14, color: COLORS.gray, marginTop: 8 }}>{partner.profile.bio}</p>
          )}
        </PartnerInfo>
      </PartnerHeader>

      {/* Journey steps */}
      <StepList>
        {steps.map(step => (
          <Step key={step.key} active={!!step.active} done={!!step.done}>
            <StepIcon active={!!step.active} done={!!step.done}>
              {step.done ? '✓' : step.icon}
            </StepIcon>
            <StepContent>
              <StepTitle>{step.title}</StepTitle>
              <StepDesc>{step.desc}</StepDesc>
            </StepContent>
          </Step>
        ))}
      </StepList>

      {/* Action area */}
      {!isBroken && (
        <Card padding="28px">
          <ActionArea>
            {/* Step 1 → Start / Join video call */}
            {status === 'matched_locked' && (
              <>
                <p style={{ fontSize: 15, color: COLORS.darkGray, margin: '0 0 12px' }}>
                  🔒 This match is locked. Have a video call first to decide if you want to meet in person.
                </p>
                {hasPendingSession ? (
                  <>
                    <p style={{ fontSize: 13, color: COLORS.success, marginBottom: 8 }}>
                      📞 Your partner has started a call — join them!
                    </p>
                    <Button fullWidth size="large" onClick={handleJoinVideoCall} disabled={actionLoading}>
                      {actionLoading ? 'Joining…' : '📹 Join Video Call'}
                    </Button>
                  </>
                ) : (
                  <Button fullWidth size="large" onClick={handleStartVideoCall} disabled={actionLoading}>
                    {actionLoading ? 'Starting…' : '📹 Start Video Call'}
                  </Button>
                )}
              </>
            )}

            {/* Chat — unlocks after video call */}
            {['video_call_completed', 'date_accepted', 'post_date_open'].includes(status) && (
              <>
                <p style={{ fontSize: 15, color: COLORS.darkGray, margin: '0 0 4px' }}>
                  💬 Chat with your match!
                </p>
                <Button fullWidth size="large" onClick={() => navigate(`/chat/${matchId}`)} disabled={actionLoading}>
                  💬 Open Chat
                </Button>
              </>
            )}

            {/* Step 2 → Propose date after video call */}
            {status === 'video_call_completed' && (
              <>
                <p style={{ fontSize: 15, color: COLORS.darkGray, margin: '0 0 4px' }}>
                  ✅ Video call done! If you both want to meet, propose a date.
                </p>
                <Button fullWidth size="large" onClick={() => setShowDateModal(true)} disabled={actionLoading}>
                  📅 Propose a Date
                </Button>
              </>
            )}

            {/* Step 3 → Date accepted, waiting */}
            {status === 'date_accepted' && (
              <p style={{ fontSize: 15, color: COLORS.darkGray, textAlign: 'center' }}>
                🎉 Date accepted! Your date is confirmed. Enjoy it!
              </p>
            )}

            {/* Post date — open status */}
            {status === 'post_date_open' && (
              <p style={{ fontSize: 15, color: COLORS.darkGray, textAlign: 'center' }}>
                🌟 You went on your date! Your relationship status is now open.
              </p>
            )}
          </ActionArea>

          {/* Break match — available at any stage */}
          <DangerArea>
            <DangerTitle>Not feeling it?</DangerTitle>
            <Button
              variant="outline"
              fullWidth
              onClick={handleBreakMatch}
              disabled={actionLoading}
            >
              💔 Break Match
            </Button>
          </DangerArea>
        </Card>
      )}

      {isBroken && (
        <Card padding="28px">
          <p style={{ textAlign: 'center', color: COLORS.gray, fontSize: 15 }}>
            This match was broken. Both users are now available again.
          </p>
          <Button fullWidth onClick={() => navigate('/discovery')} style={{ marginTop: 16 }}>
            Back to Discovery
          </Button>
        </Card>
      )}

      {/* Date proposal modal */}
      {showDateModal && (
        <Overlay onClick={() => setShowDateModal(false)}>
          <Modal onClick={e => e.stopPropagation()}>
            <ModalTitle>📅 Propose a Date</ModalTitle>

            <Label>Date & Time *</Label>
            <FieldInput
              type="datetime-local"
              value={dateForm.proposedDate}
              onChange={e => setDateForm(f => ({ ...f, proposedDate: e.target.value }))}
              min={new Date().toISOString().slice(0, 16)}
            />

            <Label>Location *</Label>
            <FieldInput
              placeholder="City or neighbourhood"
              value={dateForm.location}
              onChange={e => setDateForm(f => ({ ...f, location: e.target.value }))}
            />

            <Label>Venue *</Label>
            <FieldInput
              placeholder="e.g. Coffee shop, park, restaurant"
              value={dateForm.venue}
              onChange={e => setDateForm(f => ({ ...f, venue: e.target.value }))}
            />

            <Label>Message (optional)</Label>
            <FieldInput
              placeholder="Add a personal note…"
              value={dateForm.message}
              onChange={e => setDateForm(f => ({ ...f, message: e.target.value }))}
            />

            <ModalActions>
              <Button variant="outline" fullWidth onClick={() => setShowDateModal(false)}>
                Cancel
              </Button>
              <Button fullWidth onClick={handleProposeDate} disabled={actionLoading}>
                {actionLoading ? 'Sending…' : 'Send Proposal'}
              </Button>
            </ModalActions>
          </Modal>
        </Overlay>
      )}
    </Container>
  );
};

export default MatchDetailsScreen;
