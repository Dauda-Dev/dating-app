import React, { useEffect } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPendingSteals, acceptSteal, rejectSteal } from '../../store/slices/stealSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 32px;
`;

const RequestList = styled.div`
  display: grid;
  gap: 24px;
`;

const RequestCard = styled(Card)`
  padding: 32px;
`;

const RequestHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.warning} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  flex-shrink: 0;
`;

const RequestInfo = styled.div`
  flex: 1;
`;

const RequesterName = styled.h3`
  font-size: 22px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 8px;
`;

const ExpiryTime = styled.div`
  font-size: 14px;
  color: ${COLORS.danger};
  font-weight: 600;
`;

const Message = styled.div`
  padding: 20px;
  background-color: ${COLORS.background};
  border-radius: 12px;
  font-size: 16px;
  color: ${COLORS.darkGray};
  line-height: 1.6;
  margin-bottom: 24px;
  font-style: italic;
`;

const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 80px 20px;
`;

const StealNotificationScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { incomingRequests, isLoading } = useAppSelector(state => state.steal);

  useEffect(() => {
    dispatch(fetchPendingSteals());
    
    // Poll for new requests every 30 seconds
    const interval = setInterval(() => {
      dispatch(fetchPendingSteals());
    }, 30000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleAccept = async (requestId: string) => {
    if (confirm('Are you sure you want to accept this steal request?')) {
      try {
        await dispatch(acceptSteal(requestId)).unwrap();
        alert('Steal accepted! You have a new match! 💕');
      } catch (error) {
        alert('Failed to accept steal request');
      }
    }
  };

  const handleReject = async (requestId: string) => {
    if (confirm('Are you sure you want to reject this steal request?')) {
      try {
        await dispatch(rejectSteal(requestId)).unwrap();
        alert('Steal rejected');
      } catch (error) {
        alert('Failed to reject steal request');
      }
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diff <= 0) return 'Expired';
    return `${hours}h ${minutes}m remaining`;
  };

  if (isLoading && incomingRequests.length === 0) {
    return <Container><Title>Loading...</Title></Container>;
  }

  if (incomingRequests.length === 0) {
    return (
      <Container>
        <Title>⚡ Steal Requests</Title>
        <Card>
          <EmptyState>
            <div style={{ fontSize: '80px', marginBottom: '24px' }}>⚡</div>
            <h2 style={{ fontSize: '28px', marginBottom: '12px' }}>No pending steal requests</h2>
            <p style={{ fontSize: '18px', color: COLORS.gray }}>
              You'll be notified when someone wants to steal you away!
            </p>
          </EmptyState>
        </Card>
      </Container>
    );
  }

  return (
    <Container>
      <Title>⚡ Steal Requests ({incomingRequests.length})</Title>
      
      <RequestList>
        {incomingRequests.map(request => (
          <RequestCard key={request.id}>
            <RequestHeader>
              <Avatar>⚡</Avatar>
              <RequestInfo>
                <RequesterName>
                  {request.requester?.firstName || 'Someone'} wants to steal you!
                </RequesterName>
                <ExpiryTime>
                  ⏱️ {getTimeRemaining(request.expiresAt)}
                </ExpiryTime>
              </RequestInfo>
            </RequestHeader>

            {request.message && (
              <Message>
                💭 "{request.message}"
              </Message>
            )}

            <ButtonGroup>
              <Button size="large" onClick={() => handleAccept(request.id)}>
                ✓ Accept
              </Button>
              <Button 
                variant="outline" 
                size="large" 
                onClick={() => handleReject(request.id)}
              >
                ✕ Reject
              </Button>
            </ButtonGroup>
          </RequestCard>
        ))}
      </RequestList>
    </Container>
  );
};

export default StealNotificationScreen;
