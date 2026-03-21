import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch } from '../../store/hooks';
import { proposeDate } from '../../store/slices/matchSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 12px;
  transition: all 0.3s ease;
  min-height: 100px;
  resize: vertical;
  
  &:focus {
    outline: none;
    border-color: ${COLORS.primary};
    box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
  }
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${COLORS.darkGray};
  font-size: 14px;
  font-weight: 600;
`;

const DateProposalScreen: React.FC = () => {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    proposedDate: '',
    location: '',
    venue: '',
    message: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.proposedDate) {
      newErrors.proposedDate = 'Date is required';
    } else {
      const selectedDate = new Date(formData.proposedDate);
      const today = new Date();
      if (selectedDate < today) {
        newErrors.proposedDate = 'Date must be in the future';
      }
    }
    
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    
    if (!formData.venue.trim()) {
      newErrors.venue = 'Venue is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !matchId) return;
    
    setIsLoading(true);
    
    try {
      await dispatch(proposeDate({ matchId, data: formData })).unwrap();
      alert('Date proposal sent successfully!');
      navigate('/');
    } catch (error: any) {
      alert(error || 'Failed to send date proposal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>📅 Propose a Date</Title>
      
      <Card padding="40px">
        <Form onSubmit={handleSubmit}>
          <Input
            type="datetime-local"
            label="Date & Time"
            value={formData.proposedDate}
            onChange={(e) => setFormData({ ...formData, proposedDate: e.target.value })}
            error={errors.proposedDate}
            required
          />

          <Input
            label="Location"
            placeholder="City or address"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            error={errors.location}
            required
          />

          <Input
            label="Venue"
            placeholder="Restaurant, park, etc."
            value={formData.venue}
            onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
            error={errors.venue}
            required
          />

          <div>
            <Label>Message (Optional)</Label>
            <TextArea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Add a personal message to your date proposal..."
              maxLength={500}
            />
          </div>

          <Button type="submit" fullWidth size="large" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Proposal'}
          </Button>
        </Form>
      </Card>
    </Container>
  );
};

export default DateProposalScreen;
