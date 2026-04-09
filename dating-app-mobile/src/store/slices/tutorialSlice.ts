import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TutorialState, TutorialStep } from '../../types';

const TUTORIAL_SEEN_KEY = '@ovally_tutorial_seen';

// Per-screen step definitions
export const TUTORIAL_STEPS: Record<string, TutorialStep[]> = {
  Discover: [
    { emoji: '🔥', title: 'Discover People', body: 'Swipe right to like someone, or left to pass.' },
    { emoji: '⭐', title: 'Super Like', body: 'Tap the star button to send a Super Like — they\'ll know you\'re really interested!' },
    { emoji: '📊', title: 'Daily Quota', body: 'You have a daily like quota. Upgrade to Premium for unlimited likes.' },
    { emoji: '😈', title: 'Match Steal', body: 'See someone\'s match you want? Use the Steal button to challenge them!' },
  ],
  Home: [
    { emoji: '📊', title: 'Your Dashboard', body: 'Track your matches, likes, and activity stats here.' },
    { emoji: '😈', title: 'Steal Requests', body: 'Incoming and outgoing steal requests appear in the Steals section.' },
    { emoji: '💎', title: 'Upgrade', body: 'Tap the crown icon to unlock Premium or Gold features.' },
  ],
  Matches: [
    { emoji: '🔴', title: 'New Matches', body: 'New matches appear as circular photos at the top — tap to view their profile.' },
    { emoji: '💬', title: 'Messages', body: 'Your active conversations are listed below. Tap to open the chat.' },
    { emoji: '📹', title: 'Video Call First', body: 'Complete a video call before your match fully unlocks! It keeps things safe.' },
  ],
  Chat: [
    { emoji: '💌', title: 'Send a Message', body: 'Type your message and press send to start the conversation.' },
    { emoji: '✓✓', title: 'Read Receipts', body: 'Double tick means your match has read your message.' },
    { emoji: '📹', title: 'Video Call', body: 'Tap the video icon to start a video call with your match.' },
  ],
};

const initialState: TutorialState = {
  hasSeenTutorial: false,
  isVisible: false,
  currentStep: 0,
  steps: [],
};

export const loadTutorialSeen = createAsyncThunk(
  'tutorial/loadSeen',
  async () => {
    const val = await AsyncStorage.getItem(TUTORIAL_SEEN_KEY);
    return val === 'true';
  }
);

export const markTutorialSeen = createAsyncThunk(
  'tutorial/markSeen',
  async () => {
    await AsyncStorage.setItem(TUTORIAL_SEEN_KEY, 'true');
  }
);

const tutorialSlice = createSlice({
  name: 'tutorial',
  initialState,
  reducers: {
    startTutorial(state, action: PayloadAction<string>) {
      const screenName = action.payload;
      state.steps = TUTORIAL_STEPS[screenName] ?? [];
      state.currentStep = 0;
      state.isVisible = state.steps.length > 0;
    },
    nextStep(state) {
      if (state.currentStep < state.steps.length - 1) {
        state.currentStep += 1;
      } else {
        state.isVisible = false;
        state.hasSeenTutorial = true;
      }
    },
    skipTutorial(state) {
      state.isVisible = false;
      state.hasSeenTutorial = true;
    },
    reopenTutorial(state, action: PayloadAction<string>) {
      const screenName = action.payload;
      state.steps = TUTORIAL_STEPS[screenName] ?? [];
      state.currentStep = 0;
      state.isVisible = state.steps.length > 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTutorialSeen.fulfilled, (state, action) => {
        state.hasSeenTutorial = action.payload;
      })
      .addCase(markTutorialSeen.fulfilled, (state) => {
        state.hasSeenTutorial = true;
      });
  },
});

export const { startTutorial, nextStep, skipTutorial, reopenTutorial } = tutorialSlice.actions;
export default tutorialSlice.reducer;
