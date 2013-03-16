Reader = function(options) {
  if (typeof options === "ArrayBuffer") {
    options = {buffer: new Uint8Array(options)};
  }

  options = options || {};

  this._buffer = options.buffer || new Uint8Array(0);
  this._compact = options.compact || false;
  this._paused = false;
  this._setOffset(options.offset || 0);
}

Reader.prototype.write = function(newBuffer) {
  var bytesAhead = this.bytesAhead();

  // existing buffer has enough space in the beginning?
  var reuseBuffer = (this._offset >= newBuffer.length);

  if (reuseBuffer) {
    // move unread bytes forward to make room for the new
    this._buffer.set(new Uint8Array(this._buffer.slice(this._offset)), this._offset - newBuffer.byteLength);
    this._moveOffset(- newBuffer.byteLength);

    // add the new bytes at the end
    this._buffer.set(new Uint8Array(newBuffer), this._buffer.length - newBuffer.length);
    if (this._compact) {
      this.compact();
    }
  } else {
    var oldBuffer = this._buffer;

    // grow a new buffer that can hold both
    this._buffer = new Uint8Array(bytesAhead + newBuffer.byteLength);

    // copy the old and new buffer into it
    this._buffer.set(new Uint8Array(oldBuffer.buffer.slice(this._offset)));
    this._buffer.set(new Uint8Array(newBuffer), bytesAhead);

    this._setOffset(0);
  }

  return !this._paused;
};

Reader.prototype.pause = function() {
  this._paused = true;
};

Reader.prototype.resume = function() {
  this._paused = false;
};

Reader.prototype.bytesAhead = function() {
  return this._buffer.length - this._offset;
};

Reader.prototype.bytesBuffered = function() {
  return this._buffer.length;
};

Reader.prototype.uint8 = function() {
  return this._buffer[this._moveOffset(1)];
};

Reader.prototype.int8 = function() {
  var unsigned = this.uint8();
  return (unsigned & 0x80) ? ((0xff - unsigned + 1) * -1) : unsigned;
};

Reader.prototype.uint16BE = function() {
  this._moveOffset(2);
  return (this._buffer[this._offset - 2] << 8) | this._buffer[this._offset - 1];
};

Reader.prototype.int16BE = function() {
  var unsigned = this.uint16BE();
  return unsigned & 0x8000 ? (0xffff - unsigned + 1) * -1 : unsigned;
};

Reader.prototype.uint16LE = function() {
  this._moveOffset(2);
  return this._buffer[this._offset - 2] | this._buffer[this._offset - 1] << 8;
};

Reader.prototype.int16LE = function() {
  var unsigned = this.uint16LE();
  return unsigned & 0x8000 ? (0xffff - unsigned + 1) * -1 : unsigned;
};

Reader.prototype.uint32BE = function() {
  this._moveOffset(4);

  return (
    this._buffer[this._offset - 3] << 16 |
    this._buffer[this._offset - 2] <<  8 |
    this._buffer[this._offset - 1] +
    (this._buffer[this._offset - 4] << 24)
  ) >>> 0;
};

Reader.prototype.int32BE = function() {
  var unsigned = this.uint32BE();
  return unsigned & 0x80000000 ? (0xffffffff - unsigned + 1) * -1 : unsigned;
};

Reader.prototype.uint32LE = function() {
  this._moveOffset(4);

  return (
    this._buffer[this._offset - 2] << 16 |
    this._buffer[this._offset - 3] <<  8 |
    this._buffer[this._offset - 4] +
    (this._buffer[this._offset - 1] << 24)
  ) >>> 0;
};

Reader.prototype.int32LE = function() {
  var unsigned = this.uint32LE();
  return unsigned & 0x80000000 ? (0xffffffff - unsigned + 1) * -1 : unsigned;
};

Reader.prototype.float32BE = function() {
  return this._ieee754(this._moveOffset(4), true, 23, 4);
};

Reader.prototype.float32LE = function() {
  return this._ieee754(this._moveOffset(4), false, 23, 4);
};

Reader.prototype.double64BE = function() {
  return this._ieee754(this._moveOffset(8), true, 52, 8);
};

Reader.prototype.double64LE = function() {
  return this._ieee754(this._moveOffset(8), false, 52, 8);
};

Reader.prototype._ieee754 = function(offset, isBE, mLen, nBytes) {
  var e, m,
      eLen = nBytes * 8 - mLen - 1,
      eMax = (1 << eLen) - 1,
      eBias = eMax >> 1,
      nBits = -7,
      i = isBE ? 0 : (nBytes - 1),
      d = isBE ? 1 : -1,
      s = this._buffer[offset + i];

  i += d;

  e = s & ((1 << (-nBits)) - 1);
  s >>= (-nBits);
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + this._buffer[offset + i], i += d, nBits -= 8);

  m = e & ((1 << (-nBits)) - 1);
  e >>= (-nBits);
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + this._buffer[offset + i], i += d, nBits -= 8);

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : ((s ? -1 : 1) * Infinity);
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

Reader.prototype.ascii = function(bytes) {
  return this._string('ascii', bytes);
};

Reader.prototype.utf8 = function(bytes) {
  return this._string('utf8', bytes);
};

Reader.prototype._string = function(encoding, bytes) {
  var nullTerminated = (bytes === undefined);
  if (nullTerminated) {
    bytes = this._nullDistance();
  }

  var offset = this._offset;
  this._moveOffset(bytes);

  var value = null;
  var encoding = String(encoding || 'utf8').toLowerCase();
  switch (encoding) {
  case 'hex':
      return this.hexSlice(start, end);

  case 'utf8':
  case 'utf-8':
      return this.utf8Slice(start, end);

  case 'ascii':
      value = this._asciiSlice(offset, this._offset);
      break;

      /*case 'binary':
      return this.binarySlice(start, end);

    case 'base64':
      return this.base64Slice(start, end);

    case 'ucs2':
    case 'ucs-2':
      return this.ucs2Slice(start, end);*/

  default:
      throw new Error('Unknown encoding');
  }

  //var value = this._buffer.toString(encoding, offset, this._offset);

  if (nullTerminated) {
    this._moveOffset(1);
  }

  return value;
};

Reader.prototype._asciiSlice = function (start, end) {
  for (var string = "", i = start; i < end; i++) {
    string += String.fromCharCode(this._buffer[i]);
  }
  return string;
}

Reader.prototype._nullDistance = function() {
  for (var i = this._offset; i < this._buffer.length; i++) {
    var byte = this._buffer[i];
    if (byte === 0) {
      return i - this._offset;
    }
  }
};

Reader.prototype.buffer = function(bytes) {
  this._moveOffset(bytes);
  return this._buffer.buffer.slice(this._offset - bytes, this._offset);
};

Reader.prototype.skip = function(bytes) {
  if (bytes < 0) {
    alert('tried to skip outsite of the buffer');
  }
  this._moveOffset(bytes);
};

Reader.prototype.compact = function() {
  if (this.offset < 1) {
    return;
  }

  this._buffer = this._buffer.slice(this._offset);
  this._setOffset(0);
};

Reader.prototype.end = function(newBuffer) {
  if (undefined !== newBuffer) {
    this.write(newBuffer);
  }
  this.writable = false;
  if (0 === this.bytesAhead()) {
    this.destroy();
  }
  // performance hack: switch to slightly slower version of _setOffset()
  this._setOffset = this._setOffsetNotWritable;
  return true;
};

Reader.prototype.destroy = function() {
  this._buffer = null;
  this._offset = 0;
  this.writable = false;
};

Reader.prototype._setOffset = function(offset) {
  this._offset = offset;
};

Reader.prototype._setOffsetNotWritable = function(offset) {
  this._offset = offset;

  // handle end()
  if (! this.writable) {
    this._maybeDestroy();
  }
};

Reader.prototype._maybeDestroy = function () {
  var that = this;
  // TODO: use `postMessage`, see breeze-nexttick
  setTimeout(function () {
    if (that.bytesAhead() === 0) {
      that.destroy();
    }
  }, 0);
};

Reader.prototype._moveOffset = function(relativeOffset) {
  this._setOffset(this._offset + relativeOffset);
  return this._offset - relativeOffset;
};
