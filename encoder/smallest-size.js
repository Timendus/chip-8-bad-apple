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

const MAX_SIZE = 59883;
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

  ['diff', 'reduce-diff', 'RLE'],
  ['diff', 'reduce-diff', 'bbox'],
  ['diff', 'reduce-diff', 'globalHuffman'],
  ['diff', 'reduce-diff', 'bbox', 'RLE'],
  ['diff', 'reduce-diff', 'bbox', 'globalHuffman'],

  ['diff', 'interlacing', 'reduce-diff', 'RLE'],
  ['diff', 'interlacing', 'reduce-diff', 'bbox'],
  ['diff', 'interlacing', 'reduce-diff', 'globalHuffman'],
  ['diff', 'interlacing', 'reduce-diff', 'bbox', 'RLE'],
  ['diff', 'interlacing', 'reduce-diff', 'bbox', 'globalHuffman'],
];

// Load and diff all the images
loadImages(movie, { start: 0, end: 6562, step: 3 });
diff(movie, {input: 'input', diffWith: 'input', encoded: 'diff'});
generateCodebook(movie, { input: 'diff', maxBits: 16, reduceDiff: true });
const codebook = huffmanEncoder.encodedCodebook();

// Encode the images and the diffs in all the ways defined in methods
encode(movie, { methods, render: false, maxSize: MAX_SIZE - codebook.length });

// Wrap the frames in the right settings-bytes
wrapInSettings(movie, { input: 'encoded', output: 'encoded' });

// Output the result to the Octo files
outputData(movie, { codebook });

// Generate some fancy stats about the results
const statsMethods = methods.map(v => JSON.stringify(v));
statsMethods.unshift('skip');
console.log();
const stats = generateStats(movie, { methods: statsMethods, additionalSize: codebook.length, verbose: true });

console.log();
if ( stats['Chosen encodings'].size < MAX_SIZE ) console.log(`This fits in the available memory! 🎉`)
console.log("Done!");
