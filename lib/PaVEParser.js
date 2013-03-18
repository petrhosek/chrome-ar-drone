PaVEParser = function() {
  this._parser = new Reader();
  this._state  = 'header';
  this._payload_size = undefined;
  this._frame_type = undefined;
  this._sourceBuffer = null;

  var video = document.querySelector('video');

  window.MediaSource = window.MediaSource || window.WebKitMediaSource;

  var source = new MediaSource();
  video.src = window.URL.createObjectURL(source);

  var that = this;
  source.addEventListener('webkitsourceopen', function(e) {
    that._sourceBuffer = source.addSourceBuffer('video/mp4; codecs=codecs="avc1.42E01E, mp4a.40.2"');
    log('source readyState: ' + this.readyState);
  }, false);

  source.addEventListener('webkitsourceended', function(e) {
    log('source readyState: ' + this.readyState);
  }, false);
}

PaVEParser.HEADER_SIZE_SHORT = 64;
PaVEParser.HEADER_SIZE_LONG = 68;

PaVEParser.prototype.parse = function(data) {
  var parser = this._parser
    , signature = undefined
    , header_size = undefined;

  parser.write(data);

  while (true) {
    switch (this._state) {
      case 'header':
        if (parser.bytesAhead() < PaVEParser.HEADER_SIZE_LONG) {
          return;
        }
        signature = parser.ascii(4);

        if (signature !== 'PaVE') {
          // TODO: wait/look for next PaVE frame
          return;
        }

        parser.skip(2);
        header_size = parser.uint16LE();

        // payload_size
        this._payload_size = parser.uint32LE();

        // skip 18 bytes::
        // encoded_stream_width 2
        // encoded_stream_height 2
        // display_width 2
        // display_height 2
        // frame_number 4
        // timestamp 4
        // total_chunks 1
        // chunk_index 1
        parser.skip(18);
        this._frame_type = parser.uint8();

        // bytes consumed so far: 4 + 2 + 2 + 4 + 18 + 1 = 31. Skip ahead.
        parser.skip(header_size - 31);

        // stupid kludge for https://projects.ardrone.org/issues/show/159
        parser.buffer(this._frame.header_size - PaVEParser.HEADER_SIZE_SHORT);

        this._state = 'payload';
        break;

      case 'payload':
        if (parser.bytesAhead() < this._payload_size) {
          return;
        }

        // also skip first NAL-Unit boundary: (4)
        parser.skip(4);
        this._payload_size -= 4;

        this.sendData(parser.buffer(this._payload_size), this._frame_type);

        this._payload_size = undefined;
        this._state = 'header';
        break;

        this._frame.payload = parser.buffer(this._frame.payload_size);

        this.emit('data', this._frame);
        this._frame = undefined;
        this._state = 'header';
        break;
    }
  }

  return true;
};

PaVEParser.prototype.append = function(data) {
  if (this._sourceBuffer) {
    this._sourceBuffer.append(new Uint8Array(data));
  }
}

PaVEParser.prototype.sendData = function (data, frametype) {
  var lastBegin = 0, i, l;
  var buffer;
  if (frametype === 1) {
    // I-Frame, split more
    // Todo: optimize.
    for (i = 0, l = data.length - 4; i < l; i++) {
      if (
          data[i] === 0 &&
          data[i + 1] === 0 &&
          data[i + 2] === 0 &&
          data[i + 3] === 1
         ) {
        if (lastBegin < i) {
          this.append(data.slice(lastBegin, i));
          lastBegin = i + 4;
          i += 4;
        }
      }
    }
    this.append(data.slice(lastBegin));
  } else {
    this.append(data);
  }
};
