import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 32px;
`;

const MatchList = styled.div`
  display: grid;
  gap: 20px;
`;

const MatchCard = styled(Card)<{ hover: boolean }>`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 24px;
  cursor: pointer;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  flex-shrink: 0;
`;

const MatchInfo = styled.div`
  flex: 1;
`;

const MatchName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 6px;
`;

const MatchStatus = styled.div<{ color: string }>`
  display: inline-block;
  padding: 4px 10px;
  background-color: ${props => props.color}20;
  color: ${props => props.color};
  border-radius: 16px;
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 8px;
`;

const MatchDate = styled.p`
  font-size: 14px;
  color: ${COLORS.gray};
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
`;

const MatchesScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { matches, isLoading } = useAppSelector(state => state.match);
  const { user } = useAppSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchMatches({ limit: 50 }));
  }, [dispatch]);

  const getPartner = (match: any) => {
    return match.user1Id === user?.id ? match.User2 : match.User1;
  };

  const getPartnerName = (match: any) => {
    const partner = getPartner(match);
    return partner ? `${partner.firstName} ${partner.lastName}` : 'Unknown';
  };

  const getPartnerPhoto = (match: any) => {
    const partner = getPartner(match);
    return partner?.profilePhoto || null;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  if (isLoading) {
    return <Container><Title>Loading...</Title></Container>;
  }

  if (matches.length === 0) {
    return (
      <Container>
        <Title>💘 Matches</Title>
        <Card>
          <EmptyState>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>💔</div>
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>No matches yet</h2>
            <p style={{ fontSize: '18px', color: COLORS.gray, marginBottom: '32px' }}>
              Start swiping to find your perfect match!
            </p>
            <Button size="large" onClick={() => navigate('/discovery')}>
              Start Discovering
            </Button>
          </EmptyState>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Title>💘 Matches ({matches.length})</Title>
      <MatchList>
        {matches.map(match => (
          <MatchCard 
            key={match.id} 
            hover={true}
            onClick={() => navigate(`/matches/${match.id}`)}
          >
            {getPartnerPhoto(match) ? (
              <Avatar style={{ backgroundImage: `url(${getPartnerPhoto(match)})`, backgroundSize: 'cover', backgroundPosition: 'center', fontSize: 0 }} />
            ) : (
              <Avatar>💕</Avatar>
            )}
            <MatchInfo>
              <MatchName>{getPartnerName(match)}</MatchName>
              <MatchStatus color={MATCH_STATUS_CONFIG[match.status]?.color || COLORS.primary}>
                {MATCH_STATUS_CONFIG[match.status]?.label || match.status}
              </MatchStatus>
              <MatchDate>
                Matched on {formatDate(match.matchedAt || match.createdAt)}
              </MatchDate>
            </MatchInfo>
          </MatchCard>
        ))}
      </MatchList>
    </Container>
  );
};

export default MatchesScreen;
