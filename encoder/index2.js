#!/usr/bin/env node

const {
  loadImages,
  diff,
  generateCodebook,
  encode,
  generateStats
} = require('./steps');

const huffmanEncoder = require('./lib/huffman-encoder.js');
const { render } = require('./lib/helpers.js');

const MAX_SIZE = 59931;
const movie = [];

const methods = [
  ['RLE'],
  ['bbox'],
  ['Huffman'],
  ['globalHuffman'],
  ['bbox', 'RLE'],
  ['bbox', 'Huffman'],
  ['bbox', 'globalHuffman'],
  ['diff', 'RLE'],
  ['diff', 'bbox'],
  ['diff', 'Huffman'],
  ['diff', 'globalHuffman'],
  ['diff', 'bbox', 'RLE'],
  ['diff', 'bbox', 'Huffman'],
  ['diff', 'bbox', 'globalHuffman'],
];

// Load and diff all the images
loadImages(movie, { start: 500, end: 600 });
diff(movie, {input: 'input', diffWith: 'input', encoded: 'diff'});
generateCodebook(movie, { input: 'diff', maxBits: 16 });

// Encode the images and the diffs in many possible ways
encode(movie, { methods, render: true });

// Show a random frame
console.log();
render(movie[Math.floor(Math.random() * movie.length)].input, 48);
console.log();

// console.log(movie);

// Generate some fancy stats about the results
const encodedCodebook = huffmanEncoder.encodedCodebook();
const stats = generateStats(movie, { methods: methods.map(v => JSON.stringify(v)), additionalSize: encodedCodebook.length, verbose: true });

console.log();
if ( stats['Chosen encodings'].size < MAX_SIZE ) console.log(`This fits in the available memory! 🎉`)
console.log("Done!");
