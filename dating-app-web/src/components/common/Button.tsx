import React from 'react';
import styled from 'styled-components';
import { COLORS } from '../../constants';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

const StyledButton = styled.button<ButtonProps>`
  padding: ${props => {
    switch (props.size) {
      case 'small': return '8px 16px';
      case 'large': return '16px 32px';
      default: return '12px 24px';
    }
  }};
  font-size: ${props => {
    switch (props.size) {
      case 'small': return '14px';
      case 'large': return '18px';
      default: return '16px';
    }
  }};
  font-weight: 600;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  width: ${props => props.fullWidth ? '100%' : 'auto'};
  opacity: ${props => props.disabled ? 0.5 : 1};
  pointer-events: ${props => props.disabled ? 'none' : 'auto'};
  
  ${props => {
    switch (props.variant) {
      case 'secondary':
        return `
          background-color: ${COLORS.secondary};
          color: ${COLORS.white};
          &:hover {
            background-color: #45b8b0;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(78, 205, 196, 0.3);
          }
        `;
      case 'outline':
        return `
          background-color: transparent;
          color: ${COLORS.primary};
          border: 2px solid ${COLORS.primary};
          &:hover {
            background-color: ${COLORS.primary};
            color: ${COLORS.white};
            transform: translateY(-2px);
          }
        `;
      case 'danger':
        return `
          background-color: ${COLORS.danger};
          color: ${COLORS.white};
          &:hover {
            background-color: #e63946;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 82, 82, 0.3);
          }
        `;
      default:
        return `
          background: linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.gradientEnd} 100%);
          color: ${COLORS.white};
          &:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(255, 107, 157, 0.4);
          }
        `;
    }
  }}
  
  &:active {
    transform: translateY(0);
  }
`;

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  type = 'button',
  ...props 
}) => {
  return (
    <StyledButton variant={variant} size={size} type={type} {...props}>
      {children}
    </StyledButton>
  );
};

export default Button;
