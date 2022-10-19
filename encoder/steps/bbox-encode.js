const bbox = require('../lib/bounding-box.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    encoded: 'encoded',
    output: 'output',
    width: 48,
    height: 32
  }, options);

  // Do the requested encoding (and decoding) of all frames
  for ( const frame of movie ) {
    if ( !frame[options.input] ) continue;
    frame[options.encoded] = bbox.encode(frame[options.input], options.width);
    frame[options.output] = bbox.decode(new Array(options.width * options.height / 8), frame[options.encoded], options.width);
    assert(arrayDifference(frame[options.output], frame[options.input]) == 0, `Bounding box: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(frame[options.output])}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
    assert(frame[options.output].length == frame[options.input].length, `Bounding box: Output size (${frame[options.output].length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
  }
};
