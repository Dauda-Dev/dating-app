import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch } from '../../store/hooks';
import { resetPassword } from '../../store/slices/authSlice';
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

const ResetPasswordScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setErrors({ password: 'Invalid or missing reset token' });
      return;
    }
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      await dispatch(resetPassword({ token, password: formData.password })).unwrap();
      alert('Password reset successfully! You can now login with your new password.');
      navigate('/login');
    } catch (err: any) {
      setErrors({ password: err || 'Failed to reset password' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
  };

  return (
    <Container>
      <Card>
        <Logo>🔑</Logo>
        <Title>Reset Password</Title>
        <Subtitle>Enter your new password</Subtitle>
        
        <Form onSubmit={handleSubmit}>
          <Input
            type="password"
            label="New Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            required
          />
          
          <Input
            type="password"
            label="Confirm New Password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            required
          />
          
          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>
          
          <BackLink to="/login">← Back to Login</BackLink>
        </Form>
      </Card>
    </Container>
  );
};

export default ResetPasswordScreen;
