#!/usr/bin/env node --trace-uncaught

const {
  loadImages,
  diff,
  generateCodebook,
  encode,
  wrapInSettings,
  outputData,
  generateStats
} = require('./steps');

const huffmanEncoder = require('./lib/huffman-encoder.js');
const { render } = require('./lib/helpers.js');

const MAX_SIZE = 59931;
const movie = [];

const methods = [
  ['bbox'],
  ['RLE'],
  ['globalHuffman'],
  ['bbox', 'RLE'],
  ['bbox', 'globalHuffman'],

  ['diff', 'RLE'],
  ['diff', 'bbox'],
  ['diff', 'globalHuffman'],
  ['diff', 'bbox', 'RLE'],
  ['diff', 'bbox', 'globalHuffman'],

  ['diff', 'interlacing', 'RLE'],
  ['diff', 'interlacing', 'bbox'],
  ['diff', 'interlacing', 'globalHuffman'],
  ['diff', 'interlacing', 'bbox', 'RLE'],
  ['diff', 'interlacing', 'bbox', 'globalHuffman'],
];

// Load and diff all the images
loadImages(movie, { start: 1, end: 6562 });
diff(movie, {input: 'input', diffWith: 'input', encoded: 'diff'});
generateCodebook(movie, { input: 'diff', maxBits: 16 });

// Encode the images and the diffs in all the ways defined in methods
encode(movie, { methods, render: false });

// Wrap the frames in the right settings-bytes
wrapInSettings(movie, { input: 'encoded', output: 'encoded' });

// Output the result to the Octo files
const codebook = huffmanEncoder.encodedCodebook();
outputData(movie, { codebook });

// Generate some fancy stats about the results
const statsMethods = methods.map(v => JSON.stringify(v));
statsMethods.unshift('skip');
console.log();
const stats = generateStats(movie, { methods: statsMethods, additionalSize: codebook.length, verbose: true });

console.log();
if ( stats['Chosen encodings'].size < MAX_SIZE ) console.log(`This fits in the available memory! 🎉`)
console.log("Done!");
