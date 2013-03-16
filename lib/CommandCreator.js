// Constants

var REF_FLAGS = {
  emergency : (1 << 8),
  takeoff   : (1 << 9),
};

var PCMD_FLAGS = {
  progressive : (1 << 0),
};

var PCMD_ALIASES = {
  left             : {index: 1, invert: true},
  right            : {index: 1, invert: false},
  front            : {index: 2, invert: true},
  back             : {index: 2, invert: false},
  up               : {index: 3, invert: false},
  down             : {index: 3, invert: true},
  clockwise        : {index: 4, invert: false},
  counterClockwise : {index: 4, invert: true},
};

// from ARDrone_SDK_2_0/ControlEngine/iPhone/Release/ARDroneGeneratedTypes.h
var LED_ANIMATIONS = [
  'blinkGreenRed',
  'blinkGreen',
  'blinkRed',
  'blinkOrange',
  'snakeGreenRed',
  'fire',
  'standard',
  'red',
  'green',
  'redSnake',
  'blank',
  'rightMissile',
  'leftMissile',
  'doubleMissile',
  'frontLeftGreenOthersRed',
  'frontRightGreenOthersRed',
  'rearRightGreenOthersRed',
  'rearLeftGreenOthersRed',
  'leftGreenRightRed',
  'leftRedRightGreen',
  'blinkStandard',
];

// from ARDrone_SDK_2_0/ControlEngine/iPhone/Release/ARDroneGeneratedTypes.h
var ANIMATIONS = [
  'phiM30Deg',
  'phi30Deg',
  'thetaM30Deg',
  'theta30Deg',
  'theta20degYaw200deg',
  'theta20degYawM200deg',
  'turnaround',
  'turnaroundGodown',
  'yawShake',
  'yawDance',
  'phiDance',
  'thetaDance',
  'vzDance',
  'wave',
  'phiThetaMixed',
  'doublePhiThetaMixed',
  'flipAhead',
  'flipBehind',
  'flipLeft',
  'flipRight',
];

var DRONE = DRONE || {};
DRONE.CommandCreator = function () {}

DRONE.CommandCreator.prototype.raw = function(command, parts) {
  parts = (Array.isArray(parts))
    ? parts
    : Array.prototype.slice.call(arguments, 1);

  return new DRONE.Command(command, parts);
};

// Used for fly/land as well as emergency trigger/recover
DRONE.CommandCreator.prototype.ref = function(options) {
  options = options || {};

  var args = [0];

  if (options.fly) {
    args[0] = args[0] | REF_FLAGS.takeoff;
  }

  if (options.emergency) {
    args[0] = args[0] | REF_FLAGS.emergency;
  }

  return this.raw('REF', args);
};

// Used to fly the drone around
DRONE.CommandCreator.prototype.pcmd = function(options) {
  options = options || {};

  // flags, leftRight, frontBack, upDown, clockWise
  var args = [0, 0, 0, 0, 0];

  for (var key in options) {
    var alias = PCMD_ALIASES[key];
    var value = options[key];

    if (alias.invert) {
      value = -value;
    }

    args[alias.index] = value.toString();
    args[0]           = args[0] | PCMD_FLAGS.progressive;
  }

  return this.raw('PCMD', args);
};

DRONE.CommandCreator.prototype.config = function(name, value) {
  return this.raw('CONFIG', '"' + name + '"', '"' + value + '"');
};

DRONE.CommandCreator.prototype.animateLeds = function(name, hz, duration) {
  // Default animation
  name     = name || 'redSnake';
  hz       = (hz || 2).toString();
  duration = duration || 3;

  var animationId = LED_ANIMATIONS.indexOf(name);
  if (animationId < 0) {
    throw new Error('Unknown led animation: ' + name);
  }

  var params = [animationId, hz, duration].join(',');
  return this.config('leds:leds_anim', params);
};

DRONE.CommandCreator.prototype.animate = function(name, duration) {
  var animationId = ANIMATIONS.indexOf(name);
  if (animationId < 0) {
    throw new Error('Unknown animation: ' + name);
  }

  var params = [animationId, duration].join(',');
  return this.config('control:flight_anim', params);
};
