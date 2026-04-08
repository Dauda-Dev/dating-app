/**
 * Mock for @daily-co/react-native-daily-js
 *
 * This mock is used in EAS release builds to prevent the Daily.co SDK from
 * running its internal recursive setTimeout loop at module-parse time, which
 * causes a "Maximum call stack size exceeded" crash on startup.
 *
 * The VideoCallScreen already wraps its Daily.co usage in a try/catch inside
 * useEffect, so when this mock throws (or returns stubs that don't work),
 * the screen gracefully shows an alert and navigates back.
 *
 * For production video call support, remove this mock and configure
 * proper native build with camera/microphone permissions.
 */

const noopCallObject = {
  on: function() { return noopCallObject; },
  off: function() { return noopCallObject; },
  join: function() { return Promise.reject(new Error('Daily.co not available in this build')); },
  leave: function() { return Promise.resolve(); },
  destroy: function() { return Promise.resolve(); },
  participants: function() { return {}; },
  setLocalAudio: function() { return Promise.resolve(); },
  setLocalVideo: function() { return Promise.resolve(); },
};

const Daily = {
  createCallObject: function() {
    return noopCallObject;
  },
};

module.exports = Daily;
module.exports.default = Daily;
module.exports.DailyMediaView = null;
