import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { COLORS } from '../../constants';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientEnd} 100%);
  padding: 20px;
`;

const Card = styled.div`
  background: ${COLORS.white};
  border-radius: 24px;
  padding: 48px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  text-align: center;
`;

const Icon = styled.div`
  font-size: 80px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  color: ${COLORS.black};
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 16px;
`;

const Message = styled.p`
  color: ${COLORS.gray};
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 32px;
`;

const InfoBox = styled.div`
  background: ${COLORS.background};
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  text-align: left;
`;

const InfoTitle = styled.h3`
  color: ${COLORS.darkGray};
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
`;

const InfoList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

const InfoItem = styled.li`
  color: ${COLORS.gray};
  font-size: 14px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  
  &:before {
    content: '✓';
    color: ${COLORS.success};
    font-weight: bold;
    margin-right: 8px;
    font-size: 16px;
  }
`;

const LoginLink = styled(Link)`
  display: inline-block;
  color: ${COLORS.primary};
  font-weight: 600;
  text-decoration: none;
  padding: 12px 24px;
  border: 2px solid ${COLORS.primary};
  border-radius: 12px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${COLORS.primary};
    color: ${COLORS.white};
  }
`;

const VerifyEmailScreen: React.FC = () => {
  return (
    <Container>
      <Card>
        <Icon>📧</Icon>
        <Title>Verify Your Email</Title>
        <Message>
          We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.
        </Message>
        
        <InfoBox>
          <InfoTitle>What to do next:</InfoTitle>
          <InfoList>
            <InfoItem>Check your email inbox (and spam folder)</InfoItem>
            <InfoItem>Click the verification link in the email</InfoItem>
            <InfoItem>Log in — we'll guide you to set up your profile</InfoItem>
            <InfoItem>Start discovering people near you!</InfoItem>
          </InfoList>
        </InfoBox>
        
        <Message style={{ fontSize: '14px', marginBottom: '24px' }}>
          Didn't receive the email? Check your spam folder or{' '}
          <Link to="/resend-verification" style={{ color: COLORS.primary, fontWeight: 600 }}>
            resend it
          </Link>.
        </Message>
        
        <LoginLink to="/login">Go to Login →</LoginLink>
      </Card>
    </Container>
  );
};

export default VerifyEmailScreen;
