import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch } from '../../store/hooks';
import { completeDate } from '../../store/slices/matchSlice';
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

const Celebration = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const CelebrationIcon = styled.div`
  font-size: 80px;
  margin-bottom: 16px;
  animation: bounce 1s ease infinite;
  
  @keyframes bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
`;

const CelebrationText = styled.p`
  font-size: 20px;
  color: ${COLORS.darkGray};
  line-height: 1.6;
`;

const RatingSection = styled.div`
  margin-bottom: 32px;
`;

const RatingLabel = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${COLORS.black};
  margin-bottom: 16px;
  text-align: center;
`;

const Stars = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 32px;
`;

const Star = styled.button<{ filled: boolean }>`
  background: none;
  border: none;
  font-size: 48px;
  cursor: pointer;
  transition: transform 0.2s ease;
  filter: ${props => props.filled ? 'none' : 'grayscale(100%)'};
  opacity: ${props => props.filled ? 1 : 0.3};
  
  &:hover {
    transform: scale(1.2);
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 16px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 12px;
  transition: all 0.3s ease;
  min-height: 120px;
  resize: vertical;
  margin-bottom: 24px;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 12px;
  color: ${COLORS.darkGray};
  font-size: 16px;
  font-weight: 600;
`;

const DateCompletionScreen: React.FC = () => {
  const { dateId } = useParams<{ dateId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      alert('Please select a rating');
      return;
    }

    if (!dateId) return;

    setIsLoading(true);

    try {
      await dispatch(completeDate({ dateId, rating, feedback })).unwrap();
      alert('Thank you for your feedback! 🎉');
      navigate('/');
    } catch (error) {
      alert('Failed to submit feedback');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>🎉 Date Completed!</Title>
      
      <Card padding="40px">
        <Celebration>
          <CelebrationIcon>💝</CelebrationIcon>
          <CelebrationText>
            Congratulations on completing your date!<br />
            We'd love to hear how it went.
          </CelebrationText>
        </Celebration>

        <RatingSection>
          <RatingLabel>How was your experience?</RatingLabel>
          <Stars>
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                filled={star <= rating}
                onClick={() => setRating(star)}
                type="button"
              >
                ⭐
              </Star>
            ))}
          </Stars>
        </RatingSection>

        <div>
          <Label>Additional Feedback (Optional)</Label>
          <TextArea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts about the date..."
            maxLength={500}
          />
        </div>

        <Button 
          fullWidth 
          size="large" 
          onClick={handleSubmit}
          disabled={isLoading || rating === 0}
        >
          {isLoading ? 'Submitting...' : 'Submit Feedback'}
        </Button>
      </Card>
    </Container>
  );
};

export default DateCompletionScreen;
