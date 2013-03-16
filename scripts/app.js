var active = false;
var logEl = document.getElementById('log');
var navlogEl = document.getElementById('navlog');
var commandLog = document.getElementById('commands');
var navdataLog = document.getElementById('navdata');
var message = document.getElementById('message');
var failed = false;

function clearLog() {
  logEl.textContent = "";
}

function log(msg) {
  logEl.textContent = msg;
//  logEl.scrollTop = 10000000;
}

function navlog(msg) {
  navlogEl.textContent = msg;
}

function onDroneConnected() {
  DRONE.Gamepad.enable();
  message.style.display = "none";
  instructions.style.display = "block";
}

function onDroneConnectionFailed() {
  if(!failed) {
    log("Connectioned failed - Are you attached to the Drone's Wifi network?");
    failed = true;
  }
}

DRONE.Gamepad.onConnected = function() {
  commandLog.style.display = "block";
  navdataLog.style.display = "block";
  DRONE.API.init(onDroneConnected, onDroneConnectionFailed);
};

// start the gamepad
gamepadSupport.init();
