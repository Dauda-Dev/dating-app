import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch } from '../../store/hooks';
import { forgotPassword } from '../../store/slices/authSlice';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
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
  max-width: 450px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
`;

const Logo = styled.div`
  text-align: center;
  font-size: 64px;
  margin-bottom: 16px;
`;

const Title = styled.h1`
  text-align: center;
  color: ${COLORS.black};
  font-size: 32px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const Subtitle = styled.p`
  text-align: center;
  color: ${COLORS.gray};
  font-size: 16px;
  margin-bottom: 32px;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
`;

const SuccessMessage = styled.div`
  background-color: #d4edda;
  color: #155724;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const BackLink = styled(Link)`
  display: block;
  text-align: center;
  color: ${COLORS.primary};
  font-size: 14px;
  text-decoration: none;
  margin-top: 24px;
  
  &:hover {
    text-decoration: underline;
  }
`;

const ForgotPasswordScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Email is required');
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await dispatch(forgotPassword(email)).unwrap();
      setSuccess(true);
    } catch (err: any) {
      setError(err || 'Failed to send reset email');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container>
      <Card>
        <Logo>🔐</Logo>
        <Title>Forgot Password?</Title>
        <Subtitle>Enter your email to receive a password reset link</Subtitle>
        
        {success ? (
          <>
            <SuccessMessage>
              Password reset link has been sent to your email. Please check your inbox.
            </SuccessMessage>
            <BackLink to="/login">← Back to Login</BackLink>
          </>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Input
              type="email"
              label="Email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={error}
              required
            />
            
            <Button type="submit" fullWidth disabled={isLoading}>
              {isLoading ? 'Sending...' : 'Send Reset Link'}
            </Button>
            
            <BackLink to="/login">← Back to Login</BackLink>
          </Form>
        )}
      </Card>
    </Container>
  );
};

export default ForgotPasswordScreen;
