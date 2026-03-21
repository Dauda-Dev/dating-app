import React from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { COLORS, SUBSCRIPTION_TIERS } from '../../constants';

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

const Section = styled(Card)`
  padding: 32px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h2`
  font-size: 24px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 20px;
`;

const SubscriptionCard = styled.div<{ current: boolean }>`
  padding: 24px;
  border: 2px solid ${props => props.current ? COLORS.primary : COLORS.lightGray};
  border-radius: 16px;
  margin-bottom: 16px;
  background-color: ${props => props.current ? `${COLORS.primary}10` : COLORS.white};
`;

const SubscriptionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const SubscriptionName = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${COLORS.black};
`;

const Price = styled.div`
  font-size: 24px;
  font-weight: 700;
  color: ${COLORS.primary};
`;

const FeatureList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const Feature = styled.li`
  padding: 8px 0;
  color: ${COLORS.darkGray};
  
  &:before {
    content: '✓ ';
    color: ${COLORS.success};
    font-weight: 700;
    margin-right: 8px;
  }
`;

const SettingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 0;
  border-bottom: 1px solid ${COLORS.lightGray};
  
  &:last-child {
    border-bottom: none;
  }
`;

const SettingLabel = styled.div`
  font-size: 16px;
  color: ${COLORS.black};
  font-weight: 500;
`;

const Toggle = styled.button<{ active: boolean }>`
  width: 56px;
  height: 32px;
  border-radius: 16px;
  border: none;
  background-color: ${props => props.active ? COLORS.success : COLORS.lightGray};
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:after {
    content: '';
    position: absolute;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background-color: ${COLORS.white};
    top: 4px;
    left: ${props => props.active ? '28px' : '4px'};
    transition: all 0.3s ease;
  }
`;

const DangerZone = styled.div`
  padding: 24px;
  background-color: #fee;
  border: 2px solid ${COLORS.danger};
  border-radius: 16px;
  margin-top: 16px;
`;

const DangerTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${COLORS.danger};
  margin-bottom: 12px;
`;

const DangerText = styled.p`
  font-size: 14px;
  color: ${COLORS.darkGray};
  margin-bottom: 16px;
`;

const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [notifications, setNotifications] = React.useState(true);
  const [emailNotifications, setEmailNotifications] = React.useState(true);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await dispatch(logout());
      navigate('/login');
    }
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (confirm('This will permanently delete all your data. Are you absolutely sure?')) {
        alert('Account deletion is not implemented in this demo');
      }
    }
  };

  return (
    <Container>
      <Title>⚙️ Settings</Title>

      <Section>
        <SectionTitle>Subscription</SectionTitle>
        {Object.entries(SUBSCRIPTION_TIERS).map(([tier, info]) => (
          <SubscriptionCard 
            key={tier}
            current={user?.subscriptionTier === tier}
          >
            <SubscriptionHeader>
              <SubscriptionName>{info.label}</SubscriptionName>
              <Price>${info.price}/mo</Price>
            </SubscriptionHeader>
            <FeatureList>
              {info.features.map((feature, index) => (
                <Feature key={index}>{feature}</Feature>
              ))}
            </FeatureList>
            {user?.subscriptionTier !== tier && (
              <Button
                fullWidth
                variant={tier === 'vip' ? 'primary' : 'secondary'}
              >
                Upgrade to {info.label}
              </Button>
            )}
          </SubscriptionCard>
        ))}
      </Section>

      <Section>
        <SectionTitle>Notifications</SectionTitle>
        <SettingItem>
          <SettingLabel>Push Notifications</SettingLabel>
          <Toggle 
            active={notifications} 
            onClick={() => setNotifications(!notifications)}
          />
        </SettingItem>
        <SettingItem>
          <SettingLabel>Email Notifications</SettingLabel>
          <Toggle 
            active={emailNotifications} 
            onClick={() => setEmailNotifications(!emailNotifications)}
          />
        </SettingItem>
      </Section>

      <Section>
        <SectionTitle>Account</SectionTitle>
        <Button fullWidth variant="outline" onClick={handleLogout}>
          Logout
        </Button>
        
        <DangerZone>
          <DangerTitle>Danger Zone</DangerTitle>
          <DangerText>
            Once you delete your account, there is no going back. Please be certain.
          </DangerText>
          <Button variant="danger" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </DangerZone>
      </Section>
    </Container>
  );
};

export default SettingsScreen;
