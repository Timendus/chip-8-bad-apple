const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    diffWith: 'input',
    output: 'output',
    result: 'result',
    diffOffset: 1
  }, options);

  // Do the requested encoding (and decoding) of all frames
  for ( const index in movie ) {
    if ( index - options.diffOffset < 0 ) continue;
    const frame = movie[index];
    frame[options.output] = frame[options.input].map((v,i) => v ^ movie[index - options.diffOffset][options.diffWith][i]);
    frame[options.result] = frame[options.output].map((v,i) => v ^ movie[index - options.diffOffset][options.diffWith][i]);
    assert(arrayDifference(frame[options.result], frame[options.input]) == 0, `Bounding box: Decoded should match input for frame ${frame.id}.\n\nGot decoded ${JSON.stringify(frame[options.result])}\n\nExpected input ${JSON.stringify(frame[options.input])}\n`);
    assert(frame[options.result].length == frame[options.input].length, `Bounding box: Output size (${frame[options.result].length}) should equal input size (${frame[options.input].length} bytes) for frame ${frame.id}`);
  }
};
