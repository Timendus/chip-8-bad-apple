const bbox = require('../lib/bounding-box.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    output: 'output',
    result: 'result',
    width: 48,
    height: 32
  }, options);

  // Do the requested encoding (and decoding) of all frames
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;
    frame[options.output] = bbox.encode(frame[options.input], options.width);
    frame[options.result] = bbox.decode(new Array(options.width * options.height / 8), frame[options.output], options.width);
    assert(arrayDifference(frame[options.result], frame[options.input]) == 0, `Bounding box: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(frame[options.result])}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
    assert(frame[options.result].length == frame[options.input].length, `Bounding box: Output size (${frame[options.result].length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
  }
};
