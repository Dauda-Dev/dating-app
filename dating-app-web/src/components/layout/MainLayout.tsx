import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { logout } from '../../store/slices/authSlice';
import { COLORS } from '../../constants';

const LayoutContainer = styled.div`
  display: flex;
  min-height: 100vh;
  background-color: ${COLORS.background};
`;

const Sidebar = styled.aside<{ isOpen: boolean }>`
  width: 280px;
  background: linear-gradient(180deg, ${COLORS.primary} 0%, ${COLORS.gradientEnd} 100%);
  padding: 24px;
  display: flex;
  flex-direction: column;
  position: fixed;
  height: 100vh;
  left: 0;
  top: 0;
  transition: transform 0.3s ease;
  z-index: 100;
  
  @media (max-width: 768px) {
    transform: translateX(${props => props.isOpen ? '0' : '-100%'});
  }
`;

const Logo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
  color: ${COLORS.white};
  font-size: 28px;
  font-weight: 700;
`;

const Nav = styled.nav`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const NavLink = styled(Link)<{ $isActive: boolean }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 12px;
  color: ${COLORS.white};
  text-decoration: none;
  font-weight: 500;
  transition: all 0.3s ease;
  background-color: ${props => props.$isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.15);
    transform: translateX(4px);
  }
`;

const UserSection = styled.div`
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  margin-top: auto;
`;

const UserInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: ${COLORS.white};
`;

const Avatar = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.secondary} 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
`;

const UserName = styled.div`
  font-weight: 600;
  font-size: 16px;
`;

const LogoutButton = styled.button`
  width: 100%;
  padding: 12px;
  background-color: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  color: ${COLORS.white};
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background-color: rgba(255, 255, 255, 0.2);
  }
`;

const MainContent = styled.main`
  flex: 1;
  margin-left: 280px;
  padding: 32px;
  
  @media (max-width: 768px) {
    margin-left: 0;
    padding: 20px;
  }
`;

const MobileMenuButton = styled.button`
  display: none;
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 101;
  background: ${COLORS.primary};
  border: none;
  border-radius: 12px;
  padding: 12px;
  color: ${COLORS.white};
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  display: none;
  
  @media (max-width: 768px) {
    display: ${props => props.isOpen ? 'block' : 'none'};
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }
`;

const MainLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/discovery', label: 'Discover', icon: '🔍' },
    { path: '/matches', label: 'Matches', icon: '💘' },
    { path: '/steals', label: 'Steals', icon: '⚡' },
    { path: '/profile', label: 'Profile', icon: '👤' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ];

  const handleLogout = async () => {
    await dispatch(logout());
    navigate('/login');
  };

  const getInitials = () => {
    if (!user || !user.firstName || !user.lastName) return '?';
    return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
  };

  return (
    <LayoutContainer>
      <MobileMenuButton onClick={() => setSidebarOpen(!sidebarOpen)}>
        ☰
      </MobileMenuButton>
      
      <Overlay isOpen={sidebarOpen} onClick={() => setSidebarOpen(false)} />
      
      <Sidebar isOpen={sidebarOpen}>
        <Logo>
          💕 Dating App
        </Logo>
        
        <Nav>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              $isActive={location.pathname === item.path}
              onClick={() => setSidebarOpen(false)}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </Nav>
        
        <UserSection>
          <UserInfo>
            <Avatar>{getInitials()}</Avatar>
            <UserName>
              {user?.firstName} {user?.lastName}
            </UserName>
          </UserInfo>
          <LogoutButton onClick={handleLogout}>
            Logout
          </LogoutButton>
        </UserSection>
      </Sidebar>
      
      <MainContent>
        <Outlet />
      </MainContent>
    </LayoutContainer>
  );
};

export default MainLayout;
