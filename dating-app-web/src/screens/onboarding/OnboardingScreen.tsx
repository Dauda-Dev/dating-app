import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { getMe, markOnboardingDone } from '../../store/slices/authSlice';
import { apiClient } from '../../services/apiClient';
import { COLORS, HOBBIES_OPTIONS, INTERESTS_OPTIONS } from '../../constants';

// ─── Animations ──────────────────────────────────────────────────────────────
const fadeIn = keyframes`from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); }`;
const slideIn = keyframes`from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); }`;
const pulse = keyframes`0%,100%{transform:scale(1)}50%{transform:scale(1.04)}`;

// ─── Layout ───────────────────────────────────────────────────────────────────
const Wrapper = styled.div`
  min-height: 100vh;
  background: linear-gradient(160deg, ${COLORS.gradientStart} 0%, ${COLORS.gradientEnd} 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const Card = styled.div`
  background: ${COLORS.white};
  border-radius: 32px;
  padding: 48px 40px 40px;
  width: 100%;
  max-width: 560px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.25);
  animation: ${fadeIn} 0.4s ease;
  position: relative;
  overflow: hidden;
`;

const ProgressBar = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 5px;
  background: ${COLORS.lightGray};
`;

const ProgressFill = styled.div<{ pct: number }>`
  height: 100%;
  width: ${p => p.pct}%;
  background: linear-gradient(90deg, ${COLORS.primary}, ${COLORS.secondary});
  border-radius: 0 4px 4px 0;
  transition: width 0.4s ease;
`;

const StepIndicator = styled.div`
  display: flex;
  justify-content: center;
  gap: 8px;
  margin-bottom: 32px;
`;

const Dot = styled.div<{ active: boolean; done: boolean }>`
  width: ${p => p.active ? '28px' : '8px'};
  height: 8px;
  border-radius: 4px;
  background: ${p => p.done ? COLORS.success : p.active ? COLORS.primary : COLORS.lightGray};
  transition: all 0.3s ease;
`;

const StepContent = styled.div`
  animation: ${slideIn} 0.35s ease;
`;

const Emoji = styled.div`
  font-size: 64px;
  text-align: center;
  margin-bottom: 12px;
  animation: ${pulse} 2s ease infinite;
`;

const StepTitle = styled.h2`
  font-size: 28px;
  font-weight: 800;
  color: ${COLORS.black};
  text-align: center;
  margin-bottom: 8px;
`;

const StepSubtitle = styled.p`
  font-size: 16px;
  color: ${COLORS.gray};
  text-align: center;
  margin-bottom: 28px;
  line-height: 1.5;
`;

// ─── Form elements ────────────────────────────────────────────────────────────
const TextArea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 14px;
  transition: border 0.2s;
  min-height: 120px;
  resize: vertical;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${COLORS.primary}; box-shadow: 0 0 0 3px rgba(255,107,157,0.12); }
`;

const InputField = styled.input`
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 14px;
  transition: border 0.2s;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${COLORS.primary}; box-shadow: 0 0 0 3px rgba(255,107,157,0.12); }
`;

const SelectField = styled.select`
  width: 100%;
  padding: 14px 16px;
  font-size: 16px;
  font-family: inherit;
  border: 2px solid ${COLORS.lightGray};
  border-radius: 14px;
  transition: border 0.2s;
  box-sizing: border-box;
  background: white;
  cursor: pointer;
  &:focus { outline: none; border-color: ${COLORS.primary}; box-shadow: 0 0 0 3px rgba(255,107,157,0.12); }
`;

const Label = styled.label`
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: ${COLORS.darkGray};
  margin-bottom: 8px;
`;

const FieldGroup = styled.div`
  margin-bottom: 20px;
`;

// ─── Tag picker ───────────────────────────────────────────────────────────────
const TagGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
  padding: 4px 2px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: ${COLORS.lightGray}; border-radius: 4px; }
`;

const TagChip = styled.button<{ selected: boolean }>`
  padding: 9px 16px;
  border-radius: 20px;
  border: 2px solid ${p => p.selected ? COLORS.primary : COLORS.lightGray};
  background: ${p => p.selected ? COLORS.primary : COLORS.white};
  color: ${p => p.selected ? COLORS.white : COLORS.darkGray};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
`;

const TagCount = styled.span`
  font-size: 13px;
  color: ${COLORS.gray};
  margin-top: 8px;
  display: block;
`;

// ─── Photo upload ─────────────────────────────────────────────────────────────

// Tinder-style 3x3 photo grid
const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
`;

const PhotoSlot = styled.label<{ hasPhoto: boolean; isFirst: boolean }>`
  position: relative;
  aspect-ratio: 2/3;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  background: ${COLORS.background};
  border: 2px dashed ${p => p.hasPhoto ? 'transparent' : p.isFirst ? COLORS.primary : COLORS.lightGray};
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  &:hover { border-color: ${COLORS.primary}; background: rgba(255,107,157,0.05); }
`;

const PhotoSlotImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PhotoSlotPlaceholder = styled.div<{ isFirst: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: ${p => p.isFirst ? COLORS.primary : COLORS.gray};
  font-size: ${p => p.isFirst ? '28px' : '22px'};
`;

const PhotoSlotAdd = styled.div`
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
  line-height: 1;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  pointer-events: none;
`;

const PhotoSlotDelete = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  width: 24px;
  height: 24px;
  background: rgba(0,0,0,0.55);
  border: none;
  border-radius: 50%;
  color: white;
  font-size: 13px;
  line-height: 1;
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
  letter-spacing: 0.5px;
  pointer-events: none;
`;

// ─── Navigation ───────────────────────────────────────────────────────────────
const NavRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 28px;
`;

const NavButton = styled.button<{ primary?: boolean; disabled?: boolean }>`
  flex: 1;
  padding: 15px;
  border-radius: 14px;
  border: none;
  font-size: 16px;
  font-weight: 700;
  cursor: ${p => p.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s;
  background: ${p => p.primary
    ? `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.gradientEnd} 100%)`
    : COLORS.background};
  color: ${p => p.primary ? COLORS.white : COLORS.darkGray};
  opacity: ${p => p.disabled ? 0.5 : 1};
  box-shadow: ${p => p.primary ? '0 6px 20px rgba(255,107,157,0.4)' : 'none'};
  &:hover:not(:disabled) { transform: translateY(-2px); }
  &:active:not(:disabled) { transform: translateY(0); }
`;

const SkipButton = styled.button`
  background: none;
  border: none;
  color: ${COLORS.gray};
  font-size: 14px;
  cursor: pointer;
  text-align: center;
  margin-top: 12px;
  width: 100%;
  &:hover { color: ${COLORS.darkGray}; }
`;

const ErrorText = styled.p`
  color: ${COLORS.danger};
  font-size: 14px;
  text-align: center;
  margin-top: 8px;
`;

// ─── Personality slider ────────────────────────────────────────────────────────
const TraitRow = styled.div`
  margin-bottom: 20px;
`;

const TraitLabel = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const TraitName = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${COLORS.darkGray};
`;

const TraitValue = styled.span`
  font-size: 14px;
  color: ${COLORS.primary};
  font-weight: 700;
`;

const Slider = styled.input`
  width: 100%;
  -webkit-appearance: none;
  height: 6px;
  border-radius: 3px;
  background: linear-gradient(
    to right,
    ${COLORS.primary} 0%,
    ${COLORS.primary} var(--val),
    ${COLORS.lightGray} var(--val),
    ${COLORS.lightGray} 100%
  );
  outline: none;
  cursor: pointer;
  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: ${COLORS.primary};
    box-shadow: 0 2px 8px rgba(255,107,157,0.5);
    cursor: pointer;
  }
`;

// ─── Types ─────────────────────────────────────────────────────────────────────
interface PhotoEntry {
  file: File;
  preview: string;
}

interface OnboardingData {
  bio: string;
  occupation: string;
  location: string;
  hobbies: string[];
  interests: string[];
  preferredGender: string;
  lookingFor: string;
  personality: {
    extroversion: number;
    agreeableness: number;
    conscientiousness: number;
    neuroticism: number;
    openness: number;
  };
  photos: PhotoEntry[]; // slot 0 = profile photo
}

const STEPS = [
  { id: 'photo', emoji: '📸', title: 'Add Your Photos', subtitle: 'Add up to 9 photos — more photos get 5× more matches' },
  { id: 'bio', emoji: '✍️', title: 'Tell Your Story', subtitle: 'A great bio gets 3× more matches' },
  { id: 'hobbies', emoji: '🎯', title: 'Your Hobbies', subtitle: 'Select what you love doing (pick at least 3)' },
  { id: 'interests', emoji: '💡', title: 'Your Interests', subtitle: 'What topics do you love talking about?' },
  { id: 'personality', emoji: '🧠', title: 'Your Personality', subtitle: 'Helps us find truly compatible matches' },
  { id: 'preferences', emoji: '💘', title: 'Your Preferences', subtitle: 'Tell us what you\'re looking for' },
];

// ─── Component ─────────────────────────────────────────────────────────────────
const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const stepKeyRef = useRef(0);

  const [data, setData] = useState<OnboardingData>({
    bio: '',
    occupation: '',
    location: '',
    hobbies: [],
    interests: [],
    preferredGender: 'any',
    lookingFor: 'serious_relationship',
    personality: {
      extroversion: 5,
      agreeableness: 5,
      conscientiousness: 5,
      neuroticism: 5,
      openness: 5,
    },
    photos: [],
  });

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;
  const currentStep = STEPS[step];

  const toggle = (field: 'hobbies' | 'interests', item: string) => {
    const list = data[field];
    setData({
      ...data,
      [field]: list.includes(item) ? list.filter(i => i !== item) : [...list, item],
    });
  };

  const setTrait = (trait: keyof typeof data.personality, val: number) => {
    setData({ ...data, personality: { ...data.personality, [trait]: val } });
  };

  const handlePhotoChange = (slotIndex: number) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so same file can be re-selected
    e.target.value = '';
    const reader = new FileReader();
    reader.onloadend = () => {
      setData(prev => {
        const next = [...prev.photos];
        next[slotIndex] = { file, preview: reader.result as string };
        return { ...prev, photos: next };
      });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = (slotIndex: number) => {
    setData(prev => {
      const next = [...prev.photos];
      next.splice(slotIndex, 1);
      return { ...prev, photos: next };
    });
  };

  const canProceed = () => {
    if (currentStep.id === 'hobbies') return data.hobbies.length >= 3;
    return true;
  };

  const handleNext = () => {
    setError('');
    if (!canProceed()) {
      setError('Please select at least 3 hobbies to continue.');
      return;
    }
    stepKeyRef.current++;
    if (step < totalSteps - 1) {
      setStep(s => s + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    setError('');
    stepKeyRef.current++;
    setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      // Upload profile photo (slot 0) first
      if (data.photos.length > 0) {
        try {
          await apiClient.uploadProfilePicture(data.photos[0].file);
        } catch {
          // Non-critical — continue
        }
      }

      // Upload remaining gallery photos (slots 1–8)
      for (let i = 1; i < data.photos.length; i++) {
        try {
          await apiClient.uploadGalleryPhoto(data.photos[i].file);
        } catch {
          // Non-critical
        }
      }

      // Save profile data
      await apiClient.updateProfile({
        bio: data.bio,
        occupation: data.occupation,
        location: data.location,
        hobbies: data.hobbies,
        interests: data.interests,
        lookingFor: data.lookingFor,
        personalityTraits: data.personality,
      });

      // Refresh user state then mark onboarding done in Redux (prevents redirect loop)
      await dispatch(getMe());
      dispatch(markOnboardingDone());
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to save profile. Please try again.');
      setSaving(false);
    }
  };

  const traitLabels: Record<keyof typeof data.personality, string> = {
    extroversion: 'Extroversion',
    agreeableness: 'Agreeableness',
    conscientiousness: 'Conscientiousness',
    neuroticism: 'Neuroticism',
    openness: 'Openness',
  };

  return (
    <Wrapper>
      <Card>
        <ProgressBar>
          <ProgressFill pct={progress} />
        </ProgressBar>

        <StepIndicator>
          {STEPS.map((s, i) => (
            <Dot key={s.id} active={i === step} done={i < step} />
          ))}
        </StepIndicator>

        <StepContent key={stepKeyRef.current}>
          <Emoji>{currentStep.emoji}</Emoji>
          <StepTitle>{currentStep.title}</StepTitle>
          <StepSubtitle>{currentStep.subtitle}</StepSubtitle>

          {/* ── Photos ── */}
          {currentStep.id === 'photo' && (
            <>
              <PhotoGrid>
                {Array.from({ length: 9 }).map((_, i) => {
                  const entry = data.photos[i];
                  const inputId = `photo-input-${i}`;
                  const isFirst = i === 0;
                  // Only show a slot if it has a photo OR it's the next empty slot (up to current count + 1)
                  const isAddable = !entry && i <= data.photos.length;
                  return (
                    <PhotoSlot
                      key={i}
                      htmlFor={isAddable ? inputId : undefined}
                      hasPhoto={!!entry}
                      isFirst={isFirst}
                    >
                      {entry ? (
                        <>
                          <PhotoSlotImg src={entry.preview} alt={`photo ${i + 1}`} />
                          {isFirst && <PhotoMainBadge>MAIN</PhotoMainBadge>}
                          <PhotoSlotDelete
                            type="button"
                            onClick={e => { e.preventDefault(); removePhoto(i); }}
                          >
                            ✕
                          </PhotoSlotDelete>
                        </>
                      ) : isAddable ? (
                        <>
                          <PhotoSlotPlaceholder isFirst={isFirst}>
                            <span>{isFirst ? '📷' : '+'}</span>
                            <span style={{ fontSize: '11px', marginTop: '2px' }}>
                              {isFirst ? 'Add photo' : 'Add'}
                            </span>
                          </PhotoSlotPlaceholder>
                          <PhotoSlotAdd>+</PhotoSlotAdd>
                        </>
                      ) : null}
                      {isAddable && (
                        <input
                          id={inputId}
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={handlePhotoChange(i)}
                        />
                      )}
                    </PhotoSlot>
                  );
                })}
              </PhotoGrid>
              <p style={{ textAlign: 'center', color: COLORS.gray, fontSize: '13px' }}>
                {data.photos.length} / 9 photos • JPG, PNG or WEBP • Max 5 MB each
              </p>
            </>
          )}

          {/* ── Bio ── */}
          {currentStep.id === 'bio' && (
            <>
              <FieldGroup>
                <Label>About me</Label>
                <TextArea
                  placeholder={`Hey, I'm ${user?.firstName || 'someone'} and I love...`}
                  value={data.bio}
                  onChange={e => setData({ ...data, bio: e.target.value })}
                  maxLength={500}
                />
                <small style={{ color: COLORS.gray, fontSize: '13px' }}>{data.bio.length}/500</small>
              </FieldGroup>
              <FieldGroup>
                <Label>Occupation</Label>
                <InputField
                  placeholder="Software Engineer, Teacher, Artist…"
                  value={data.occupation}
                  onChange={e => setData({ ...data, occupation: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup>
                <Label>Location</Label>
                <InputField
                  placeholder="City, Country"
                  value={data.location}
                  onChange={e => setData({ ...data, location: e.target.value })}
                />
              </FieldGroup>
            </>
          )}

          {/* ── Hobbies ── */}
          {currentStep.id === 'hobbies' && (
            <>
              <TagGrid>
                {HOBBIES_OPTIONS.map(h => (
                  <TagChip
                    key={h}
                    type="button"
                    selected={data.hobbies.includes(h)}
                    onClick={() => toggle('hobbies', h)}
                  >
                    {h}
                  </TagChip>
                ))}
              </TagGrid>
              <TagCount>{data.hobbies.length} selected (min. 3)</TagCount>
            </>
          )}

          {/* ── Interests ── */}
          {currentStep.id === 'interests' && (
            <>
              <TagGrid>
                {INTERESTS_OPTIONS.map(i => (
                  <TagChip
                    key={i}
                    type="button"
                    selected={data.interests.includes(i)}
                    onClick={() => toggle('interests', i)}
                  >
                    {i}
                  </TagChip>
                ))}
              </TagGrid>
              <TagCount>{data.interests.length} selected</TagCount>
            </>
          )}

          {/* ── Personality ── */}
          {currentStep.id === 'personality' && (
            <>
              {(Object.keys(data.personality) as Array<keyof typeof data.personality>).map(trait => {
                const val = data.personality[trait];
                const pct = ((val - 1) / 9) * 100;
                return (
                  <TraitRow key={trait}>
                    <TraitLabel>
                      <TraitName>{traitLabels[trait]}</TraitName>
                      <TraitValue>{val}/10</TraitValue>
                    </TraitLabel>
                    <Slider
                      type="range"
                      min={1}
                      max={10}
                      value={val}
                      style={{ '--val': `${pct}%` } as React.CSSProperties}
                      onChange={e => setTrait(trait, Number(e.target.value))}
                    />
                  </TraitRow>
                );
              })}
            </>
          )}

          {/* ── Preferences ── */}
          {currentStep.id === 'preferences' && (
            <>
              <FieldGroup>
                <Label>I'm interested in</Label>
                <SelectField
                  value={data.preferredGender}
                  onChange={e => setData({ ...data, preferredGender: e.target.value })}
                >
                  <option value="any">Everyone</option>
                  <option value="male">Men</option>
                  <option value="female">Women</option>
                  <option value="non-binary">Non-binary people</option>
                </SelectField>
              </FieldGroup>
              <FieldGroup>
                <Label>Looking for</Label>
                <SelectField
                  value={data.lookingFor}
                  onChange={e => setData({ ...data, lookingFor: e.target.value })}
                >
                  <option value="friendship">Friendship</option>
                  <option value="casual">Something casual</option>
                  <option value="serious_relationship">Serious relationship</option>
                  <option value="marriage">Marriage</option>
                </SelectField>
              </FieldGroup>
            </>
          )}

          {error && <ErrorText>{error}</ErrorText>}

          <NavRow>
            {step > 0 && (
              <NavButton type="button" onClick={handleBack}>← Back</NavButton>
            )}
            <NavButton
              type="button"
              primary
              onClick={handleNext}
              disabled={saving}
            >
              {saving
                ? 'Saving…'
                : step === totalSteps - 1
                  ? '🚀 Start Discovering!'
                  : 'Continue →'}
            </NavButton>
          </NavRow>

          {(currentStep.id === 'photo' || currentStep.id === 'interests' || currentStep.id === 'personality') && (
            <SkipButton type="button" onClick={handleNext}>
              Skip this step
            </SkipButton>
          )}
        </StepContent>
      </Card>

      <p style={{ color: 'rgba(255,255,255,0.7)', marginTop: '16px', fontSize: '13px' }}>
        Step {step + 1} of {totalSteps}
      </p>
      <button
        onClick={() => { dispatch(markOnboardingDone()); navigate('/', { replace: true }); }}
        style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}
      >
        Skip setup for now
      </button>
    </Wrapper>
  );
};

export default OnboardingScreen;
