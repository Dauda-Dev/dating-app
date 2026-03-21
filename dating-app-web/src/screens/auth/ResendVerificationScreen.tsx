import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { COLORS } from '../../constants';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { apiClient } from '../../services/apiClient';

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
`;

const Icon = styled.div`
  text-align: center;
  font-size: 80px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  text-align: center;
  color: ${COLORS.black};
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 16px;
`;

const Message = styled.p`
  text-align: center;
  color: ${COLORS.gray};
  font-size: 18px;
  line-height: 1.6;
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SuccessMessage = styled.div`
  background-color: #e8f5e9;
  color: ${COLORS.success};
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
`;

const ErrorMessage = styled.div`
  background-color: #fee;
  color: ${COLORS.danger};
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
  text-align: center;
`;

const LoginLink = styled.div`
  text-align: center;
  color: ${COLORS.darkGray};
  font-size: 14px;
  margin-top: 24px;
  
  a {
    color: ${COLORS.primary};
    font-weight: 600;
    text-decoration: none;
    
    &:hover {
      text-decoration: underline;
    }
  }
`;

const ResendVerificationScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    
    try {
      await apiClient.resendVerification(email);
      setSuccess(true);
      setEmail('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Icon>📧</Icon>
        <Title>Email Not Verified</Title>
        <Message>
          Your email address needs to be verified before you can log in. Enter your email below to receive a new verification link.
        </Message>
        
        {success && (
          <SuccessMessage>
            Verification email sent! Please check your inbox and spam folder.
          </SuccessMessage>
        )}
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <Form onSubmit={handleSubmit}>
          <Input
            type="email"
            label="Email Address"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Resend Verification Email'}
          </Button>
        </Form>
        
        <LoginLink>
          Already verified? <Link to="/login">Login</Link>
        </LoginLink>
      </Card>
    </Container>
  );
};

export default ResendVerificationScreen;
