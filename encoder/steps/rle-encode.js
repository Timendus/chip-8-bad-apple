const rle = require('../lib/rle.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    output: 'output',
    result: 'result'
  }, options);

  // Do the requested encoding (and decoding) of all frames
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;
    frame[options.output] = rle.encode(frame[options.input]);
    frame[options.result] = rle.decode(frame[options.output]);
    assert(arrayDifference(frame[options.result], frame[options.input]) == 0, `RLE: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(frame[options.result])}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
    assert(frame[options.input].length == frame[options.result].length, `RLE: Output size (${frame[options.result].length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
  }
};
