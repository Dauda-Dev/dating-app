import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMatches } from '../../store/slices/matchSlice';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS, MATCH_STATUS_CONFIG } from '../../constants';

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: ${COLORS.gray};
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
`;

const StatCard = styled(Card)`
  text-align: center;
  padding: 32px;
`;

const StatNumber = styled.div`
  font-size: 48px;
  font-weight: 700;
  color: ${COLORS.primary};
  margin-bottom: 8px;
`;

const StatLabel = styled.div`
  font-size: 16px;
  color: ${COLORS.darkGray};
  font-weight: 600;
`;

const MatchCard = styled(Card)`
  padding: 32px;
`;

const MatchHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
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
`;

const MatchInfo = styled.div`
  flex: 1;
`;

const MatchName = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 4px;
`;

const MatchStatus = styled.div<{ color: string }>`
  display: inline-block;
  padding: 6px 12px;
  background-color: ${props => props.color}20;
  color: ${props => props.color};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 600;
`;

const ProgressBar = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px 0;
`;

const ProgressStep = styled.div<{ active: boolean; completed: boolean }>`
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background-color: ${props => 
    props.completed ? COLORS.success : 
    props.active ? COLORS.primary : 
    COLORS.lightGray
  };
  transition: all 0.3s ease;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
`;

const EmptyIcon = styled.div`
  font-size: 80px;
  margin-bottom: 24px;
`;

const EmptyTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 12px;
`;

const EmptyText = styled.p`
  font-size: 18px;
  color: ${COLORS.gray};
  margin-bottom: 32px;
`;

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { matches, isLoading } = useAppSelector(state => state.match);
  const { user } = useAppSelector(state => state.auth);

  useEffect(() => {
    dispatch(fetchMatches({ limit: 10 }));
  }, [dispatch]);

  const activeMatch = matches.find(m => 
    ['MATCHED', 'VIDEO_CALL_SCHEDULED', 'VIDEO_CALL_COMPLETED', 'DATE_PROPOSED'].includes(m.status)
  );

  const getProgressSteps = (status: string) => {
    const steps = ['MATCHED', 'VIDEO_CALL_COMPLETED', 'DATE_ACCEPTED', 'POST_DATE_OPEN'];
    const currentIndex = steps.indexOf(status);
    return steps.map((step, index) => ({
      completed: index < currentIndex,
      active: index === currentIndex,
    }));
  };

  const handleAction = (match: any) => {
    switch (match.status) {
      case 'MATCHED':
      case 'VIDEO_CALL_SCHEDULED':
        navigate(`/video/${match.videoSession?.id}`);
        break;
      case 'VIDEO_CALL_COMPLETED':
        navigate(`/date/propose/${match.id}`);
        break;
      case 'DATE_PROPOSED':
        navigate(`/matches`);
        break;
      default:
        break;
    }
  };

  const getPartnerName = (match: any) => {
    const partner = match.user1Id === user?.id ? match.partner : match.user;
    return partner ? `${partner.firstName} ${partner.lastName}` : 'Unknown';
  };

  if (isLoading) {
    return <Container><Title>Loading...</Title></Container>;
  }

  return (
    <Container>
      <Header>
        <Title>👋 Welcome back, {user?.firstName}!</Title>
        <Subtitle>Here's what's happening with your matches</Subtitle>
      </Header>

      <Grid>
        <StatCard>
          <StatNumber>{matches.length}</StatNumber>
          <StatLabel>Total Matches</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatNumber>{matches.filter(m => m.status === 'matched_locked').length}</StatNumber>
          <StatLabel>New Matches</StatLabel>
        </StatCard>
        
        <StatCard>
          <StatNumber>{matches.filter(m => m.status === 'post_date_open').length}</StatNumber>
          <StatLabel>Open Relationships</StatLabel>
        </StatCard>
      </Grid>

      {activeMatch ? (
        <MatchCard>
          <MatchHeader>
            <Avatar>💕</Avatar>
            <MatchInfo>
              <MatchName>{getPartnerName(activeMatch)}</MatchName>
              <MatchStatus color={MATCH_STATUS_CONFIG[activeMatch.status]?.color || COLORS.primary}>
                {MATCH_STATUS_CONFIG[activeMatch.status]?.label || activeMatch.status}
              </MatchStatus>
            </MatchInfo>
          </MatchHeader>

          <ProgressBar>
            {getProgressSteps(activeMatch.status).map((step, index) => (
              <ProgressStep key={index} active={step.active} completed={step.completed} />
            ))}
          </ProgressBar>

          <ActionButtons>
            <Button onClick={() => handleAction(activeMatch)} size="large">
              {MATCH_STATUS_CONFIG[activeMatch.status]?.action || 'Continue'}
            </Button>
            <Button variant="outline" onClick={() => navigate('/matches')}>
              View All Matches
            </Button>
          </ActionButtons>
        </MatchCard>
      ) : (
        <Card>
          <EmptyState>
            <EmptyIcon>💔</EmptyIcon>
            <EmptyTitle>No active matches</EmptyTitle>
            <EmptyText>Start swiping to find your perfect match!</EmptyText>
            <Button size="large" onClick={() => navigate('/discovery')}>
              Start Discovering
            </Button>
          </EmptyState>
        </Card>
      )}
    </Container>
  );
};

export default HomeScreen;
