import React from 'react';
import styled, { keyframes } from 'styled-components';
import { COLORS } from '../../constants';

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientEnd} 100%);
`;

const Logo = styled.div`
  font-size: 64px;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const Text = styled.p`
  margin-top: 20px;
  color: ${COLORS.white};
  font-size: 18px;
  font-weight: 500;
`;

const LoadingScreen: React.FC = () => {
  return (
    <Container>
      <Logo>💕</Logo>
      <Text>Loading...</Text>
    </Container>
  );
};

export default LoadingScreen;
