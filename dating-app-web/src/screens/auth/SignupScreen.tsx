import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { signup, clearError } from '../../store/slices/authSlice';
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
  max-width: 500px;
  width: 100%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow-y: auto;
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

const Row = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

const ErrorMessage = styled.div`
  background-color: #fee;
  color: ${COLORS.danger};
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  font-size: 14px;
`;

const SigninLink = styled.div`
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

const GenderSelect = styled.div`
  margin-bottom: 24px;
  
  label {
    display: block;
    margin-bottom: 8px;
    font-weight: 500;
    color: ${COLORS.darkGray};
    font-size: 14px;
  }
  
  select {
    width: 100%;
    padding: 12px 16px;
    border: 2px solid ${COLORS.lightGray};
    border-radius: 12px;
    font-size: 16px;
    background: ${COLORS.white};
    color: ${COLORS.darkGray};
    cursor: pointer;
    transition: all 0.3s ease;
    
    &:focus {
      outline: none;
      border-color: ${COLORS.primary};
      box-shadow: 0 0 0 3px rgba(255, 107, 157, 0.1);
    }
  }
`;

const ErrorText = styled.span`
  color: ${COLORS.danger};
  font-size: 12px;
  margin-top: 4px;
  display: block;
`;

const SignupScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector(state => state.auth);
  
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'non-binary';
  }>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.dateOfBirth) {
      newErrors.dateOfBirth = 'Date of birth is required';
    } else {
      const age = new Date().getFullYear() - new Date(formData.dateOfBirth).getFullYear();
      if (age < 18) {
        newErrors.dateOfBirth = 'You must be at least 18 years old';
      }
    }
    
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
    
    if (!validateForm()) return;
    
    try {
      const result = await dispatch(signup(formData));
      if (signup.fulfilled.match(result)) {
        navigate('/verify-email');
      }
    } catch (err) {
      // Error will be shown via the error state
      console.error('Signup error:', err);
    }
  };

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [field]: e.target.value });
    if (error) dispatch(clearError());
  };

  return (
    <Container>
      <Card>
        <Logo>💕</Logo>
        <Title>Create Account</Title>
        <Subtitle>Start your dating journey today</Subtitle>
        
        {error && <ErrorMessage>{error}</ErrorMessage>}
        
        <Form onSubmit={handleSubmit}>
          <Row>
            <Input
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange('firstName')}
              error={errors.firstName}
              required
            />
            
            <Input
              label="Last Name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange('lastName')}
              error={errors.lastName}
              required
            />
          </Row>
          
          <Input
            type="email"
            label="Email"
            placeholder="your@email.com"
            value={formData.email}
            onChange={handleChange('email')}
            error={errors.email}
            required
          />
          
          <Input
            type="date"
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChange={handleChange('dateOfBirth')}
            error={errors.dateOfBirth}
            required
          />
          
          <GenderSelect>
            <label>Gender *</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'non-binary' })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
            </select>
            {errors.gender && <ErrorText>{errors.gender}</ErrorText>}
          </GenderSelect>
          
          <Input
            type="password"
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={handleChange('password')}
            error={errors.password}
            required
          />
          
          <Input
            type="password"
            label="Confirm Password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={errors.confirmPassword}
            required
          />

          <Button type="submit" fullWidth disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Sign Up'}
          </Button>
        </Form>        <SigninLink>
          Already have an account? <Link to="/login">Login</Link>
        </SigninLink>
      </Card>
    </Container>
  );
};

export default SignupScreen;
