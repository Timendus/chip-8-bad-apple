const { assert } = require('../lib/helpers.js');

function encode(data, width) {
  const widthInBytes = width / 8;
  const height = data.length / widthInBytes;
  const encoded = [];

  for ( let y = 0; y < height; y++ ) {
    for ( let x = 0; x < widthInBytes; x++ ) {
      const byte = data[y * widthInBytes + x];
      if ( byte != 0 ) {
        assert((x & 7) == x, `x can be encoded in 3 bits (got: ${x})`);
        assert((y & 31) == y, `y can be encoded in 5 bits (got: ${y})`);
        encoded.push((x << 5) + y);
        encoded.push(byte);
      }
    }
  }

  assert((encoded.length / 2) < 256, `Can't encode length (${encoded.length / 2}) in a single byte`);
  return [encoded.length / 2, ...encoded];
}

function decode(data, width, canvas) {
  assert(data.length % 2 == 1, 'Data should be a multiple of two bytes plus a length byte');

  for ( let i = 0; i < data[0]; i++ ) {
    const x = data[i*2+1] >> 5;
    const y = data[i*2+1] & 31;
    canvas[y * width / 8 + x] = data[i*2+2];
  }

  return canvas;
}

module.exports = {
  encode,
  decode
};
