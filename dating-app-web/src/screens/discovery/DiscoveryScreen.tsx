import React, { useEffect, useState, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { useSpring, animated, to as interpolate } from 'react-spring';
import { useDrag } from 'react-use-gesture';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchEligibleUsers, likeUser, nextCard } from '../../store/slices/discoverySlice';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { COLORS } from '../../constants';
import { DiscoveryUser } from '../../types';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 32px;
  text-align: center;
`;

const CardContainer = styled.div`
  position: relative;
  height: 580px;
  margin-bottom: 32px;
  user-select: none;
`;

const SwipeCard = styled(animated.div)`
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
  background: ${COLORS.white};
  will-change: transform;
  
  &:active {
    cursor: grabbing;
  }
`;

const CardImage = styled.div<{ image?: string }>`
  width: 100%;
  height: 70%;
  background: ${props => props.image 
    ? `url(${props.image}) center/cover` 
    : `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`
  };
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 120px;
  position: relative;
  overflow: hidden;
`;

// ── Photo carousel components ───────────────────────────────────────────────
const CarouselTapZone = styled.div<{ side: 'left' | 'right' }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: 40%;
  ${p => p.side}: 0;
  z-index: 5;
  cursor: pointer;
`;

const CarouselDots = styled.div`
  position: absolute;
  top: 10px;
  left: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  z-index: 6;
  pointer-events: none;
`;

const CarouselDot = styled.div<{ active: boolean }>`
  flex: 1;
  height: 3px;
  border-radius: 2px;
  background: ${p => p.active ? 'rgba(255,255,255,1)' : 'rgba(255,255,255,0.4)'};
  transition: background 0.2s;
`;

const PhotoCountBadge = styled.div`
  position: absolute;
  top: 18px;
  right: 12px;
  background: rgba(0,0,0,0.45);
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 3px 8px;
  border-radius: 10px;
  pointer-events: none;
  z-index: 7;
`;

// Photo carousel inside a card
interface PhotoCarouselProps {
  photos: string[];
  fallbackEmoji?: string;
}
const PhotoCarousel: React.FC<PhotoCarouselProps> = ({ photos, fallbackEmoji = '👤' }) => {
  const [idx, setIdx] = useState(0);
  const allPhotos = photos.filter(Boolean);

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => Math.max(0, i - 1));
  }, []);
  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => Math.min(allPhotos.length - 1, i + 1));
  }, [allPhotos.length]);

  if (allPhotos.length === 0) {
    return (
      <CardImage>
        <span>{fallbackEmoji}</span>
      </CardImage>
    );
  }

  return (
    <CardImage image={allPhotos[idx]}>
      {allPhotos.length > 1 && (
        <>
          <CarouselDots>
            {allPhotos.map((_, i) => <CarouselDot key={i} active={i === idx} />)}
          </CarouselDots>
          {idx > 0 && <CarouselTapZone side="left" onClick={prev} />}
          {idx < allPhotos.length - 1 && <CarouselTapZone side="right" onClick={next} />}
          <PhotoCountBadge>{idx + 1}/{allPhotos.length}</PhotoCountBadge>
        </>
      )}
    </CardImage>
  );
};

const CardInfo = styled.div`
  padding: 24px;
  background: ${COLORS.white};
  height: 30%;
`;

const CardName = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 8px;
`;

const CardDetails = styled.p`
  font-size: 16px;
  color: ${COLORS.gray};
  margin-bottom: 12px;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Tag = styled.span`
  padding: 6px 12px;
  background-color: ${COLORS.background};
  border-radius: 16px;
  font-size: 14px;
  color: ${COLORS.darkGray};
`;

const ActionButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 24px;
`;

const ActionButton = styled(Button)`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  font-size: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
`;

const MatchModal = styled.div`
  text-align: center;
`;

const MatchIcon = styled.div`
  font-size: 120px;
  margin-bottom: 24px;
  animation: bounce 0.6s ease;
  
  @keyframes bounce {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.2); }
  }
`;

const MatchTitle = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: ${COLORS.primary};
  margin-bottom: 16px;
`;

const MatchText = styled.p`
  font-size: 18px;
  color: ${COLORS.gray};
  margin-bottom: 32px;
`;

const SwipeLabel = styled(animated.div)<{ type: 'like' | 'nope' | 'super' }>`
  position: absolute;
  top: 32px;
  ${props => props.type === 'nope' ? 'right: 24px;' : props.type === 'super' ? 'left: 50%; transform: translateX(-50%);' : 'left: 24px;'}
  padding: 8px 20px;
  border: 4px solid ${props => props.type === 'like' ? COLORS.success : props.type === 'super' ? COLORS.secondary : COLORS.danger};
  border-radius: 12px;
  color: ${props => props.type === 'like' ? COLORS.success : props.type === 'super' ? COLORS.secondary : COLORS.danger};
  font-size: 28px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 2px;
  z-index: 10;
  pointer-events: none;
`;

const DiscoveryScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { users, currentIndex, isLoading } = useAppSelector(state => state.discovery);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [matchedUser, setMatchedUser] = useState<DiscoveryUser | null>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    if (users.length === 0) {
      dispatch(fetchEligibleUsers({ limit: 10 }));
    }
  }, [dispatch, users.length]);

  const [{ x, y, rotate, scale }, api] = useSpring(() => ({
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
    config: { tension: 300, friction: 25 },
  }));

  const likeOpacity = x.to(v => Math.max(0, Math.min(1, v / 80)));
  const nopeOpacity = x.to(v => Math.max(0, Math.min(1, -v / 80)));
  const superOpacity = y.to(v => Math.max(0, Math.min(1, -v / 80)));

  const currentUser = users[currentIndex];

  const flyOff = async (direction: 'left' | 'right' | 'up') => {
    if (isAnimating.current || !currentUser) return;
    isAnimating.current = true;

    const xTarget = direction === 'left' ? -1200 : direction === 'right' ? 1200 : 0;
    const yTarget = direction === 'up' ? -1200 : 0;
    const rotTarget = direction === 'left' ? -30 : direction === 'right' ? 30 : 0;

    await api.start({ x: xTarget, y: yTarget, rotate: rotTarget, scale: 1, config: { tension: 200, friction: 20 } });

    const likeType = direction === 'right' ? 'like' : direction === 'up' ? 'super_like' : 'reject';
    const result = await dispatch(likeUser({ userId: currentUser.id, likeType }));

    if (likeUser.fulfilled.match(result) && result.payload.match) {
      setMatchedUser(currentUser);
      setMatchModalOpen(true);
    }

    dispatch(nextCard());

    // Reset spring immediately (card is gone, next card is now on top)
    api.set({ x: 0, y: 0, rotate: 0, scale: 1 });
    isAnimating.current = false;

    if (users.length - currentIndex < 3) {
      dispatch(fetchEligibleUsers({ limit: 10, offset: users.length }));
    }
  };

  const bind = useDrag(
    ({ down, movement: [mx, my], velocity, direction: [xDir, yDir], cancel }) => {
      if (isAnimating.current) { cancel?.(); return; }

      const SWIPE_THRESHOLD = 120;
      const VELOCITY_THRESHOLD = 0.5;

      const swipedFarX = Math.abs(mx) > SWIPE_THRESHOLD;
      const swipedFarY = my < -SWIPE_THRESHOLD;
      const swipedFastX = velocity > VELOCITY_THRESHOLD && Math.abs(xDir) > Math.abs(yDir);
      const swipedFastUp = velocity > VELOCITY_THRESHOLD && yDir < 0;

      if (!down) {
        if (swipedFarX || swipedFastX) {
          flyOff(mx > 0 ? 'right' : 'left');
        } else if (swipedFarY || swipedFastUp) {
          flyOff('up');
        } else {
          // Snap back with spring
          api.start({ x: 0, y: 0, rotate: 0, scale: 1, config: { tension: 400, friction: 30 } });
        }
      } else {
        api.start({
          x: mx,
          y: my,
          rotate: mx / 15,
          scale: 1.03,
          config: { tension: 800, friction: 40 },
          immediate: true,
        });
      }
    },
    { filterTaps: true, rubberband: 0.15 }
  );

  if (isLoading && users.length === 0) {
    return (
      <Container>
        <Title>💝 Discover</Title>
        <EmptyState>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '18px', color: COLORS.gray }}>Finding people for you...</p>
        </EmptyState>
      </Container>
    );
  }

  if (!currentUser) {
    return (
      <Container>
        <Title>💝 Discover</Title>
        <EmptyState>
          <div style={{ fontSize: '80px', marginBottom: '24px' }}>😢</div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: COLORS.black, marginBottom: '12px' }}>
            No more profiles
          </h2>
          <p style={{ fontSize: '18px', color: COLORS.gray, marginBottom: '24px' }}>
            Check back later for more matches!
          </p>
          <Button onClick={() => dispatch(fetchEligibleUsers({ limit: 10, offset: 0 }))}>
            Refresh
          </Button>
        </EmptyState>
      </Container>
    );
  }

  const calculateAge = (birthDate?: string) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const age = calculateAge(currentUser.dateOfBirth);
  const hobbies = currentUser.profile?.hobbies || currentUser.hobbies || [];
  const bio = currentUser.profile?.bio || currentUser.bio;

  return (
    <Container>
      <Title>💝 Discover</Title>

      <CardContainer>
        {/* Background card (next card preview) */}
        {users[currentIndex + 1] && (
          <SwipeCard
            style={{
              transform: 'scale(0.95) translateY(16px)',
              zIndex: 0,
              pointerEvents: 'none',
            } as any}
          >
            <PhotoCarousel
              photos={[
                users[currentIndex + 1].profilePhoto || users[currentIndex + 1].profilePicture || '',
                ...(users[currentIndex + 1].profile?.photos || users[currentIndex + 1].photos || []),
              ]}
            />
            <CardInfo>
              <CardName>{users[currentIndex + 1].firstName}</CardName>
            </CardInfo>
          </SwipeCard>
        )}

        {/* Active card */}
        <SwipeCard
          {...bind()}
          style={{
            x,
            y,
            rotate: rotate.to(r => `${r}deg`),
            scale,
            zIndex: 1,
            touchAction: 'none',
          }}
        >
          <SwipeLabel type="like" style={{ opacity: likeOpacity }}>LIKE</SwipeLabel>
          <SwipeLabel type="nope" style={{ opacity: nopeOpacity }}>NOPE</SwipeLabel>
          <SwipeLabel type="super" style={{ opacity: superOpacity }}>SUPER</SwipeLabel>

          <PhotoCarousel
            photos={[
              currentUser.profilePhoto || currentUser.profilePicture || '',
              ...(currentUser.profile?.photos || currentUser.photos || []),
            ]}
          />
          <CardInfo>
            <CardName>
              {currentUser.firstName}{age ? `, ${age}` : ''}
            </CardName>
            <CardDetails>
              {currentUser.profile?.location || currentUser.location || 'Location not set'}
              {bio && ` • ${bio.slice(0, 60)}${bio.length > 60 ? '…' : ''}`}
            </CardDetails>
            <Tags>
              {hobbies.slice(0, 4).map((hobby: string, index: number) => (
                <Tag key={index}>{hobby}</Tag>
              ))}
            </Tags>
          </CardInfo>
        </SwipeCard>
      </CardContainer>

      <ActionButtons>
        <ActionButton
          variant="danger"
          onClick={() => flyOff('left')}
        >
          ✕
        </ActionButton>
        <ActionButton
          variant="secondary"
          onClick={() => flyOff('up')}
        >
          ⭐
        </ActionButton>
        <ActionButton
          onClick={() => flyOff('right')}
        >
          ♥
        </ActionButton>
      </ActionButtons>

      <Modal isOpen={matchModalOpen} onClose={() => setMatchModalOpen(false)}>
        <MatchModal>
          <MatchIcon>💕</MatchIcon>
          <MatchTitle>It's a Match!</MatchTitle>
          <MatchText>
            You and {matchedUser?.firstName} liked each other!
          </MatchText>
          <Button size="large" fullWidth onClick={() => setMatchModalOpen(false)}>
            Continue Swiping
          </Button>
        </MatchModal>
      </Modal>
    </Container>
  );
};

export default DiscoveryScreen;
