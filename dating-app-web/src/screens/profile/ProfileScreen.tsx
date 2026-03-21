import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMe } from '../../store/slices/authSlice';
import { apiClient } from '../../services/apiClient';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { COLORS } from '../../constants';

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 700;
  color: ${COLORS.black};
`;

const ProfileCard = styled(Card)`
  padding: 40px;
`;

const ProfileHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 32px;
  margin-bottom: 32px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }
`;

const ProfileInfo = styled.div`
  flex: 1;
`;

const Name = styled.h2`
  font-size: 32px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 8px;
`;

const Details = styled.p`
  font-size: 18px;
  color: ${COLORS.gray};
  margin-bottom: 16px;
`;

const Tier = styled.div`
  display: inline-block;
  padding: 8px 16px;
  background: linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.warning} 100%);
  color: ${COLORS.white};
  border-radius: 20px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
`;

const Section = styled.div`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h3`
  font-size: 20px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 16px;
`;

const Bio = styled.p`
  font-size: 16px;
  color: ${COLORS.darkGray};
  line-height: 1.6;
`;

const Tags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const Tag = styled.span`
  padding: 8px 16px;
  background-color: ${COLORS.background};
  border-radius: 20px;
  font-size: 14px;
  color: ${COLORS.darkGray};
  font-weight: 500;
`;

const PersonalityGrid = styled.div`
  display: grid;
  gap: 16px;
`;

const PersonalityItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const PersonalityLabel = styled.span`
  flex: 0 0 140px;
  font-size: 14px;
  color: ${COLORS.darkGray};
  font-weight: 600;
`;

const PersonalityBar = styled.div`
  flex: 1;
  height: 8px;
  background-color: ${COLORS.lightGray};
  border-radius: 4px;
  overflow: hidden;
`;

const PersonalityFill = styled.div<{ value: number }>`
  height: 100%;
  width: ${props => props.value * 10}%;
  background: linear-gradient(90deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%);
  transition: width 0.3s ease;
`;

// ─── Photo Grid ─────────────────────────────────────────────────────────────
const PhotoSection = styled.div`
  margin-bottom: 32px;
`;

const PhotoSectionTitle = styled.h3`
  font-size: 18px;
  font-weight: 700;
  color: ${COLORS.black};
  margin-bottom: 14px;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
`;

const PhotoSlot = styled.label<{ hasPhoto: boolean; isFirst: boolean }>`
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 14px;
  overflow: hidden;
  cursor: ${p => p.hasPhoto ? 'default' : 'pointer'};
  background: ${COLORS.background};
  border: 2px dashed ${p => p.hasPhoto ? 'transparent' : p.isFirst ? COLORS.primary : COLORS.lightGray};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  &:hover { border-color: ${COLORS.primary}; }
`;

const PhotoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PhotoPlaceholder = styled.div<{ isFirst: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: ${p => p.isFirst ? COLORS.primary : COLORS.gray};
  font-size: ${p => p.isFirst ? '26px' : '20px'};
`;

const PhotoAddBtn = styled.div`
  position: absolute;
  bottom: 8px;
  right: 8px;
  width: 26px;
  height: 26px;
  background: ${COLORS.primary};
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  font-weight: 700;
  pointer-events: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
`;

const PhotoDeleteBtn = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  background: rgba(0,0,0,0.5);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  transition: background 0.15s;
  &:hover { background: ${COLORS.danger}; }
`;

const PhotoMainBadge = styled.div`
  position: absolute;
  bottom: 8px;
  left: 8px;
  background: ${COLORS.primary};
  color: white;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 8px;
  pointer-events: none;
`;

const PhotoUploadStatus = styled.p`
  font-size: 13px;
  color: ${COLORS.gray};
  text-align: center;
  margin-top: 10px;
`;

const ProfileScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const [photoStatus, setPhotoStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  if (!user) {
    return <Container><Title>Loading...</Title></Container>;
  }

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const getInitials = () => {
    const first = user.firstName?.[0] ?? '';
    const last = user.lastName?.[0] ?? '';
    return (first + last).toUpperCase() || '?';
  };

  // Build ordered photos: profilePhoto first, then gallery photos
  const allPhotos: string[] = [
    ...(user.profilePhoto ? [user.profilePhoto] : []),
    ...(user.profile?.photos || []),
  ];

  const handlePhotoUpload = async (slotIndex: number, file: File) => {
    if (!file) return;
    setUploading(true);
    setPhotoStatus('Uploading…');
    try {
      if (slotIndex === 0) {
        await apiClient.uploadProfilePicture(file);
        setPhotoStatus('Profile photo updated!');
      } else {
        await apiClient.uploadGalleryPhoto(file);
        setPhotoStatus('Photo added!');
      }
      await dispatch(getMe());
    } catch (err: any) {
      setPhotoStatus(err.response?.data?.error || 'Upload failed. Try again.');
    } finally {
      setUploading(false);
      setTimeout(() => setPhotoStatus(''), 3000);
    }
  };

  const handlePhotoDelete = async (photoUrl: string, isProfilePhoto: boolean) => {
    if (!window.confirm('Remove this photo?')) return;
    setUploading(true);
    setPhotoStatus('Removing…');
    try {
      if (isProfilePhoto) {
        // Replace profile photo with next gallery photo if available
        const nextPhoto = user.profile?.photos?.[0];
        if (nextPhoto) {
          await apiClient.uploadProfilePicture(new File([], '')); // server will handle
        }
        await apiClient.deleteGalleryPhoto(photoUrl);
      } else {
        await apiClient.deleteGalleryPhoto(photoUrl);
      }
      await dispatch(getMe());
      setPhotoStatus('Photo removed.');
    } catch {
      setPhotoStatus('Remove failed.');
    } finally {
      setUploading(false);
      setTimeout(() => setPhotoStatus(''), 3000);
    }
  };

  return (
    <Container>
      <Header>
        <Title>👤 My Profile</Title>
        <Button onClick={() => navigate('/profile/edit')}>
          Edit Profile
        </Button>
      </Header>

      <ProfileCard>
        {/* ── Photo Grid ── */}
        <PhotoSection>
          <PhotoSectionTitle>My Photos ({allPhotos.length}/9)</PhotoSectionTitle>
          <PhotoGrid>
            {Array.from({ length: 9 }).map((_, i) => {
              const photoUrl = allPhotos[i];
              const isFirst = i === 0;
              const isAddable = !photoUrl && i <= allPhotos.length;
              const inputId = `profile-photo-${i}`;

              return (
                <PhotoSlot key={i} htmlFor={isAddable ? inputId : undefined} hasPhoto={!!photoUrl} isFirst={isFirst}>
                  {photoUrl ? (
                    <>
                      <PhotoImg src={photoUrl} alt={`photo ${i + 1}`} />
                      {isFirst && <PhotoMainBadge>MAIN</PhotoMainBadge>}
                      <PhotoDeleteBtn
                        type="button"
                        disabled={uploading}
                        onClick={e => { e.preventDefault(); handlePhotoDelete(photoUrl, isFirst); }}
                      >
                        ✕
                      </PhotoDeleteBtn>
                    </>
                  ) : isAddable ? (
                    <>
                      <PhotoPlaceholder isFirst={isFirst}>
                        <span>{isFirst ? '📷' : '+'}</span>
                        <span style={{ fontSize: '11px' }}>{isFirst ? 'Add photo' : 'Add'}</span>
                      </PhotoPlaceholder>
                      <PhotoAddBtn>+</PhotoAddBtn>
                    </>
                  ) : null}
                  {isAddable && (
                    <input
                      id={inputId}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploading}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(i, file);
                        e.target.value = '';
                      }}
                    />
                  )}
                </PhotoSlot>
              );
            })}
          </PhotoGrid>
          {photoStatus && <PhotoUploadStatus>{photoStatus}</PhotoUploadStatus>}
        </PhotoSection>

        <ProfileHeader>
          <ProfileInfo>
            <Name>{user.firstName} {user.lastName}</Name>
            <Details>
              {user.dateOfBirth ? `${calculateAge(user.dateOfBirth)} years old • ` : ''}{user.profile?.location || 'Location not set'}
            </Details>
            <Tier>{user.subscriptionTier || 'free'} Member</Tier>
          </ProfileInfo>
        </ProfileHeader>

        {user.profile?.bio && (
          <Section>
            <SectionTitle>About Me</SectionTitle>
            <Bio>{user.profile.bio}</Bio>
          </Section>
        )}

        {user.profile?.hobbies && user.profile.hobbies.length > 0 && (
          <Section>
            <SectionTitle>Hobbies</SectionTitle>
            <Tags>
              {user.profile.hobbies.map((hobby, index) => (
                <Tag key={index}>{hobby}</Tag>
              ))}
            </Tags>
          </Section>
        )}

        {user.profile?.interests && user.profile.interests.length > 0 && (
          <Section>
            <SectionTitle>Interests</SectionTitle>
            <Tags>
              {user.profile.interests.map((interest, index) => (
                <Tag key={index}>{interest}</Tag>
              ))}
            </Tags>
          </Section>
        )}

        {user.profile?.personality && (
          <Section>
            <SectionTitle>Personality Traits</SectionTitle>
            <PersonalityGrid>
              <PersonalityItem>
                <PersonalityLabel>Openness</PersonalityLabel>
                <PersonalityBar>
                  <PersonalityFill value={user.profile.personality.openness} />
                </PersonalityBar>
              </PersonalityItem>
              <PersonalityItem>
                <PersonalityLabel>Conscientiousness</PersonalityLabel>
                <PersonalityBar>
                  <PersonalityFill value={user.profile.personality.conscientiousness} />
                </PersonalityBar>
              </PersonalityItem>
              <PersonalityItem>
                <PersonalityLabel>Extraversion</PersonalityLabel>
                <PersonalityBar>
                  <PersonalityFill value={user.profile.personality.extraversion} />
                </PersonalityBar>
              </PersonalityItem>
              <PersonalityItem>
                <PersonalityLabel>Agreeableness</PersonalityLabel>
                <PersonalityBar>
                  <PersonalityFill value={user.profile.personality.agreeableness} />
                </PersonalityBar>
              </PersonalityItem>
              <PersonalityItem>
                <PersonalityLabel>Emotional Stability</PersonalityLabel>
                <PersonalityBar>
                  <PersonalityFill value={10 - user.profile.personality.neuroticism} />
                </PersonalityBar>
              </PersonalityItem>
            </PersonalityGrid>
          </Section>
        )}
      </ProfileCard>
    </Container>
  );
};

export default ProfileScreen;
