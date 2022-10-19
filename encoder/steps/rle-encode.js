const rle = require('../lib/rle.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    encoded: 'encoded',
    output: 'output',
  }, options);

  // Do the requested encoding (and decoding) of all frames
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;
    frame[options.encoded] = rle.encode(frame[options.input]);
    frame[options.output] = rle.decode(frame[options.encoded]);
    assert(arrayDifference(frame[options.output], frame[options.input]) == 0, `RLE: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(frame[options.output])}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
    assert(frame[options.input].length == frame[options.output].length, `RLE: Output size (${frame[options.output].length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
  }
};
