/**
 * Safe wrapper for react-native-background-timer.
 *
 * CRITICAL: We capture the original JS timer functions here, at module-parse
 * time, BEFORE @daily-co/react-native-daily-js overrides global.setTimeout on
 * Android with BackgroundTimer.setTimeout. If we called global.setTimeout
 * inside these functions instead, Daily.js's override would call back into
 * BackgroundTimer.setTimeout -> global.setTimeout -> BackgroundTimer.setTimeout
 * creating an infinite recursive loop -> "Maximum call stack size exceeded".
 */
var _setTimeout = global.setTimeout;
var _clearTimeout = global.clearTimeout;
var _setInterval = global.setInterval;
var _clearInterval = global.clearInterval;

var BackgroundTimer = {
  setTimeout: function(fn, delay) {
    return _setTimeout(fn, delay);
  },
  clearTimeout: function(id) {
    _clearTimeout(id);
  },
  setInterval: function(fn, delay) {
    return _setInterval(fn, delay);
  },
  clearInterval: function(id) {
    _clearInterval(id);
  },
  runBackgroundTimer: function(fn, delay) {
    return _setInterval(fn, delay);
  },
  stopBackgroundTimer: function(id) {
    _clearInterval(id);
  },
  start: function() {},
  stop: function() {},
};

module.exports = BackgroundTimer;
module.exports.default = BackgroundTimer;
