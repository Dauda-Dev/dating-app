import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import discoveryReducer from './slices/discoverySlice';
import matchReducer from './slices/matchSlice';
import stealReducer from './slices/stealSlice';
import chatReducer from './slices/chatSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    discovery: discoveryReducer,
    matches: matchReducer,
    steals: stealReducer,
    chat: chatReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
