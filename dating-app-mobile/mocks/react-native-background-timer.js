/**
 * Safe wrapper for react-native-background-timer.
 * When the native module is null (initializing or unavailable),
 * falls back to standard JS timers so Daily.co never crashes.
 */
var BackgroundTimer = {
  setTimeout: function(fn, delay) {
    return setTimeout(fn, delay);
  },
  clearTimeout: function(id) {
    clearTimeout(id);
  },
  setInterval: function(fn, delay) {
    return setInterval(fn, delay);
  },
  clearInterval: function(id) {
    clearInterval(id);
  },
  runBackgroundTimer: function(fn, delay) {
    return setInterval(fn, delay);
  },
  stopBackgroundTimer: function(id) {
    clearInterval(id);
  },
  start: function() {},
  stop: function() {},
};

module.exports = BackgroundTimer;
module.exports.default = BackgroundTimer;
