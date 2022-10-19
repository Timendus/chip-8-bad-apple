const { assert } = require('./helpers.js');
const MAX_RL_SIZE = 127;

// Encode an image in my own run length encoding scheme:
//  0 + length => repeat next byte <length> times
//  1 + length => plain copy <length> bytes
// Run lengths may be no longer than MAX_RL_SIZE because of the constraints
// of the decoder.
function encode(image) {
  const segmnts = segments(image);
  const runlengths = [];
  let j = 0;

  for ( const segment of segmnts ) {
    // Runs of less than four make no sense because it costs three bytes to
    // interrupt a plain copy run, and each new run makes the decompression
    // slower. Add segments of less than 4 items to a plain copy.
    if ( segment[0] < 4 ) {
      if ( !runlengths[j] )
        runlengths[j] = [ 0 ];
      if ( runlengths[j].length > MAX_RL_SIZE - (segment[0]-1) )
        runlengths[++j] = [ 0 ];

      for(let i = segment[0]; i > 0; i--)
        runlengths[j].push(segment[1]);
    } else {
      // Longer runs will be encoded
      if ( runlengths[j] ) j++;
      let count = segment[0];
      while ( count > MAX_RL_SIZE ) {
        runlengths[j++] = [MAX_RL_SIZE, segment[1]];
        count -= MAX_RL_SIZE;
      }
      runlengths[j++] = [count, segment[1]];
    }
  }

  for ( let i = 0; i < runlengths.length; i++ ) {
    const length = runlengths[i][0] || (runlengths[i].length - 1);
    // Warn if we exceed the max run length (which should obviously never happen)
    assert(length <= MAX_RL_SIZE, `RLE: Found run that's longer than decompression can handle: ${length}`);
    // Replace zeros with the actual length and a one in the MSB
    if ( runlengths[i][0] == 0 )
      runlengths[i][0] = length | 0x80;
  }

  return runlengths.flat();
}

function segments(bytes) {
  const segments = [];
  let repetitions = 1;

  for ( let i = 0; i < bytes.length; i++ ) {
    if ( bytes[i] == bytes[i+1] )
      repetitions++;
    else {
      segments.push([repetitions, bytes[i]]);
      repetitions = 1;
    }
  }

  return segments;
}

function decode(data) {
  let i = 0;
  const output = [];
  while ( i < data.length ) {
    const byte = data[i++];
    const length = byte & 127;
    if ( byte & 128 ) {
      for ( let j = 0; j < length && i < data.length; j++ )
        output.push(data[i++]);
    } else {
      const value = data[i++];
      for ( let j = 0; j < length; j++ )
        output.push(value);
    }
  }
  return output;
}

module.exports = {
  encode, decode
}
