import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch } from '../../store/hooks';
import { completeVideoSession, fetchMatchDetails } from '../../store/slices/matchSlice';
import Button from '../../components/common/Button';
import { COLORS, VIDEO_CONFIG } from '../../constants';

// ─── Styled Components ───────────────────────────────────────────────────────

const Page = styled.div`
  min-height: 100vh;
  background: ${COLORS.black};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const CallWrapper = styled.div`
  width: 100%;
  max-width: 1100px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: ${COLORS.white};
  padding: 0 4px;
`;

const CallTitle = styled.span`
  font-size: 18px;
  font-weight: 700;
`;

const MinLabel = styled.span`
  font-size: 13px;
  color: ${COLORS.gray};
`;

const IframeWrap = styled.div`
  width: 100%;
  height: 560px;
  border-radius: 16px;
  overflow: hidden;
  background: #111;
  position: relative;
`;

const Connecting = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${COLORS.white};
  gap: 16px;
  font-size: 18px;
  pointer-events: none;
  z-index: 2;
  background: rgba(0,0,0,0.65);
  backdrop-filter: blur(2px);
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top-color: ${COLORS.primary};
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
  @keyframes spin { to { transform: rotate(360deg); } }
`;

const BottomBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
`;

const TimerBadge = styled.div<{ warning: boolean }>`
  font-size: 22px;
  font-weight: 700;
  color: ${p => p.warning ? COLORS.danger : COLORS.white};
  background: rgba(255,255,255,0.1);
  padding: 10px 24px;
  border-radius: 12px;
  min-width: 110px;
  text-align: center;
`;

const MinProgress = styled.div`
  width: 200px;
`;

const ProgressLabel = styled.div`
  font-size: 12px;
  color: ${COLORS.gray};
  margin-bottom: 6px;
  text-align: center;
`;

const ProgressTrack = styled.div`
  height: 6px;
  background: rgba(255,255,255,0.15);
  border-radius: 3px;
  overflow: hidden;
`;

const ProgressFill = styled.div<{ pct: number; done: boolean }>`
  height: 100%;
  width: ${p => p.pct}%;
  background: ${p => p.done ? COLORS.success : COLORS.primary};
  border-radius: 3px;
  transition: width 1s linear;
`;

const ErrorBox = styled.div`
  background: #1a1a1a;
  border: 1px solid ${COLORS.danger};
  border-radius: 12px;
  padding: 32px;
  text-align: center;
  color: ${COLORS.white};
  max-width: 500px;
`;

// ─── Component ───────────────────────────────────────────────────────────────

interface LocationState {
  roomUrl?: string;
  token?: string;
  matchId?: string;
}

const VideoCallScreen: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const state = (location.state as LocationState) || {};
  const { roomUrl, token, matchId } = state;

  const [callStatus, setCallStatus] = useState<'connecting' | 'active' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [duration, setDuration] = useState(0);
  const [ending, setEnding] = useState(false);

  const iframeWrapRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const minSecs = VIDEO_CONFIG.MIN_DURATION; // 240s
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  // ── End call (also called from inside-iframe leave event) ─────────────────
  const handleEndCall = useCallback(async (fromIframe = false, wasError = false) => {
    if (ending || !sessionId) return;

    if (!fromIframe && duration < minSecs) {
      const remaining = minSecs - duration;
      alert(
        `Please stay on the call for at least ${Math.floor(minSecs / 60)} minutes.\n` +
        `${Math.ceil(remaining / 60)} minute(s) remaining.`
      );
      return;
    }

    if (!fromIframe && !window.confirm('End the call now?')) return;

    setEnding(true);
    if (timerRef.current) clearInterval(timerRef.current);
    if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);

    try {
      if (callFrameRef.current) {
        try { await callFrameRef.current.leave(); } catch (_) {}
        callFrameRef.current.destroy().catch(() => {});
        callFrameRef.current = null;
      }

      // Don't call /complete if the call errored out or never reached minimum
      if (wasError || duration < minSecs) {
        navigate(matchId ? `/matches/${matchId}` : '/matches', { replace: true });
        return;
      }

      await dispatch(completeVideoSession({ sessionId, duration })).unwrap();
      if (matchId) await dispatch(fetchMatchDetails(matchId));
      navigate(matchId ? `/matches/${matchId}` : '/matches', { replace: true });
    } catch (err: any) {
      console.error('Failed to complete session:', err);
      alert(err || 'Failed to save call. Please try again.');
      setEnding(false);
    }
  }, [ending, sessionId, duration, minSecs, dispatch, matchId, navigate]);

  // ── Initialize Daily.co ───────────────────────────────────────────────────
  useEffect(() => {
    if (!roomUrl) {
      setErrorMsg('Missing call session data. Please go back and click "Start Video Call" again.');
      setCallStatus('error');
      return;
    }

    let mounted = true;

    const init = async () => {
      try {
        const DailyIframe = (await import('@daily-co/daily-js')).default;
        if (!mounted || !iframeWrapRef.current) return;

        callFrameRef.current = DailyIframe.createFrame(iframeWrapRef.current, {
          iframeStyle: { width: '100%', height: '100%', border: 'none' },
          showLeaveButton: false,
          showFullscreenButton: true,
        });

        callFrameRef.current
          .on('joined-meeting', () => {
            if (!mounted) return;
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            setCallStatus('active');
            startTimer();
          })
          .on('left-meeting', () => {
            if (!mounted) return;
            // Pass wasError=true so /complete is not called if it was a forced leave
            handleEndCall(true, false);
          })
          .on('error', (err: any) => {
            if (!mounted) return;
            if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            setErrorMsg(`Call error: ${err?.errorMsg || 'Unknown error'}`);
            setCallStatus('error');
            // Destroy frame silently — don't call /complete
            if (callFrameRef.current) {
              callFrameRef.current.destroy().catch(() => {});
              callFrameRef.current = null;
            }
          });

        await callFrameRef.current.join({
          url: roomUrl,
          ...(token ? { token } : {}),
        });

        // Fallback: if joined-meeting never fires within 12s (e.g. no real Daily key),
        // clear the overlay so the user can still interact with the controls
        connectTimeoutRef.current = setTimeout(() => {
          if (mounted) {
            setCallStatus('active');
            startTimer();
          }
        }, 12000);
      } catch (err: any) {
        if (!mounted) return;
        setErrorMsg(err?.message || 'Failed to connect. Check camera/microphone permissions.');
        setCallStatus('error');
      }
    };

    init();

    return () => {
      mounted = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (connectTimeoutRef.current) clearTimeout(connectTimeoutRef.current);
      if (callFrameRef.current) {
        callFrameRef.current.destroy().catch(() => {});
        callFrameRef.current = null;
      }
    };
  // handleEndCall intentionally excluded — it changes on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, token]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  };

  const progressPct = Math.min((duration / minSecs) * 100, 100);
  const metMinimum = duration >= minSecs;
  const isWarning = !metMinimum && duration > minSecs - VIDEO_CONFIG.WARNING_TIME;

  // ── Error state ───────────────────────────────────────────────────────────
  if (callStatus === 'error') {
    return (
      <Page>
        <ErrorBox>
          <div style={{ fontSize: 48, marginBottom: 16 }}>📵</div>
          <h2 style={{ marginBottom: 12 }}>Call failed</h2>
          <p style={{ color: COLORS.gray, marginBottom: 24 }}>{errorMsg}</p>
          <Button onClick={() => navigate(matchId ? `/matches/${matchId}` : '/matches', { replace: true })}>
            ← Back to Match
          </Button>
        </ErrorBox>
      </Page>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Page>
      <CallWrapper>
        <TopBar>
          <CallTitle>📹 Video Call</CallTitle>
          <MinLabel>
            {metMinimum
              ? '✅ Minimum time reached — you can end the call'
              : `⏳ Minimum ${Math.floor(minSecs / 60)} minutes required`}
          </MinLabel>
        </TopBar>

        <IframeWrap ref={iframeWrapRef}>
          {callStatus === 'connecting' && (
            <Connecting>
              <Spinner />
              <span>Connecting to call…</span>
              <span style={{ fontSize: 13, color: COLORS.gray }}>
                Allow camera &amp; microphone access when prompted
              </span>
            </Connecting>
          )}
        </IframeWrap>

        <BottomBar>
          <TimerBadge warning={isWarning}>
            ⏱ {fmt(duration)}
          </TimerBadge>

          <MinProgress>
            <ProgressLabel>
              {metMinimum
                ? '✅ Minimum reached!'
                : `${fmt(Math.max(minSecs - duration, 0))} until you can end`}
            </ProgressLabel>
            <ProgressTrack>
              <ProgressFill pct={progressPct} done={metMinimum} />
            </ProgressTrack>
          </MinProgress>

          <Button
            variant="danger"
            size="large"
            onClick={() => handleEndCall(false)}
            disabled={!metMinimum || ending || callStatus !== 'active'}
          >
            {ending ? 'Ending…' : 'End Call'}
          </Button>
        </BottomBar>
      </CallWrapper>
    </Page>
  );
};

export default VideoCallScreen;
