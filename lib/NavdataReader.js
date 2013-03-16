var DRONE = DRONE || {};
DRONE.NavdataReader = function (buffer) {
  this.buffer = buffer;
  // NavdataReader inherits from Reader
  // Reader(buffer)
};

DRONE.NavdataReader.prototype.int16 = function() {
  return this.int16LE();
};

DRONE.NavdataReader.prototype.uint16 = function() {
  return this.uint16LE();
};

DRONE.NavdataReader.prototype.int32 = function() {
  return this.int32LE();
};

DRONE.NavdataReader.prototype.uint32 = function() {
  return this.uint32LE();
};

DRONE.NavdataReader.prototype.float32 = function() {
  return this.float32LE();
};

DRONE.NavdataReader.prototype.char = function() {
  return this._buffer[ this._offset ];
};

DRONE.NavdataReader.prototype.bool = function() {
  return !!this.char();
};

DRONE.NavdataReader.prototype.matrix33 = function() {
  return {
    m11 : this.float32(),
    m12 : this.float32(),
    m13 : this.float32(),
    m21 : this.float32(),
    m22 : this.float32(),
    m23 : this.float32(),
    m31 : this.float32(),
    m32 : this.float32(),
    m33 : this.float32()
  };
};

DRONE.NavdataReader.prototype.vector31 = function() {
  return {
    x : this.float32(),
    y : this.float32(),
    z : this.float32()
  };
};

DRONE.NavdataReader.prototype.screenPoint = function() {
  return {
    x : this.int32(),
    y : this.int32()
  };
};

DRONE.NavdataReader.prototype.mask32 = function(mask) {
  var value = this.uint32();
  return this._mask(mask, value);
};

DRONE.NavdataReader.prototype._mask = function(mask, value) {
  var flags = {};
  for (var flag in mask) {
    flags[flag] = (value & mask[flag])
      ? 1
      : 0;
  }

  return flags;
};
