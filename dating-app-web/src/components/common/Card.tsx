import React from 'react';
import styled from 'styled-components';
import { COLORS } from '../../constants';

interface CardProps {
  children: React.ReactNode;
  padding?: string;
  hover?: boolean;
  onClick?: () => void;
}

const StyledCard = styled.div<CardProps>`
  background-color: ${COLORS.white};
  border-radius: 16px;
  padding: ${props => props.padding || '24px'};
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: ${props => props.onClick ? 'pointer' : 'default'};
  
  ${props => props.hover && `
    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }
  `}
`;

const Card: React.FC<CardProps> = ({ children, ...props }) => {
  return <StyledCard {...props}>{children}</StyledCard>;
};

export default Card;
