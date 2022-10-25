const huffman = require('../lib/huffman-encoder.js');
const {assert, arrayDifference} = require('../lib/helpers.js');

module.exports = function(movie, options) {
  // Set default options
  options = Object.assign({
    input: 'input',
    maxBits: 16,
    complete: true
  }, options);

  const possibleValues = movie.filter(frame => frame[options.input])
                              .map(frame => frame[options.input]).flat();
  huffman.generateCodebook(possibleValues, options.maxBits, options.complete);
};
