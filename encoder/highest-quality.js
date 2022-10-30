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

const MAX_SIZE = 59881;
const movie = [];

const methods = [
  ['RLE'],
  ['globalHuffman'],
  // ['singleBytes'],       // Need to store coordinates in more bits
  ['diff', 'RLE'],
  ['diff', 'globalHuffman'],
  // ['diff', 'singleBytes'],
];

// Load and diff all the images
loadImages(movie, { start: 0, end: 6562, step: 1, path: "frames/hires/bad_apple_{id}.png" });
diff(movie, {input: 'input', diffWith: 'input', encoded: 'diff'});
generateCodebook(movie, { input: 'diff', maxBits: 16 });
const codebook = huffmanEncoder.encodedCodebook();

// Encode the images and the diffs in all the ways defined in methods
encode(movie, { methods, render: false, width: 96, height: 64, maxSize: MAX_SIZE - codebook.length });

// Wrap the frames in the right settings-bytes
wrapInSettings(movie, { input: 'encoded', output: 'encoded' });

// Output the result to the Octo files
outputData(movie, {
  codebook,
  framesPath: "player/video/hires/frames.8o",
  codebookPath: "player/video/hires/codebook.8o"
});

// Generate some fancy stats about the results
const statsMethods = methods.map(v => JSON.stringify(v));
statsMethods.unshift('skip');
console.log();
const stats = generateStats(movie, { methods: statsMethods, additionalSize: codebook.length, verbose: true });

console.log();
if ( stats['Chosen encodings'].size < MAX_SIZE ) console.log(`This fits in the available memory! 🎉`)
console.log("Done!");
