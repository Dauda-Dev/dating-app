import React from 'react';
import styled from 'styled-components';
import { COLORS } from '../../constants';

interface InputProps {
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
}

const InputContainer = styled.div`
  margin-bottom: 20px;
  width: 100%;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 8px;
  color: ${COLORS.darkGray};
  font-size: 14px;
  font-weight: 600;
`;

const StyledInput = styled.input<{ hasError?: boolean }>`
  width: 100%;
  padding: 12px 16px;
  font-size: 16px;
  border: 2px solid ${props => props.hasError ? COLORS.danger : COLORS.lightGray};
  border-radius: 12px;
  transition: all 0.3s ease;
  background-color: ${COLORS.white};
  
  &:focus {
    outline: none;
    border-color: ${props => props.hasError ? COLORS.danger : COLORS.primary};
    box-shadow: 0 0 0 3px ${props => props.hasError ? 'rgba(255, 82, 82, 0.1)' : 'rgba(255, 107, 157, 0.1)'};
  }
  
  &:disabled {
    background-color: ${COLORS.background};
    cursor: not-allowed;
  }
  
  &::placeholder {
    color: ${COLORS.gray};
  }
`;

const ErrorText = styled.span`
  display: block;
  margin-top: 6px;
  color: ${COLORS.danger};
  font-size: 13px;
`;

const Input: React.FC<InputProps> = ({ 
  label, 
  error, 
  required,
  ...props 
}) => {
  return (
    <InputContainer>
      {label && (
        <Label>
          {label}
          {required && <span style={{ color: COLORS.danger }}> *</span>}
        </Label>
      )}
      <StyledInput hasError={!!error} {...props} />
      {error && <ErrorText>{error}</ErrorText>}
    </InputContainer>
  );
};

export default Input;
