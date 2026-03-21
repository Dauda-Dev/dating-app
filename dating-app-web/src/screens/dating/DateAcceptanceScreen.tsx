import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch } from '../../store/hooks';
import { acceptDate } from '../../store/slices/matchSlice';
import Button from '../../components/common/Button';
import Card from '../../components/common/Card';
import { COLORS } from '../../constants';

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 32px;
  text-align: center;
`;

const DateInfo = styled.div`
  margin-bottom: 32px;
`;

const InfoRow = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 20px;
`;

const Icon = styled.div`
  font-size: 24px;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: 14px;
  color: ${COLORS.gray};
  margin-bottom: 4px;
  font-weight: 600;
`;

const InfoValue = styled.div`
  font-size: 18px;
  color: ${COLORS.black};
  font-weight: 600;
`;

const Message = styled.div`
  padding: 20px;
  background-color: ${COLORS.background};
  border-radius: 12px;
  font-size: 16px;
  color: ${COLORS.darkGray};
  line-height: 1.6;
  font-style: italic;
  margin-bottom: 32px;
`;

const ButtonGroup = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const DateAcceptanceScreen: React.FC = () => {
  const { dateId } = useParams<{ dateId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // In production, fetch date proposal details from backend
  const dateProposal = {
    proposedDate: '2026-03-25T19:00',
    location: 'Downtown',
    venue: 'Italian Bistro',
    message: 'I know this amazing Italian place! Would love to take you there 😊',
    proposer: 'Sarah',
  };

  const handleAccept = async () => {
    if (!dateId) return;
    
    try {
      await dispatch(acceptDate(dateId)).unwrap();
      alert('Date accepted! Looking forward to it! 🎉');
      navigate('/');
    } catch (error) {
      alert('Failed to accept date');
    }
  };

  const handleDecline = () => {
    if (confirm('Are you sure you want to decline this date proposal?')) {
      alert('Date declined');
      navigate('/');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Container>
      <Title>💌 Date Proposal</Title>
      
      <Card padding="40px">
        <DateInfo>
          <InfoRow>
            <Icon>📅</Icon>
            <InfoContent>
              <InfoLabel>Date & Time</InfoLabel>
              <InfoValue>{formatDate(dateProposal.proposedDate)}</InfoValue>
            </InfoContent>
          </InfoRow>

          <InfoRow>
            <Icon>📍</Icon>
            <InfoContent>
              <InfoLabel>Location</InfoLabel>
              <InfoValue>{dateProposal.location}</InfoValue>
            </InfoContent>
          </InfoRow>

          <InfoRow>
            <Icon>🍽️</Icon>
            <InfoContent>
              <InfoLabel>Venue</InfoLabel>
              <InfoValue>{dateProposal.venue}</InfoValue>
            </InfoContent>
          </InfoRow>
        </DateInfo>

        {dateProposal.message && (
          <Message>
            💭 "{dateProposal.message}"
          </Message>
        )}

        <ButtonGroup>
          <Button size="large" onClick={handleAccept}>
            ✓ Accept
          </Button>
          <Button variant="outline" size="large" onClick={handleDecline}>
            ✕ Decline
          </Button>
        </ButtonGroup>
      </Card>
    </Container>
  );
};

export default DateAcceptanceScreen;
