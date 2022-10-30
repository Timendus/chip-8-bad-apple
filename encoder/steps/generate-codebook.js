const huffman = require('../lib/huffman-encoder.js');
const reduceDifference = require('../lib/reduce-difference.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    maxBits: 16,
    complete: true,
    reduceDiff: false
  }, options);

  let possibleValues = movie.filter(frame => frame[options.input])
                            .map(frame => frame[options.input]).flat();

  if ( options.reduceDiff )
    possibleValues = reduceDifference.encode(possibleValues);

  huffman.generateCodebook(possibleValues, options.maxBits, options.complete);
};
