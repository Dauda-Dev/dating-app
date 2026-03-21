import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { apiClient } from '../../services/apiClient';
import { getMe } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Card from '../../components/common/Card';
import { COLORS, HOBBIES_OPTIONS, INTERESTS_OPTIONS } from '../../constants';

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

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 12px;
  transition: all 0.3s ease;
  min-height: 120px;
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

const TagSelector = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
`;

const Tag = styled.button<{ selected: boolean }>`
  padding: 8px 16px;
  background-color: ${props => props.selected ? COLORS.primary : COLORS.background};
  color: ${props => props.selected ? COLORS.white : COLORS.darkGray};
  border: 2px solid ${props => props.selected ? COLORS.primary : 'transparent'};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 16px;
`;

const ProfileEditScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    bio: user?.profile?.bio || '',
    location: user?.profile?.location || '',
    occupation: user?.profile?.occupation || '',
    education: user?.profile?.education || '',
    hobbies: user?.profile?.hobbies || [],
    interests: user?.profile?.interests || [],
  });

  const toggleItem = (category: 'hobbies' | 'interests', item: string) => {
    const current = formData[category];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    setFormData({ ...formData, [category]: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await apiClient.updateProfile(formData);
      await dispatch(getMe());
      alert('Profile updated successfully!');
      navigate('/profile');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Title>✏️ Edit Profile</Title>
      
      <Card padding="40px">
        <Form onSubmit={handleSubmit}>
          <div>
            <Label>Bio</Label>
            <TextArea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              maxLength={500}
            />
            <small style={{ color: COLORS.gray }}>{formData.bio.length}/500</small>
          </div>

          <Input
            label="Location"
            placeholder="City, State"
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />

          <Input
            label="Occupation"
            placeholder="Your job title"
            value={formData.occupation}
            onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
          />

          <Input
            label="Education"
            placeholder="Highest degree or institution"
            value={formData.education}
            onChange={(e) => setFormData({ ...formData, education: e.target.value })}
          />

          <div>
            <Label>Hobbies (Select all that apply)</Label>
            <TagSelector>
              {HOBBIES_OPTIONS.map(hobby => (
                <Tag
                  key={hobby}
                  type="button"
                  selected={formData.hobbies.includes(hobby)}
                  onClick={() => toggleItem('hobbies', hobby)}
                >
                  {hobby}
                </Tag>
              ))}
            </TagSelector>
          </div>

          <div>
            <Label>Interests (Select all that apply)</Label>
            <TagSelector>
              {INTERESTS_OPTIONS.map(interest => (
                <Tag
                  key={interest}
                  type="button"
                  selected={formData.interests.includes(interest)}
                  onClick={() => toggleItem('interests', interest)}
                >
                  {interest}
                </Tag>
              ))}
            </TagSelector>
          </div>

          <ButtonGroup>
            <Button type="submit" disabled={isLoading} size="large">
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              size="large"
              onClick={() => navigate('/profile')}
            >
              Cancel
            </Button>
          </ButtonGroup>
        </Form>
      </Card>
    </Container>
  );
};

export default ProfileEditScreen;
